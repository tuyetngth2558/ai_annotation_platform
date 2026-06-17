"""Test E2E pipeline: annotation → QA approve/return → export CSV.

Dùng DB thật (postgres container). Cần: make test-be hoặc docker compose up.

Coverage:
- B1-01: Annotator autosave → status IN_ANNOTATION, justifications persist
- B1-02: Annotator submit đủ 6 chiều → status SUBMITTED, composite đúng
- B1-03: Submit khi thiếu justification cho dimension lệch ngưỡng → 422
- B1-04: Submit lệch ngưỡng kèm justification đủ → OK
- B1-05: QA queue trả về claim đã submitted
- B1-06: QA approve → status APPROVED, lưu QaReview
- B1-07: QA return → status RETURNED, annotator autosave reset IN_ANNOTATION
- B1-08: Re-submit sau return → OK (fix deadlock issue #1)
- B1-09: Export CSV: trả bytes UTF-8 BOM, có header, claim approved nằm trong file
- B1-10: Export không có claim approved → 400 no_approved_claims
"""

from __future__ import annotations

import csv
import io
import uuid

import pytest
from sqlalchemy import select

from app.constants import ClaimStatus
from app.features.annotation import service as ann_svc
from app.features.annotation.schemas import (
    AutosaveIn,
    JustificationBlock,
    ScoreBlock,
    SubmitIn,
)
from app.features.export import service as export_svc
from app.features.qa_review import service as qa_svc
from app.features.qa_review.schemas import ApproveIn, ReturnIn
from app.models.annotation_submission import AnnotationSubmission
from app.models.claim_task import ClaimTask
from app.models.qa_review import QaReview

# ---------------------------------------------------------------------------
# B1-01: autosave lưu draft + justifications
# ---------------------------------------------------------------------------

async def test_autosave_creates_draft_and_transitions_status(db_session, pipeline_claim):
    claim = pipeline_claim["claim"]
    annotator = pipeline_claim["annotator"]

    await ann_svc.autosave(
        claim.id,
        AutosaveIn(
            scores=ScoreBlock(sf=0.5, sc=0.5, hr=0.5, sq=0.5, rel=0.5, comp=0.5),
            justifications=JustificationBlock(sf="reason sf"),
        ),
        str(annotator.id),
        db=db_session,
    )

    # Claim phải sang IN_ANNOTATION
    fresh = (await db_session.execute(
        select(ClaimTask).where(ClaimTask.id == claim.id)
    )).scalar_one()
    assert fresh.status == ClaimStatus.IN_ANNOTATION

    # Draft phải tồn tại với justifications
    draft = (await db_session.execute(
        select(AnnotationSubmission).where(
            AnnotationSubmission.claim_id == claim.id,
            AnnotationSubmission.status == "draft",
        )
    )).scalar_one()
    assert draft.sf == pytest.approx(0.5)
    assert draft.justifications_json == {"sf": "reason sf"}


# ---------------------------------------------------------------------------
# B1-02: submit đủ điều kiện → composite đúng, status SUBMITTED
# ---------------------------------------------------------------------------

async def test_submit_calculates_composite_and_transitions(db_session, pipeline_claim):
    claim = pipeline_claim["claim"]
    annotator = pipeline_claim["annotator"]

    result = await ann_svc.submit(
        claim.id,
        SubmitIn(
            scores=ScoreBlock(sf=0.8, sc=0.8, hr=0.8, sq=0.8, rel=0.8, comp=0.8),
            source_access_status="accessible",
        ),
        str(annotator.id),
        db=db_session,
    )

    assert result.composite_score == pytest.approx(0.8)
    assert result.status == "submitted"

    fresh = (await db_session.execute(
        select(ClaimTask).where(ClaimTask.id == claim.id)
    )).scalar_one()
    assert fresh.status == ClaimStatus.SUBMITTED


# ---------------------------------------------------------------------------
# B1-03: submit lệch ngưỡng, thiếu justification → lỗi
# ---------------------------------------------------------------------------

