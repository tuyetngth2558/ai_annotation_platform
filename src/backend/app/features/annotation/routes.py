"""Annotation routes — My Tasks, mở claim, auto-save, submit (ANNOTATOR).

Tham chiếu: docs AC mục 6/7 (Annotation Workspace, Structured Evaluation),
Validation Rules §7 (VR-ANN-*), Screen Spec màn 2.
RBAC: ANNOTATOR (chỉ task được giao — OQ-008).
API path: /api/v1/tasks
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.constants import Role
from app.core.permissions import require_role

# RBAC: ANNOTATOR (chỉ task được giao — OQ-008).
router = APIRouter(
    prefix="/tasks",
    tags=["annotation"],
    dependencies=[Depends(require_role(Role.ANNOTATOR))],
)


def _todo():
    raise HTTPException(status_code=501, detail="TODO(annotation): chưa implement (scaffold).")


@router.get("")
async def my_tasks():
    """Danh sách claim task được giao cho annotator hiện tại (OQ-008)."""
    return _todo()


@router.get("/{claim_id}")
async def get_task(claim_id: str):
    """Chi tiết claim: answer context, claim, pre-score, source list (AC-6.1)."""
    return _todo()


@router.put("/{claim_id}/autosave")
async def autosave(claim_id: str):
    """Auto-save bản nháp (BR-6.1: mỗi 30s hoặc blur)."""
    return _todo()


@router.post("/{claim_id}/submit")
async def submit(claim_id: str):
    """Submit: validate đủ 6 chiều, source status, reason nếu lệch ngưỡng (BR-6.2/7.3)."""
    return _todo()
