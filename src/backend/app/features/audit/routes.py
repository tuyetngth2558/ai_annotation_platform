"""Audit Log routes — xem nhật ký (ADMIN).

Tham chiếu: docs AC mục 10 (Audit Log). Bảng INSERT-only (BR-10.1).
RBAC: chỉ ADMIN (AC-10.2).
API path: /api/v1/audit-logs
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.constants import Role
from app.core.permissions import require_role

# RBAC: chỉ ADMIN (AC-10.2).
router = APIRouter(
    prefix="/audit-logs",
    tags=["audit"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


def _todo():
    raise HTTPException(status_code=501, detail="TODO(audit): chưa implement (scaffold).")


@router.get("")
async def list_audit_logs():
    """Danh sách audit log có phân trang (chỉ ADMIN)."""
    return _todo()
