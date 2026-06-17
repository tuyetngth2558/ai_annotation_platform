"""Audit Log routes — xem nhật ký (ADMIN).

Tham chiếu: docs AC mục 10 (Audit Log). Bảng INSERT-only (BR-10.1).
RBAC: chỉ ADMIN (AC-10.2).
API path: /api/v1/audit-logs
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import Role
from app.core.pagination import PageParams, page_params
from app.core.permissions import require_role
from app.db.session import get_db
from app.features.audit import service
from app.features.audit.schemas import AuditLogPage

# RBAC: chỉ ADMIN (AC-10.2).
router = APIRouter(
    prefix="/audit-logs",
    tags=["audit"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


@router.get("", response_model=AuditLogPage)
async def list_audit_logs(
    page: PageParams = Depends(page_params),
    action_type: str | None = None,
    entity_type: str | None = None,
    project_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
) -> AuditLogPage:
    """Danh sách audit log (mới nhất trước), phân trang + filter optional (chỉ ADMIN)."""
    return await service.list_audit_logs(
        db,
        page,
        action_type=action_type,
        entity_type=entity_type,
        project_id=project_id,
    )
