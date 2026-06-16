"""QA Review routes — queue, diff view, approve/return (QA).

Tham chiếu: docs AC mục 8 (QA Review), Validation Rules §8 (VR-QA-*),
Screen Spec màn 3. MVP: chỉ Approve/Return (BR-8.1).
RBAC: QA, ADMIN.
API path: /api/v1/qa-reviews
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.constants import Role
from app.core.permissions import require_role

# RBAC: QA hoặc ADMIN (Screen Spec màn 3).
router = APIRouter(
    prefix="/qa-reviews",
    tags=["qa"],
    dependencies=[Depends(require_role(Role.QA, Role.ADMIN))],
)


def _todo():
    raise HTTPException(status_code=501, detail="TODO(qa_review): chưa implement (scaffold).")


@router.get("/queue")
async def qa_queue():
    """Hàng đợi task đã submit cần review."""
    return _todo()


@router.get("/{claim_id}")
async def review_detail(claim_id: str):
    """Diff view: pre-score vs annotator, highlight chênh lệch ≥0.20 (AC-8.1)."""
    return _todo()


@router.post("/{claim_id}/approve")
async def approve(claim_id: str):
    """Approve → task Approved, khóa sửa (AC-8.2). Ghi audit (BR-8.3)."""
    return _todo()


@router.post("/{claim_id}/return")
async def return_task(claim_id: str):
    """Return → bắt buộc error_category + comment ≥10 ký tự (VR-QA-002, BR-8.2)."""
    return _todo()
