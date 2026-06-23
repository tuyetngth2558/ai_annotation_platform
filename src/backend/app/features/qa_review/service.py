"""Logic nghiep vu qa_review — queue, review_detail, approve, return.

Business rules:
- BR-8.1: MVP chi Approve hoac Return, khong co dispute/direct-edit
- BR-8.2: Return bat buoc error_category + qa_comment >= 10 ky tu (VR-QA-002)
- BR-8.3: moi quyet dinh QA ghi audit_log (approve/return — cung transaction)
- AC-8.1: diff view highlight chech lech >= JUSTIFICATION_THRESHOLD
- Approve: claim.status -> "approved", khoa sua
- Return: claim.status -> "returned", annotator duoc sua lai va submit lai
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.constants import JUSTIFICATION_THRESHOLD, ClaimStatus, QaDecision, Role
from app.core.exceptions import AppError, NotFoundError
from app.core.logging import get_logger
from app.features.audit.service import write_audit_log
from app.features.qa_review.schemas import (
    ApproveIn,
    PreviousReviewOut,
    QueueItem,
    QueueOut,
    ReturnIn,
    ReviewDetailOut,
    ReviewOut,
    ScoreDiffItem,
)
from app.models.annotation_submission import AnnotationSubmission
from app.models.batch import Batch
from app.models.claim_task import ClaimTask
from app.models.llm_pre_score import LlmPreScore
from app.models.parent_task import ParentTask
from app.models.project import Project
from app.models.qa_review import QaReview
from app.models.user import UserAccount

logger = get_logger(__name__)

_ANSWER_CONTEXT_LEN = 300
_DIMENSIONS = ["sf", "sc", "hr", "sq", "rel", "comp"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _resolve_qa(user_id: str, db: AsyncSession) -> UserAccount:
    """Resolve QA theo user_id (JWT subject = str(user.id) — xem auth/service)."""
    result = await db.execute(select(UserAccount).where(UserAccount.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise AppError("QA user khong ton tai.", code="user_not_found", status_code=404)
    return user


async def _load_claim_for_qa(
    claim_id: uuid.UUID,
    db: AsyncSession,
    *,
    lock: bool = False,
) -> ClaimTask:
    """Load claim voi eager load day du cho QA view. Khong enforce ownership — QA thay tat ca."""
    stmt = (
        select(ClaimTask)
        .where(ClaimTask.id == claim_id)
        .options(
            selectinload(ClaimTask.pre_scores),
            selectinload(ClaimTask.submissions),
            selectinload(ClaimTask.qa_reviews),
            selectinload(ClaimTask.parent_task),
        )
    )
    if lock:
        stmt = stmt.with_for_update()

    result = await db.execute(stmt)
    claim = result.scalar_one_or_none()
    if claim is None:
        raise NotFoundError(f"Claim {claim_id} khong tim thay.")
    return claim


def _latest_pre_score(claim: ClaimTask) -> LlmPreScore | None:
    if not claim.pre_scores:
        return None
    return sorted(claim.pre_scores, key=lambda p: p.created_at)[-1]


def _latest_annotator_submission(claim: ClaimTask) -> AnnotationSubmission | None:
    submitted = [s for s in claim.submissions if s.status == "submitted"]
    if not submitted:
        return None
    return sorted(submitted, key=lambda s: s.submitted_at or s.created_at)[-1]


def _build_answer_context(claim: ClaimTask) -> str | None:
    parent: ParentTask | None = claim.parent_task
    if not parent or not parent.answer_text_normalized:
        return None
    text = parent.answer_text_normalized
    idx = text.find(claim.claim_text_original[:40])
    if idx == -1:
        return text[:_ANSWER_CONTEXT_LEN]
    start = max(0, idx - 100)
    end = min(len(text), idx + _ANSWER_CONTEXT_LEN)
    return text[start:end]


def _build_score_diff(
    pre: LlmPreScore | None,
    sub: AnnotationSubmission,
) -> list[ScoreDiffItem]:
    items: list[ScoreDiffItem] = []
    for dim in _DIMENSIONS:
        ann_val = float(getattr(sub, dim))
        pre_val = float(getattr(pre, dim)) if pre else None
        delta = round(ann_val - pre_val, 4) if pre_val is not None else 0.0
        items.append(ScoreDiffItem(
            dimension=dim,
            pre_score=pre_val,
            annotator_score=ann_val,
            delta=delta,
            needs_justification=(
                abs(delta) >= JUSTIFICATION_THRESHOLD if pre_val is not None else False
            ),
        ))
    return items


# ---------------------------------------------------------------------------
# Step 1: QA queue
# ---------------------------------------------------------------------------

async def qa_queue(
    qa_id: str,
    *,
    db: AsyncSession,
) -> QueueOut:
    """Lay danh sach claim da 'submitted' can review (kem project + annotator + composite)."""
    # JOIN Project (qua ParentTask→Batch) + UserAccount (annotator) de hien ro du lieu.
    annotator = aliased(UserAccount)
    stmt = (
        select(ClaimTask, Project.id, Project.project_name, annotator.email, annotator.full_name)
        .join(ParentTask, ParentTask.id == ClaimTask.parent_task_id)
        .join(Batch, Batch.id == ParentTask.batch_id)
        .join(Project, Project.id == Batch.project_id)
        .outerjoin(annotator, annotator.id == ClaimTask.assigned_annotator_id)
        .where(ClaimTask.status == ClaimStatus.SUBMITTED)
        .options(selectinload(ClaimTask.parent_task), selectinload(ClaimTask.submissions))
        .order_by(ClaimTask.submitted_at.asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    items = []
    for c, project_id, project_name, ann_email, ann_name in rows:
        sub = _latest_annotator_submission(c)
        composite = float(sub.composite_score) if sub and sub.composite_score is not None else None
        items.append(
            QueueItem(
                claim_id=c.id,
                claim_order=c.claim_order,
                claim_text=c.claim_text_original,
                section_name=c.section_name,
                parent_task_id=c.parent_task_id,
                article_code=c.parent_task.article_code if c.parent_task else None,
                title=c.parent_task.title if c.parent_task else None,
                submitted_at=c.submitted_at,
                annotator_id=c.assigned_annotator_id,
                annotator_email=ann_email,
                annotator_name=ann_name,
                project_id=project_id,
                project_name=project_name,
                composite_annotator=composite,
            )
        )
    return QueueOut(items=items, total=len(items))


# ---------------------------------------------------------------------------
# Step 2: review detail (diff view)
# ---------------------------------------------------------------------------

async def review_detail(
    claim_id: uuid.UUID,
    qa_id: str,
    *,
    db: AsyncSession,
) -> ReviewDetailOut:
    """Diff view: pre-score vs annotator score, lich su review truoc."""
    claim = await _load_claim_for_qa(claim_id, db)

    if claim.status not in (ClaimStatus.SUBMITTED, ClaimStatus.RETURNED, ClaimStatus.APPROVED):
        raise AppError(
            f"Claim chua o trang thai co the review (status={claim.status}).",
            code="claim_not_reviewable",
        )

    pre = _latest_pre_score(claim)
    sub = _latest_annotator_submission(claim)

    if sub is None:
        raise AppError("Claim chua co annotation submission.", code="no_submission")

    score_diff = _build_score_diff(pre, sub)
    composite_pre = float(pre.composite_score) if pre and pre.composite_score else None
    composite_ann = float(sub.composite_score) if sub.composite_score else None

    previous = [
        PreviousReviewOut(
            qa_review_id=r.id,
            decision=r.decision,
            error_category=r.error_category,
            qa_comment=r.qa_comment,
            reviewed_at=r.reviewed_at,
            qa_id=r.qa_id,
        )
        for r in sorted(claim.qa_reviews, key=lambda r: r.created_at)
    ]

    # Tên dự án (qua ParentTask→Batch→Project) + email annotator để hiện trên header.
    project_name = await db.scalar(
        select(Project.project_name)
        .join(Batch, Batch.project_id == Project.id)
        .where(Batch.id == claim.parent_task.batch_id)
    ) if claim.parent_task else None
    annotator_email = await db.scalar(
        select(UserAccount.email).where(UserAccount.id == claim.assigned_annotator_id)
    ) if claim.assigned_annotator_id else None

    return ReviewDetailOut(
        claim_id=claim.id,
        claim_order=claim.claim_order,
        claim_text=claim.claim_text_original,
        section_name=claim.section_name,
        citation_markers=claim.citation_markers,
        article_code=claim.parent_task.article_code if claim.parent_task else None,
        title=claim.parent_task.title if claim.parent_task else None,
        project_name=project_name,
        submitted_at=claim.submitted_at,
        annotator_email=annotator_email,
        answer_context=_build_answer_context(claim),
        score_diff=score_diff,
        composite_pre=composite_pre,
        composite_annotator=composite_ann,
        source_access_status=sub.source_access_status,
        annotator_note=sub.annotator_note,
        justifications=sub.justifications_json,
        previous_reviews=previous,
    )


# ---------------------------------------------------------------------------
# Step 3: approve
# ---------------------------------------------------------------------------

async def approve(
    claim_id: uuid.UUID,
    payload: ApproveIn,
    qa_id: str,
    *,
    db: AsyncSession,
    user_role: Role | None = None,
    client_ip: str | None = None,
) -> ReviewOut:
    """Approve: claim.status -> approved, khoa sua (AC-8.2, BR-8.3)."""
    qa = await _resolve_qa(qa_id, db)
    claim = await _load_claim_for_qa(claim_id, db, lock=True)

    if claim.status != ClaimStatus.SUBMITTED:
        raise AppError(
            f"Chi approve duoc claim o trang thai 'submitted' (hien tai: {claim.status}).",
            code="invalid_claim_status",
        )

    now = datetime.now(UTC)
    review = QaReview(
        claim_id=claim.id,
        qa_id=qa.id,
        decision=QaDecision.APPROVED,
        error_category=None,
        qa_comment=payload.qa_comment,
        reviewed_at=now,
    )
    db.add(review)

    claim.status = ClaimStatus.APPROVED
    claim.approved_at = now

    # Audit (BR-8.3) — cùng transaction với approve (AC-10.1): cả hai cùng commit.
    await write_audit_log(
        db,
        action_type="approve",
        entity_type="claim_task",
        entity_id=claim.id,
        user_id=qa.id,
        user_role=user_role,
        description=f"QA approve claim {claim.id}",
        client_ip=client_ip,
    )

    await db.commit()
    logger.info("approve: claim_id=%s qa=%s", claim_id, qa_id)

    return ReviewOut(
        qa_review_id=review.id,
        claim_id=claim.id,
        decision=QaDecision.APPROVED,
        error_category=None,
        qa_comment=payload.qa_comment,
        reviewed_at=now,
    )


# ---------------------------------------------------------------------------
# Step 4: return
# ---------------------------------------------------------------------------

async def return_task(
    claim_id: uuid.UUID,
    payload: ReturnIn,
    qa_id: str,
    *,
    db: AsyncSession,
    user_role: Role | None = None,
    client_ip: str | None = None,
) -> ReviewOut:
    """Return: bat buoc error_category + comment >= 10 ky tu (BR-8.2, VR-QA-002)."""
    qa = await _resolve_qa(qa_id, db)
    claim = await _load_claim_for_qa(claim_id, db, lock=True)

    if claim.status != ClaimStatus.SUBMITTED:
        raise AppError(
            f"Chi return duoc claim o trang thai 'submitted' (hien tai: {claim.status}).",
            code="invalid_claim_status",
        )

    now = datetime.now(UTC)
    review = QaReview(
        claim_id=claim.id,
        qa_id=qa.id,
        decision=QaDecision.RETURNED,
        error_category=payload.error_category,
        qa_comment=payload.qa_comment,
        reviewed_at=now,
    )
    db.add(review)

    # Tra ve RETURNED: annotator duoc sua lai va submit lai
    claim.status = ClaimStatus.RETURNED

    # Audit (BR-8.3) — cùng transaction với return (AC-10.1).
    await write_audit_log(
        db,
        action_type="return",
        entity_type="claim_task",
        entity_id=claim.id,
        user_id=qa.id,
        user_role=user_role,
        description=f"QA return claim {claim.id} (ly do: {payload.error_category})",
        reason=payload.qa_comment,
        client_ip=client_ip,
    )

    await db.commit()
    logger.info(
        "return_task: claim_id=%s qa=%s reason=%s",
        claim_id,
        qa_id,
        payload.error_category,
    )

    return ReviewOut(
        qa_review_id=review.id,
        claim_id=claim.id,
        decision=QaDecision.RETURNED,
        error_category=payload.error_category,
        qa_comment=payload.qa_comment,
        reviewed_at=now,
    )
