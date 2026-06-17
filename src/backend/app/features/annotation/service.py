"""Logic nghiệp vụ annotation — my_tasks, get_task, autosave, submit.

Business rules:
- BR-6.1: auto-save mỗi 30s (client trigger, server nhận PUT /autosave)
- BR-6.2: submit validate đủ 6 chiều + source_access_status
- BR-7.2: composite_score = trung bình đều 6 chiều (tính server-side)
- BR-7.3: lệch pre-score >= JUSTIFICATION_THRESHOLD -> bắt buộc justification
- OQ-008: annotator chỉ thấy task được giao cho mình (assigned_annotator_id)
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants import ClaimStatus, Role
from app.core.exceptions import AppError, NotFoundError, PermissionDeniedError
from app.core.logging import get_logger
from app.features.annotation.schemas import (
    AutosaveIn,
    AutosaveOut,
    DraftOut,
    JustificationBlock,
    PreScoreOut,
    ScoreBlock,
    SourceRefOut,
    SubmitIn,
    SubmitOut,
    TaskDetailOut,
    TaskListItem,
    TaskListOut,
)
from app.features.annotation.scoring import composite_score, needs_justification
from app.features.audit.service import write_audit_log
from app.models.annotation_submission import AnnotationSubmission
from app.models.claim_source_map import ClaimSourceMap
from app.models.claim_task import ClaimTask
from app.models.llm_pre_score import LlmPreScore
from app.models.parent_task import ParentTask
from app.models.user import UserAccount

logger = get_logger(__name__)

# Độ dài context answer trả về cùng task detail
_ANSWER_CONTEXT_LEN = 300


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _resolve_annotator(user_id: str, db: AsyncSession) -> UserAccount:
    """Resolve annotator theo user_id (JWT subject = str(user.id) — xem auth/service)."""
    result = await db.execute(select(UserAccount).where(UserAccount.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise AppError("Annotator không tồn tại.", code="user_not_found", status_code=404)
    return user


async def _load_claim(
    claim_id: uuid.UUID,
    annotator_id: uuid.UUID,
    db: AsyncSession,
    *,
    lock: bool = False,
) -> ClaimTask:
    """Load claim, enforce OQ-008 (chỉ task của mình)."""
    stmt = (
        select(ClaimTask)
        .where(ClaimTask.id == claim_id)
        .options(
            selectinload(ClaimTask.pre_scores),
            selectinload(ClaimTask.source_maps).selectinload(ClaimSourceMap.source),
            selectinload(ClaimTask.parent_task),
            selectinload(ClaimTask.submissions),
        )
    )
    if lock:
        stmt = stmt.with_for_update()

    result = await db.execute(stmt)
    claim = result.scalar_one_or_none()
    if claim is None:
        raise NotFoundError(f"Claim {claim_id} không tìm thấy.")

    # OQ-008: chỉ annotator được giao mới xem/sửa được
    if claim.assigned_annotator_id != annotator_id:
        raise PermissionDeniedError("Bạn không được giao task này.")

    return claim


def _latest_pre_score(claim: ClaimTask) -> LlmPreScore | None:
    if not claim.pre_scores:
        return None
    return sorted(claim.pre_scores, key=lambda p: p.created_at)[-1]


def _latest_submission(
    claim: ClaimTask, annotator_id: uuid.UUID
) -> AnnotationSubmission | None:
    own = [s for s in claim.submissions if s.annotator_id == annotator_id]
    if not own:
        return None
    return sorted(own, key=lambda s: s.created_at)[-1]


def _build_answer_context(claim: ClaimTask) -> str | None:
    """Trả về đoạn text xung quanh claim từ answer_text_normalized của parent_task."""
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


def _check_justifications(
    scores: ScoreBlock,
    pre: LlmPreScore,
    justifications: JustificationBlock | None,
) -> list[str]:
    """Trả về list dimension name cần justification nhưng chưa có (BR-7.3)."""
    dim_map = {
        "sf": (scores.sf, pre.sf),
        "sc": (scores.sc, pre.sc),
        "hr": (scores.hr, pre.hr),
        "sq": (scores.sq, pre.sq),
        "rel": (scores.rel, pre.rel),
        "comp": (scores.comp, pre.comp),
    }
    missing: list[str] = []
    for dim_key, (ann_val, pre_val) in dim_map.items():
        if needs_justification(ann_val, pre_val):
            just_val = getattr(justifications, dim_key, None) if justifications else None
            if not just_val or not just_val.strip():
                missing.append(dim_key)
    return missing


# ---------------------------------------------------------------------------
# Step 1: list my tasks
# ---------------------------------------------------------------------------

async def list_my_tasks(
    annotator_id: str,
    *,
    status_filter: str | None,
    db: AsyncSession,
) -> TaskListOut:
    """Danh sách claim task được giao cho annotator (OQ-008)."""
    annotator = await _resolve_annotator(annotator_id, db)

    stmt = (
        select(ClaimTask)
        .where(ClaimTask.assigned_annotator_id == annotator.id)
        .options(selectinload(ClaimTask.parent_task))
        .order_by(ClaimTask.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(ClaimTask.status == status_filter)

    result = await db.execute(stmt)
    claims = result.scalars().all()

    items = [
        TaskListItem(
            claim_id=c.id,
            claim_order=c.claim_order,
            section_name=c.section_name,
            claim_text=c.claim_text_original,
            status=c.status,
            submitted_at=c.submitted_at,
            parent_task_id=c.parent_task_id,
            article_code=c.parent_task.article_code if c.parent_task else None,
            title=c.parent_task.title if c.parent_task else None,
        )
        for c in claims
    ]
    return TaskListOut(items=items, total=len(items))


# ---------------------------------------------------------------------------
# Step 2: get task detail
# ---------------------------------------------------------------------------

async def get_task(
    claim_id: uuid.UUID,
    annotator_id: str,
    *,
    db: AsyncSession,
) -> TaskDetailOut:
    annotator = await _resolve_annotator(annotator_id, db)
    claim = await _load_claim(claim_id, annotator.id, db)
    pre = _latest_pre_score(claim)
    draft_sub = _latest_submission(claim, annotator.id)

    # Sources liên quan đến claim này qua ClaimSourceMap
    sources = [
        SourceRefOut(
            source_id=m.source.id,
            source_url=m.source.source_url,
            citation_marker=m.source.source_title,
            access_status=m.source.access_status,
        )
        for m in claim.source_maps
        if m.source
    ]

    # Draft nếu submission chưa submitted (status="draft")
    draft: DraftOut | None = None
    if draft_sub and draft_sub.status == "draft":
        just_raw = draft_sub.justifications_json
        just_block = JustificationBlock(**just_raw) if just_raw else None
        draft = DraftOut(
            scores=ScoreBlock(
                sf=float(draft_sub.sf),
                sc=float(draft_sub.sc),
                hr=float(draft_sub.hr),
                sq=float(draft_sub.sq),
                rel=float(draft_sub.rel),
                comp=float(draft_sub.comp),
            ),
            source_access_status=draft_sub.source_access_status,
            annotator_note=draft_sub.annotator_note,
            justifications=just_block,
            saved_at=draft_sub.updated_at,
        )

    return TaskDetailOut(
        claim_id=claim.id,
        claim_order=claim.claim_order,
        section_name=claim.section_name,
        claim_text=claim.claim_text_original,
        status=claim.status,
        citation_markers=claim.citation_markers,
        parent_task_id=claim.parent_task_id,
        article_code=claim.parent_task.article_code if claim.parent_task else None,
        title=claim.parent_task.title if claim.parent_task else None,
        answer_context=_build_answer_context(claim),
        pre_score=PreScoreOut(
            pre_score_id=pre.id,
            provider=pre.provider,
            model=pre.model,
            sf=float(pre.sf),
            sc=float(pre.sc),
            hr=float(pre.hr),
            sq=float(pre.sq),
            rel=float(pre.rel),
            comp=float(pre.comp),
            composite_score=float(pre.composite_score) if pre.composite_score else None,
            rationale_json=pre.rationale_json,
        ) if pre else None,
        sources=sources,
        draft=draft,
    )


# ---------------------------------------------------------------------------
# Step 3: autosave
# ---------------------------------------------------------------------------

async def autosave(
    claim_id: uuid.UUID,
    payload: AutosaveIn,
    annotator_id: str,
    *,
    db: AsyncSession,
) -> AutosaveOut:
    """Upsert bản draft (status='draft'). Không validate đủ 6 chiều (BR-6.1)."""
    annotator = await _resolve_annotator(annotator_id, db)
    claim = await _load_claim(claim_id, annotator.id, db, lock=True)

    # Không cho autosave nếu đã approved
    if claim.status == ClaimStatus.APPROVED:
        raise AppError("Task đã approved, không thể sửa.", code="task_already_approved")

    justifications_data = (
        payload.justifications.model_dump(exclude_none=True)
        if payload.justifications else None
    )
    draft = _latest_submission(claim, annotator.id)

    now = datetime.now(UTC)

    if draft and draft.status == "draft":
        # Update draft hiện tại
        if payload.scores:
            draft.sf = payload.scores.sf
            draft.sc = payload.scores.sc
            draft.hr = payload.scores.hr
            draft.sq = payload.scores.sq
            draft.rel = payload.scores.rel
            draft.comp = payload.scores.comp
        if payload.source_access_status is not None:
            draft.source_access_status = payload.source_access_status
        if payload.annotator_note is not None:
            draft.annotator_note = payload.annotator_note
        if justifications_data is not None:
            draft.justifications_json = justifications_data
    elif draft and draft.status == "submitted":
        # Returned task: reset submitted -> draft để annotator sửa lại
        draft.status = "draft"
        if payload.scores:
            draft.sf = payload.scores.sf
            draft.sc = payload.scores.sc
            draft.hr = payload.scores.hr
            draft.sq = payload.scores.sq
            draft.rel = payload.scores.rel
            draft.comp = payload.scores.comp
        if payload.source_access_status is not None:
            draft.source_access_status = payload.source_access_status
        if payload.annotator_note is not None:
            draft.annotator_note = payload.annotator_note
        if justifications_data is not None:
            draft.justifications_json = justifications_data
    else:
        # Tạo draft mới — điểm mặc định 0.0 nếu chưa nhập
        scores = payload.scores or ScoreBlock(sf=0, sc=0, hr=0, sq=0, rel=0, comp=0)
        draft = AnnotationSubmission(
            claim_id=claim.id,
            annotator_id=annotator.id,
            sf=scores.sf,
            sc=scores.sc,
            hr=scores.hr,
            sq=scores.sq,
            rel=scores.rel,
            comp=scores.comp,
            source_access_status=payload.source_access_status,
            annotator_note=payload.annotator_note,
            justifications_json=justifications_data,
            status="draft",
        )
        db.add(draft)

    # Fix #1: reset về in_annotation từ READY, SUBMITTED, RETURNED (không chỉ READY)
    if claim.status in (ClaimStatus.READY, ClaimStatus.SUBMITTED, ClaimStatus.RETURNED):
        claim.status = ClaimStatus.IN_ANNOTATION

    await db.commit()
    logger.info("autosave: claim_id=%s annotator=%s", claim_id, annotator_id)

    return AutosaveOut(claim_id=claim.id, saved_at=now)


# ---------------------------------------------------------------------------
# Step 4: submit
# ---------------------------------------------------------------------------

async def submit(
    claim_id: uuid.UUID,
    payload: SubmitIn,
    annotator_id: str,
    *,
    db: AsyncSession,
    user_role: Role | None = None,
    client_ip: str | None = None,
) -> SubmitOut:
    """Submit chính thức — validate đủ 6 chiều, justification, tính composite (BR-6.2/7.2/7.3)."""
    annotator = await _resolve_annotator(annotator_id, db)
    claim = await _load_claim(claim_id, annotator.id, db, lock=True)

    if claim.status == ClaimStatus.APPROVED:
        raise AppError("Task đã approved.", code="task_already_approved")

    pre = _latest_pre_score(claim)

    # BR-7.3: kiểm tra justification cho các dimension lệch ngưỡng
    missing_just: list[str] = []
    if pre:
        missing_just = _check_justifications(payload.scores, pre, payload.justifications)
        if missing_just:
            raise AppError(
                f"Cần nhập lý do cho dimension lệch ngưỡng: {', '.join(missing_just)}.",
                code="justification_required",
            )

    # BR-7.2: tính composite server-side
    score_dict = payload.scores.as_dimension_dict()
    comp = composite_score(score_dict)

    # Tìm dimensions cần justification để trả về cho FE (dù đã đủ)
    dims_needing = []
    if pre:
        for dim_key, (ann_attr, pre_attr) in {
            "sf": ("sf", "sf"), "sc": ("sc", "sc"), "hr": ("hr", "hr"),
            "sq": ("sq", "sq"), "rel": ("rel", "rel"), "comp": ("comp", "comp"),
        }.items():
            if needs_justification(getattr(payload.scores, ann_attr), getattr(pre, pre_attr)):
                dims_needing.append(dim_key)

    now = datetime.now(UTC)
    justifications_data = (
        payload.justifications.model_dump(exclude_none=True)
        if payload.justifications else None
    )

    # Upsert submission: nếu đã có draft thì update, không thì tạo mới
    existing = _latest_submission(claim, annotator.id)
    if existing:
        existing.sf = payload.scores.sf
        existing.sc = payload.scores.sc
        existing.hr = payload.scores.hr
        existing.sq = payload.scores.sq
        existing.rel = payload.scores.rel
        existing.comp = payload.scores.comp
        existing.composite_score = comp
        existing.source_access_status = payload.source_access_status
        existing.annotator_note = payload.annotator_note
        existing.justifications_json = justifications_data
        existing.status = "submitted"
        existing.submitted_at = now
    else:
        submission = AnnotationSubmission(
            claim_id=claim.id,
            annotator_id=annotator.id,
            sf=payload.scores.sf,
            sc=payload.scores.sc,
            hr=payload.scores.hr,
            sq=payload.scores.sq,
            rel=payload.scores.rel,
            comp=payload.scores.comp,
            composite_score=comp,
            source_access_status=payload.source_access_status,
            annotator_note=payload.annotator_note,
            justifications_json=justifications_data,
            status="submitted",
            submitted_at=now,
        )
        db.add(submission)

    # Cập nhật trạng thái claim
    claim.status = ClaimStatus.SUBMITTED
    claim.submitted_at = now

    # Audit (BR-10.2) — cùng transaction với submit (AC-10.1).
    await write_audit_log(
        db,
        action_type="submit",
        entity_type="claim_task",
        entity_id=claim.id,
        user_id=annotator.id,
        user_role=user_role,
        description=f"Annotator submit claim {claim.id} (composite={comp:.2f})",
        client_ip=client_ip,
    )

    await db.commit()
    logger.info(
        "submit: claim_id=%s annotator=%s composite=%.2f",
        claim_id,
        annotator_id,
        comp,
    )

    return SubmitOut(
        claim_id=claim.id,
        composite_score=comp,
        status="submitted",
        submitted_at=now,
        dimensions_needing_justification=dims_needing,
    )
