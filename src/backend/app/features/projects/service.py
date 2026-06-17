"""Logic nghiệp vụ cho Projects (AC-1.1..1.4, BR-1.1..1.3)."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.crypto import decrypt_secret, encrypt_secret, mask_secret
from app.core.exceptions import AppError, NotFoundError
from app.core.logging import get_logger
from app.features.projects.schemas import (
    AssignClaimsIn,
    AssignClaimsOut,
    AssignMembersIn,
    LlmConfigStatus,
    MemberOut,
    ProjectClaimOut,
    ProjectClaimsOut,
    ProjectCreate,
    ProjectDetail,
    ProjectOut,
)
from app.models.batch import Batch
from app.models.claim_task import ClaimTask
from app.models.parent_task import ParentTask
from app.models.project import Project
from app.models.user import UserAccount
from app.models.user_project_role import UserProjectRole

logger = get_logger(__name__)


def _llm_status(project: Project) -> LlmConfigStatus:
    """Tạo LlmConfigStatus từ model — API key luôn mask (BR-1.2)."""
    is_configured = bool(
        project.llm_endpoint and project.llm_api_key_enc and project.llm_model
    )
    return LlmConfigStatus(
        endpoint=project.llm_endpoint,
        api_key_masked=mask_secret(project.llm_api_key_enc or ""),
        model=project.llm_model,
        is_configured=is_configured,
    )


async def create_project(db: AsyncSession, payload: ProjectCreate) -> ProjectOut:
    """Tạo project mới + LLM config (AC-1.1/1.2, BR-1.1/1.2/1.3).

    Modality luôn 'text' (BR-1.1) — không nhận từ client.
    API key được encrypt Fernet trước khi lưu (BR-1.2).
    Prompt validate {{claim_text}} + {{source_context}} ở schema (BR-1.3).
    """
    # project_code unique
    dup = await db.execute(
        select(Project.id).where(Project.project_code == payload.project_code)
    )
    if dup.scalar_one_or_none() is not None:
        raise AppError("project_code đã tồn tại.", code="duplicate_code", status_code=409)

    # Validate deadline >= hôm nay nếu có
    if payload.deadline and payload.deadline < date.today():
        raise AppError("Deadline phải >= ngày hôm nay.", code="invalid_deadline", status_code=422)

    cfg = payload.llm_config
    project = Project(
        project_code=payload.project_code,
        project_name=payload.project_name,
        description=payload.description,
        modality="text",  # BR-1.1: luôn 'text' ở MVP
        status="active",
        deadline=payload.deadline,
        llm_endpoint=cfg.endpoint,
        llm_api_key_enc=encrypt_secret(cfg.api_key),  # BR-1.2
        llm_model=cfg.model,
        llm_prompt_template=cfg.prompt_template,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    logger.info("Project tao thanh cong: %s (%s)", project.project_code, project.id)

    return ProjectOut(
        id=project.id,
        project_code=project.project_code,
        project_name=project.project_name,
        description=project.description,
        modality=project.modality,
        status=project.status,
        deadline=project.deadline,
        created_at=project.created_at,
        llm_config=_llm_status(project),
        member_count=0,
    )


async def list_projects(db: AsyncSession, limit: int, offset: int) -> list[ProjectOut]:
    """Danh sách project + member_count + trạng thái LLM (AC-1.4)."""
    # Subquery đếm thành viên active per project
    member_count_sq = (
        select(
            UserProjectRole.project_id,
            func.count(UserProjectRole.id).label("cnt"),
        )
        .where(UserProjectRole.is_active == True)  # noqa: E712
        .group_by(UserProjectRole.project_id)
        .subquery()
    )

    rows = await db.execute(
        select(Project, func.coalesce(member_count_sq.c.cnt, 0).label("member_count"))
        .outerjoin(member_count_sq, Project.id == member_count_sq.c.project_id)
        .order_by(Project.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    result = []
    for project, cnt in rows:
        result.append(
            ProjectOut(
                id=project.id,
                project_code=project.project_code,
                project_name=project.project_name,
                description=project.description,
                modality=project.modality,
                status=project.status,
                deadline=project.deadline,
                created_at=project.created_at,
                llm_config=_llm_status(project),
                member_count=cnt,
            )
        )
    return result


async def get_project(db: AsyncSession, project_id: uuid.UUID) -> ProjectDetail:
    """Chi tiết project gồm danh sách thành viên (AC-1.3, AC-1.4)."""
    res = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .options(
            selectinload(Project.roles).selectinload(UserProjectRole.user)
        )
    )
    project = res.scalar_one_or_none()
    if project is None:
        raise NotFoundError("Không tìm thấy project.")

    members = [
        MemberOut(
            user_id=r.user_id,
            full_name=r.user.full_name,
            email=r.user.email,
            role=r.role,
            is_active=r.is_active,
        )
        for r in project.roles
    ]

    return ProjectDetail(
        id=project.id,
        project_code=project.project_code,
        project_name=project.project_name,
        description=project.description,
        modality=project.modality,
        status=project.status,
        deadline=project.deadline,
        created_at=project.created_at,
        llm_config=_llm_status(project),
        member_count=len([m for m in members if m.is_active]),
        members=members,
    )


async def assign_members(
    db: AsyncSession, project_id: uuid.UUID, payload: AssignMembersIn
) -> list[MemberOut]:
    """Gán/cập nhật danh sách Annotator/QA vào project (AC-1.3).

    Upsert: nếu user đã có role trong project thì cập nhật is_active=True + role.
    Không xóa role cũ — dùng is_active=False để deactivate nếu cần.
    """
    # Kiểm tra project tồn tại
    proj = await db.execute(select(Project.id).where(Project.id == project_id))
    if proj.scalar_one_or_none() is None:
        raise NotFoundError("Không tìm thấy project.")

    # Lấy user_ids từ payload, kiểm tra tất cả tồn tại
    user_ids = [m.user_id for m in payload.members]
    existing_users = await db.execute(
        select(UserAccount.id, UserAccount.full_name, UserAccount.email).where(
            UserAccount.id.in_(user_ids)
        )
    )
    user_map = {row.id: row for row in existing_users}
    missing = [uid for uid in user_ids if uid not in user_map]
    if missing:
        raise NotFoundError(f"Không tìm thấy user: {[str(u) for u in missing]}")

    # Lấy các role hiện có trong project
    existing_roles = await db.execute(
        select(UserProjectRole).where(
            UserProjectRole.project_id == project_id,
            UserProjectRole.user_id.in_(user_ids),
        )
    )
    role_map: dict[tuple[uuid.UUID, str], UserProjectRole] = {
        (r.user_id, r.role): r for r in existing_roles.scalars()
    }

    out: list[MemberOut] = []
    for member in payload.members:
        key = (member.user_id, member.role.value)
        if key in role_map:
            # Reactivate nếu đã tồn tại nhưng bị deactivate
            role_map[key].is_active = True
        else:
            new_role = UserProjectRole(
                user_id=member.user_id,
                project_id=project_id,
                role=member.role.value,
                is_active=True,
            )
            db.add(new_role)

        user = user_map[member.user_id]
        out.append(
            MemberOut(
                user_id=member.user_id,
                full_name=user.full_name,
                email=user.email,
                role=member.role.value,
                is_active=True,
            )
        )

    await db.commit()
    logger.info(
        "Gan %d thanh vien vao project %s", len(payload.members), project_id
    )
    return out


def get_decrypted_llm_config(project: Project) -> dict:
    """Trả LLM config plain text để gọi API (chỉ dùng nội bộ ở service layer).

    Không trả ra ngoài API response — chỉ dùng khi cần gọi LLM.
    """
    if not project.llm_api_key_enc:
        raise AppError("Project chưa có LLM API key.", code="llm_not_configured", status_code=422)
    return {
        "endpoint": project.llm_endpoint,
        "api_key": decrypt_secret(project.llm_api_key_enc),
        "model": project.llm_model,
        "prompt_template": project.llm_prompt_template,
    }


async def _ensure_project(db: AsyncSession, project_id: uuid.UUID) -> Project:
    res = await db.execute(select(Project).where(Project.id == project_id))
    project = res.scalar_one_or_none()
    if project is None:
        raise NotFoundError("Không tìm thấy project.")
    return project


async def list_project_claims(
    db: AsyncSession, project_id: uuid.UUID
) -> ProjectClaimsOut:
    """Danh sách claim của project (qua Batch.project_id) + email annotator được gán.

    Dùng cho trang chi tiết project (xem claim + gán người). Chỉ ADMIN.
    """
    await _ensure_project(db, project_id)

    rows = await db.execute(
        select(ClaimTask, ParentTask.article_code, ParentTask.title, UserAccount.email)
        .join(ParentTask, ClaimTask.parent_task_id == ParentTask.id)
        .join(Batch, ParentTask.batch_id == Batch.id)
        .outerjoin(UserAccount, ClaimTask.assigned_annotator_id == UserAccount.id)
        .where(Batch.project_id == project_id)
        .order_by(ParentTask.article_code, ClaimTask.claim_order)
    )
    items: list[ProjectClaimOut] = []
    for claim, article_code, title, email in rows.all():
        items.append(
            ProjectClaimOut(
                claim_id=claim.id,
                claim_order=claim.claim_order,
                section_name=claim.section_name,
                claim_text=claim.claim_text_final or claim.claim_text_original,
                status=claim.status,
                article_code=article_code,
                title=title,
                assigned_annotator_id=claim.assigned_annotator_id,
                assigned_annotator_email=email,
            )
        )
    return ProjectClaimsOut(items=items, total=len(items))


async def assign_claims(
    db: AsyncSession, project_id: uuid.UUID, payload: AssignClaimsIn
) -> AssignClaimsOut:
    """Gán claim cho 1 annotator (ADMIN). claim_ids rỗng = gán toàn bộ claim project.

    Annotator phải có role ANNOTATOR trong project (BR-RBAC). Bù khâu D3 (auto-assign).
    """
    await _ensure_project(db, project_id)

    # Annotator tồn tại + có role ANNOTATOR trong project này.
    res = await db.execute(select(UserAccount).where(UserAccount.id == payload.annotator_id))
    annotator = res.scalar_one_or_none()
    if annotator is None:
        raise NotFoundError("Không tìm thấy annotator.")
    role_check = await db.execute(
        select(UserProjectRole.id).where(
            UserProjectRole.user_id == payload.annotator_id,
            UserProjectRole.project_id == project_id,
            UserProjectRole.role == "ANNOTATOR",
        )
    )
    if role_check.scalar_one_or_none() is None:
        raise AppError(
            "Annotator chưa được gán vào project này (role ANNOTATOR).",
            code="annotator_not_in_project",
            status_code=422,
        )

    # Tập claim hợp lệ thuộc project.
    claim_q = (
        select(ClaimTask.id)
        .join(ParentTask, ClaimTask.parent_task_id == ParentTask.id)
        .join(Batch, ParentTask.batch_id == Batch.id)
        .where(Batch.project_id == project_id)
    )
    if payload.claim_ids:
        claim_q = claim_q.where(ClaimTask.id.in_(payload.claim_ids))
    valid_ids = [row[0] for row in (await db.execute(claim_q)).all()]
    if not valid_ids:
        return AssignClaimsOut(assigned_count=0, annotator_id=payload.annotator_id)

    await db.execute(
        update(ClaimTask)
        .where(ClaimTask.id.in_(valid_ids))
        .values(assigned_annotator_id=payload.annotator_id)
    )
    await db.commit()
    return AssignClaimsOut(assigned_count=len(valid_ids), annotator_id=payload.annotator_id)
