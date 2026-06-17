"""QA Review routes -- queue, diff view, approve/return (QA, ADMIN).

Tham chieu: docs AC muc 8 (QA Review), Validation Rules §8 (VR-QA-*),
Screen Spec man 3. MVP: chi Approve/Return (BR-8.1).
RBAC: QA, ADMIN.
API path: /api/v1/qa-reviews
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import Role
from app.core.permissions import require_role
from app.core.request_meta import get_client_ip
from app.db.session import get_db
from app.features.auth.deps import CurrentUser, get_current_user
from app.features.qa_review import service
from app.features.qa_review.schemas import (
    ApproveIn,
    QueueOut,
    ReturnIn,
    ReviewDetailOut,
    ReviewOut,
)

router = APIRouter(
    prefix="/qa-reviews",
    tags=["qa"],
    dependencies=[Depends(require_role(Role.QA, Role.ADMIN))],
)


@router.get("/queue", response_model=QueueOut)
async def qa_queue(
    current_user: Annotated[CurrentUser, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db),
) -> QueueOut:
    """Hang doi claim da 'submitted' can QA review."""
    return await service.qa_queue(current_user.subject, db=db)


@router.get("/{claim_id}", response_model=ReviewDetailOut)
async def review_detail(
    claim_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db),
) -> ReviewDetailOut:
    """Diff view: pre-score vs annotator, highlight chech lech >=0.20 (AC-8.1)."""
    return await service.review_detail(claim_id, current_user.subject, db=db)


@router.post("/{claim_id}/approve", response_model=ReviewOut, status_code=200)
async def approve(
    claim_id: uuid.UUID,
    payload: ApproveIn,
    request: Request,
    current_user: Annotated[CurrentUser, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db),
) -> ReviewOut:
    """Approve: claim -> approved, khoa sua (AC-8.2, BR-8.3)."""
    return await service.approve(
        claim_id,
        payload,
        current_user.subject,
        db=db,
        user_role=current_user.role,
        client_ip=get_client_ip(request),
    )


@router.post("/{claim_id}/return", response_model=ReviewOut, status_code=200)
async def return_task(
    claim_id: uuid.UUID,
    payload: ReturnIn,
    request: Request,
    current_user: Annotated[CurrentUser, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db),
) -> ReviewOut:
    """Return: bat buoc error_category + comment >=10 ky tu (VR-QA-002, BR-8.2)."""
    return await service.return_task(
        claim_id,
        payload,
        current_user.subject,
        db=db,
        user_role=current_user.role,
        client_ip=get_client_ip(request),
    )
