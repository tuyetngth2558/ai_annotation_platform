"""Annotation routes — My Tasks, mở claim, auto-save, submit (ANNOTATOR).

Tham chiếu: docs AC mục 6/7 (Annotation Workspace, Structured Evaluation),
Validation Rules §7 (VR-ANN-*), Screen Spec man 2.
RBAC: ANNOTATOR (chi task duoc giao -- OQ-008).
API path: /api/v1/tasks
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import Role
from app.core.permissions import require_role
from app.core.request_meta import get_client_ip
from app.db.session import get_db
from app.features.annotation import service
from app.features.annotation.schemas import (
    AutosaveIn,
    AutosaveOut,
    SubmitIn,
    SubmitOut,
    TaskDetailOut,
    TaskListOut,
)
from app.features.auth.deps import CurrentUser, get_current_user

router = APIRouter(
    prefix="/tasks",
    tags=["annotation"],
    dependencies=[Depends(require_role(Role.ANNOTATOR))],
)


@router.get("", response_model=TaskListOut)
async def my_tasks(
    status: str | None = Query(default=None, description="Filter theo status claim"),
    current_user: Annotated[CurrentUser, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db),
) -> TaskListOut:
    """Danh sach claim task duoc giao cho annotator hien tai (OQ-008)."""
    return await service.list_my_tasks(
        current_user.subject,
        status_filter=status,
        db=db,
    )


@router.get("/{claim_id}", response_model=TaskDetailOut)
async def get_task(
    claim_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db),
) -> TaskDetailOut:
    """Chi tiet claim: answer context, claim text, pre-score, source list (AC-6.1)."""
    return await service.get_task(claim_id, current_user.subject, db=db)


@router.put("/{claim_id}/autosave", response_model=AutosaveOut)
async def autosave(
    claim_id: uuid.UUID,
    payload: AutosaveIn,
    current_user: Annotated[CurrentUser, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db),
) -> AutosaveOut:
    """Auto-save ban nhap (BR-6.1: moi 30s hoac blur)."""
    return await service.autosave(claim_id, payload, current_user.subject, db=db)


@router.post("/{claim_id}/submit", response_model=SubmitOut, status_code=200)
async def submit(
    claim_id: uuid.UUID,
    payload: SubmitIn,
    request: Request,
    current_user: Annotated[CurrentUser, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db),
) -> SubmitOut:
    """Submit chinh thuc: validate du 6 chieu + justification neu lech nguong (BR-6.2/7.3)."""
    return await service.submit(
        claim_id,
        payload,
        current_user.subject,
        db=db,
        user_role=current_user.role,
        client_ip=get_client_ip(request),
    )
