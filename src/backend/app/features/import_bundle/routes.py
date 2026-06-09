"""Import Bundle routes — upload PDF bundle, validate, preview, confirm (ADMIN).

Tham chiếu: Import schema §2 (PDF bundle), Validation Rules §1 (VR-UP-*),
Screen Spec màn 1.2. RBAC: chỉ ADMIN.
API path: /api/v1/import-bundles
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.constants import Role
from app.core.permissions import require_role

# RBAC: chỉ ADMIN (AC mục 1).
router = APIRouter(
    prefix="/import-bundles",
    tags=["import"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


def _todo():
    raise HTTPException(status_code=501, detail="TODO(import_bundle): chưa implement (scaffold).")


@router.post("/validate")
async def validate_bundle():
    """Validate bundle: đủ answer/ref/content PDF, PDF hợp lệ, size (VR-UP-001..008)."""
    return _todo()


@router.post("/preview")
async def preview_parse():
    """Parse preview: metadata, source list, warnings (Screen Spec parse preview)."""
    return _todo()


@router.post("/confirm")
async def confirm_import():
    """Confirm: tạo batch + bundle + parent_task, enqueue process_bundle (background)."""
    # TODO(import_bundle): await redis.enqueue_job("process_bundle", str(bundle_id))
    return _todo()