async def test_submit_missing_justification_raises(db_session, pipeline_claim):
    claim = pipeline_claim["claim"]
    annotator = pipeline_claim["annotator"]

    from app.core.exceptions import AppError

    with pytest.raises(AppError) as exc_info:
        await ann_svc.submit(
            claim.id,
            SubmitIn(
                # pre-score = 0.80; lệch 0.30 ở sf → cần justification
                scores=ScoreBlock(sf=0.50, sc=0.80, hr=0.80, sq=0.80, rel=0.80, comp=0.80),
                source_access_status="accessible",
                justifications=None,
            ),
            str(annotator.id),
            db=db_session,
        )
    assert exc_info.value.code == "justification_required"


# ---------------------------------------------------------------------------
# B1-04: submit lệch ngưỡng kèm justification đủ → OK
# ---------------------------------------------------------------------------

async def test_submit_with_justification_passes(db_session, pipeline_claim):
    claim = pipeline_claim["claim"]
    annotator = pipeline_claim["annotator"]

    result = await ann_svc.submit(
        claim.id,
        SubmitIn(
            scores=ScoreBlock(sf=0.50, sc=0.80, hr=0.80, sq=0.80, rel=0.80, comp=0.80),
            source_access_status="accessible",
            justifications=JustificationBlock(sf="nguon bi xoa"),
        ),
        str(annotator.id),
        db=db_session,
    )
    assert result.status == "submitted"

    # Justification được lưu vào DB
    sub = (await db_session.execute(
        select(AnnotationSubmission).where(
            AnnotationSubmission.claim_id == claim.id,
            AnnotationSubmission.status == "submitted",
        )
    )).scalar_one()
    assert sub.justifications_json == {"sf": "nguon bi xoa"}


# ---------------------------------------------------------------------------
# B1-05: QA queue thấy claim đã submitted
# ---------------------------------------------------------------------------

async def test_qa_queue_returns_submitted_claim(db_session, pipeline_claim):
    claim = pipeline_claim["claim"]
    annotator = pipeline_claim["annotator"]
    qa = pipeline_claim["qa"]

    # Submit trước
    await ann_svc.submit(
        claim.id,
        SubmitIn(
            scores=ScoreBlock(sf=0.8, sc=0.8, hr=0.8, sq=0.8, rel=0.8, comp=0.8),
            source_access_status="accessible",
        ),
        str(annotator.id),
        db=db_session,
    )

    queue = await qa_svc.qa_queue(str(qa.id), db=db_session)
    claim_ids = [str(item.claim_id) for item in queue.items]
    assert str(claim.id) in claim_ids


# ---------------------------------------------------------------------------
# B1-06: QA approve → status APPROVED, QaReview tồn tại
# ---------------------------------------------------------------------------

async def test_qa_approve_transitions_to_approved(db_session, pipeline_claim):
    claim = pipeline_claim["claim"]
    annotator = pipeline_claim["annotator"]
    qa = pipeline_claim["qa"]

    await ann_svc.submit(
        claim.id,
        SubmitIn(
            scores=ScoreBlock(sf=0.8, sc=0.8, hr=0.8, sq=0.8, rel=0.8, comp=0.8),
            source_access_status="accessible",
        ),
        str(annotator.id),
        db=db_session,
    )

    result = await qa_svc.approve(
        claim.id,
        ApproveIn(qa_comment="Looks good"),
        str(qa.id),
        db=db_session,
    )
    assert result.decision == "approved"

    fresh = (await db_session.execute(
        select(ClaimTask).where(ClaimTask.id == claim.id)
    )).scalar_one()
    assert fresh.status == ClaimStatus.APPROVED

    review = (await db_session.execute(
        select(QaReview).where(QaReview.claim_id == claim.id)
    )).scalar_one()
    assert review.decision == "approved"
    assert review.qa_id == qa.id


# ---------------------------------------------------------------------------
# B1-07: QA return → status RETURNED
# ---------------------------------------------------------------------------

async def test_qa_return_transitions_to_returned(db_session, pipeline_claim):
    claim = pipeline_claim["claim"]
    annotator = pipeline_claim["annotator"]
    qa = pipeline_claim["qa"]

    await ann_svc.submit(
        claim.id,
        SubmitIn(
            scores=ScoreBlock(sf=0.8, sc=0.8, hr=0.8, sq=0.8, rel=0.8, comp=0.8),
            source_access_status="accessible",
        ),
        str(annotator.id),
        db=db_session,
    )

    result = await qa_svc.return_task(
        claim.id,
        ReturnIn(error_category="factual_error", qa_comment="Score sf sai, xem lai nguon"),
        str(qa.id),
        db=db_session,
    )
    assert result.decision == "returned"

    fresh = (await db_session.execute(
        select(ClaimTask).where(ClaimTask.id == claim.id)
    )).scalar_one()
    assert fresh.status == ClaimStatus.RETURNED


