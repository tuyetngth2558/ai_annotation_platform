"""Audit Log service — ghi log (INSERT-only) + đọc danh sách (ADMIN).

BR-10.1: bảng audit_log INSERT-only (enforce bằng trigger ở DB, migration a1b2c3d4e5f6).
BR-10.2: mỗi dòng ghi đủ user_id, user_role, action_type, target_object_id, description,
client_ip, created_at.

`write_audit_log` KHÔNG tự commit — ghi trong cùng transaction với hành động nghiệp vụ
(approve/submit/import/...) để hoặc cả hai thành công, hoặc cả hai rollback (AC-10.1).
Caller chịu trách nhiệm commit.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import Role
from app.core.logging import get_logger
from app.core.pagination import PageParams
from app.features.audit.schemas import AuditLogOut, AuditLogPage
from app.models.audit_log import AuditLog
from app.models.user import UserAccount

logger = get_logger(__name__)


async def resolve_user_id(subject: str | None, db: AsyncSession) -> uuid.UUID | None:
    """JWT subject (= str(user.id)) → user_id đã verify. None nếu không có (không chặn ghi log)."""
    if not subject:
        return None
    result = await db.execute(select(UserAccount).where(UserAccount.id == subject))
    user = result.scalar_one_or_none()
    return user.id if user else None


async def write_audit_log(
    db: AsyncSession,
    *,
    action_type: str,
    entity_type: str,
    entity_id: uuid.UUID | None = None,
    project_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    user_role: Role | str | None = None,
    description: str | None = None,
    reason: str | None = None,
    before_value: dict | None = None,
    after_value: dict | None = None,
    client_ip: str | None = None,
) -> AuditLog:
    """Thêm 1 dòng audit_log vào session (KHÔNG commit — caller commit chung transaction)."""
    role_str = user_role.value if isinstance(user_role, Role) else user_role
    entry = AuditLog(
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        project_id=project_id,
        user_id=user_id,
        user_role=role_str,
        description=description,
        reason=reason,
        before_value=before_value,
        after_value=after_value,
        client_ip=client_ip,
    )
    db.add(entry)
    return entry


async def list_audit_logs(
    db: AsyncSession,
    page: PageParams,
    *,
    action_type: str | None = None,
    entity_type: str | None = None,
    project_id: uuid.UUID | None = None,
) -> AuditLogPage:
    """Danh sách audit log mới nhất trước, có phân trang + filter (chỉ ADMIN gọi)."""
    filters = []
    if action_type:
        filters.append(AuditLog.action_type == action_type)
    if entity_type:
        filters.append(AuditLog.entity_type == entity_type)
    if project_id:
        filters.append(AuditLog.project_id == project_id)

    total = await db.scalar(
        select(func.count()).select_from(AuditLog).where(*filters)
    )
    # LEFT JOIN UserAccount để hiện rõ người thực hiện (email + tên) thay vì chỉ UUID.
    result = await db.execute(
        select(AuditLog, UserAccount.email, UserAccount.full_name)
        .outerjoin(UserAccount, UserAccount.id == AuditLog.user_id)
        .where(*filters)
        .order_by(AuditLog.timestamp.desc())
        .limit(page.limit)
        .offset(page.offset)
    )
    items = []
    for row, email, full_name in result.all():
        out = AuditLogOut.model_validate(row)
        out.user_email = email
        out.user_name = full_name
        items.append(out)
    return AuditLogPage(items=items, total=total or 0, limit=page.limit, offset=page.offset)
