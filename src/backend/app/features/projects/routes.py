"""Projects routes — tạo/list project, cấu hình LLM, gán nhân sự (ADMIN).

Tham chiếu: docs AC mục 1 (Project Setup), Screen Spec màn 1.
RBAC: chỉ ADMIN.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.constants import Role
from app.core.permissions import require_role

# RBAC: toàn bộ route projects chỉ ADMIN (AC mục 1). Gắn ở router để không bỏ sót route.
router = APIRouter(
    prefix="/projects",
    tags=["projects"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


@router.get("")
async def list_projects():
    """Danh sách project + trạng thái cấu hình LLM (AC-1.4)."""
    return _todo()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project():
    """Tạo project (modality khóa 'text' — BR-1.1). Cấu hình LLM endpoint/key/model/prompt (AC-1.2).

    Lưu ý: API key phải encrypt-at-rest (BR-1.2). Prompt phải có {{claim_text}}
    {{source_context}} (BR-1.3).
    """
    return _todo()


@router.post("/{project_id}/assignments")
async def assign_members(project_id: str):
    """Gán Annotator/QA vào project (AC-1.3)."""
    return _todo()


def _todo():
    from fastapi import HTTPException

    raise HTTPException(status_code=501, detail="TODO(projects): chưa implement (scaffold).")