# ---------------------------------------------------------------------------
# B1-08: Re-submit sau return (fix deadlock issue #1)
# ---------------------------------------------------------------------------

async def test_resubmit_after_return_succeeds(db_session, pipeline_claim):
    """Annotator autosave → submit → QA return → autosave reset → submit lại OK."""
    claim = pipeline_claim["claim"]
    annotator = pipeline_claim["annotator"]
    qa = pipeline_claim["qa"]

    # Lần submit đầu
    await ann_svc.submit(
        claim.id,
        SubmitIn(
            scores=ScoreBlock(sf=0.8, sc=0.8, hr=0.8, sq=0.8, rel=0.8, comp=0.8),
            source_access_status="accessible",
        ),
        str(annotator.id),
        db=db_session,
    )

    # QA return
    await qa_svc.return_task(
        claim.id,
        ReturnIn(error_category="factual_error", qa_comment="Score sf sai, xem lai nguon"),
        str(qa.id),
        db=db_session,
    )

    # Autosave sau return → phải reset sang IN_ANNOTATION (không deadlock)
    await ann_svc.autosave(
        claim.id,
        AutosaveIn(scores=ScoreBlock(sf=0.9, sc=0.8, hr=0.8, sq=0.8, rel=0.8, comp=0.8)),
        str(annotator.id),
        db=db_session,
    )

    fresh = (await db_session.execute(
        select(ClaimTask).where(ClaimTask.id == claim.id)
    )).scalar_one()
    assert fresh.status == ClaimStatus.IN_ANNOTATION

    # Submit lại thành công
    result = await ann_svc.submit(
        claim.id,
        SubmitIn(
            scores=ScoreBlock(sf=0.9, sc=0.8, hr=0.8, sq=0.8, rel=0.8, comp=0.8),
            source_access_status="accessible",
            justifications=JustificationBlock(sf="nguon so sach da update"),
        ),
        str(annotator.id),
        db=db_session,
    )
    assert result.status == "submitted"


# ---------------------------------------------------------------------------
# B1-09: Export CSV sau approve — bytes, BOM, header, claim có trong file
# ---------------------------------------------------------------------------

async def test_export_csv_after_approve(db_session, pipeline_claim):
    claim = pipeline_claim["claim"]
    annotator = pipeline_claim["annotator"]
    qa = pipeline_claim["qa"]
    project = pipeline_claim["project"]

    await ann_svc.submit(
        claim.id,
        SubmitIn(
            scores=ScoreBlock(sf=0.8, sc=0.8, hr=0.8, sq=0.8, rel=0.8, comp=0.8),
            source_access_status="accessible",
        ),
        str(annotator.id),
        db=db_session,
    )

    await qa_svc.approve(
        claim.id,
        ApproveIn(qa_comment=None),
        str(qa.id),
        db=db_session,
    )

    csv_bytes = await export_svc.build_export_csv(project.id, db=db_session)

    # UTF-8 BOM
    assert csv_bytes[:3] == b"\xef\xbb\xbf"

    # Parse CSV
    reader = csv.DictReader(io.StringIO(csv_bytes.decode("utf-8-sig")))
    rows = list(reader)
    assert len(rows) >= 1

    claim_ids = [r["claim_id"] for r in rows]
    assert str(claim.id) in claim_ids

    row = next(r for r in rows if r["claim_id"] == str(claim.id))
    assert row["status"] == "approved"
    assert row["qa_decision"] == "approved"
    assert float(row["composite_score"]) == pytest.approx(0.8)


# ---------------------------------------------------------------------------
# B1-10: Export không có claim approved → AppError no_approved_claims
# ---------------------------------------------------------------------------

async def test_export_empty_project_raises(db_session, pipeline_claim):
    from app.core.exceptions import AppError

    # project khác, không có claim approved
    with pytest.raises(AppError) as exc_info:
        await export_svc.build_export_csv(uuid.uuid4(), db=db_session)
    assert exc_info.value.code == "no_approved_claims"
