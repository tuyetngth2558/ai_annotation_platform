"""Export routes — tạo export job, download CSV claim-level (ADMIN).

Tham chiếu: docs AC mục 9 (Export), Import schema §10 (cột CSV),
Validation Rules §9 (VR-EXP-*). Chỉ export Approved (BR-9.1), trace bundle/PDF (DRD-005).
RBAC: ADMIN (AC-9.1).
API path: /api/v1/exports
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.constants import Role
from app.core.permissions import require_role

# RBAC: chỉ ADMIN (AC-9.1).
router = APIRouter(
    prefix="/exports",
    tags=["export"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


def _todo():
    raise HTTPException(status_code=501, detail="TODO(export): chưa implement (scaffold).")


@router.post("")
async def create_export():
    """Tạo export job (enqueue build_export). Chỉ claim Approved."""
    return _todo()


@router.get("/{export_id}/download")
async def download_export(export_id: str):
    """Tải file CSV (UTF-8, quoting chuẩn — BR-9.2)."""
    return _todo()
