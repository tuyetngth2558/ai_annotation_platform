"""Projects routes — tạo/list/get project, cấu hình LLM, gán nhân sự (ADMIN).

Tham chiếu: AC-1.1..1.4, BR-1.1..1.3, Screen Spec màn 2.1.
RBAC: chỉ ADMIN.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import Role
from app.core.pagination import PageParams, page_params
from app.core.permissions import require_role
from app.db.session import get_db
from app.features.projects import service
from app.features.projects.schemas import (
    AssignClaimsIn,
    AssignClaimsOut,
    AssignMembersIn,
    MemberOut,
    ProjectClaimsOut,
    ProjectCreate,
    ProjectDetail,
    ProjectOut,
)
from app.schemas.common import Page, PageMeta

router = APIRouter(
    prefix="/projects",
    tags=["projects"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


@router.get("", response_model=Page[ProjectOut])
async def list_projects(
    paging: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    """Danh sách project + trạng thái LLM + member_count (AC-1.4)."""
    items = await service.list_projects(db, limit=paging.limit, offset=paging.offset)
    return Page(
        items=items,
        meta=PageMeta(total=len(items), limit=paging.limit, offset=paging.offset),
    )


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
):
    """Tạo project mới + LLM config (AC-1.1, AC-1.2, BR-1.1..1.3).

    Modality luôn 'text' (BR-1.1). API key encrypt-at-rest (BR-1.2).
    Prompt phải có {{claim_text}} và {{source_context}} (BR-1.3).
    """
    return await service.create_project(db, payload)


@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Chi tiết project gồm danh sách thành viên."""
    return await service.get_project(db, project_id)


@router.post(
    "/{project_id}/assignments",
    response_model=list[MemberOut],
    status_code=status.HTTP_200_OK,
)
async def assign_members(
    project_id: uuid.UUID,
    payload: AssignMembersIn,
    db: AsyncSession = Depends(get_db),
):
    """Gán Annotator/QA vào project (AC-1.3). Upsert — safe to call nhiều lần."""
    return await service.assign_members(db, project_id, payload)


@router.get("/{project_id}/claims", response_model=ProjectClaimsOut)
async def list_project_claims(
    project_id: uuid.UUID,
    paging: PageParams = Depends(page_params),
    status: str | None = None,
    annotator_id: uuid.UUID | None = None,
    unassigned: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """Danh sách claim project (phân trang + filter status/annotator) + thống kê tiến độ."""
    return await service.list_project_claims(
        db, project_id,
        limit=paging.limit, offset=paging.offset,
        status=status, annotator_id=annotator_id, unassigned=unassigned,
    )


@router.post(
    "/{project_id}/assign-claims",
    response_model=AssignClaimsOut,
    status_code=status.HTTP_200_OK,
)
async def assign_claims(
    project_id: uuid.UUID,
    payload: AssignClaimsIn,
    db: AsyncSession = Depends(get_db),
):
    """Gán claim cho 1 annotator (bù khâu auto-assign D3). claim_ids rỗng = gán tất cả."""
    return await service.assign_claims(db, project_id, payload)


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Gỡ thành viên khỏi project (deactivate role). Trả 204."""
    await service.remove_member(db, project_id, user_id)
