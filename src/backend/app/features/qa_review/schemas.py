"""Schemas cho qa_review feature.

QA flow: GET /qa-reviews/queue -> GET /qa-reviews/{claim_id} -> POST /{claim_id}/approve | /return
RBAC: QA, ADMIN.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.constants import QaReturnReason

# ---------------------------------------------------------------------------
# GET /qa-reviews/queue
# ---------------------------------------------------------------------------

class QueueItem(BaseModel):
    claim_id: uuid.UUID
    claim_order: int
    claim_text: str
    section_name: str | None
    parent_task_id: uuid.UUID
    article_code: str | None
    title: str | None
    submitted_at: datetime | None
    annotator_id: uuid.UUID | None


class QueueOut(BaseModel):
    items: list[QueueItem]
    total: int


# ---------------------------------------------------------------------------
# GET /qa-reviews/{claim_id} — diff view
# ---------------------------------------------------------------------------

class ScoreDiffItem(BaseModel):
    dimension: str           # "sf" | "sc" | "hr" | "sq" | "rel" | "comp"
    pre_score: float | None
    annotator_score: float
    delta: float             # annotator - pre_score (signed)
    needs_justification: bool


class ReviewDetailOut(BaseModel):
    claim_id: uuid.UUID
    claim_order: int
    claim_text: str
    section_name: str | None
    citation_markers: str | None
    article_code: str | None
    title: str | None
    answer_context: str | None
    # Scores
    score_diff: list[ScoreDiffItem]
    composite_pre: float | None
    composite_annotator: float | None
    # Annotator notes
    source_access_status: str | None
    annotator_note: str | None
    justifications: dict | None
    # Lich su review truoc (neu da return roi submit lai)
    previous_reviews: list[PreviousReviewOut]


class PreviousReviewOut(BaseModel):
    qa_review_id: uuid.UUID
    decision: str
    error_category: str | None
    qa_comment: str | None
    reviewed_at: datetime | None
    qa_id: uuid.UUID


# ---------------------------------------------------------------------------
# POST /qa-reviews/{claim_id}/approve
# ---------------------------------------------------------------------------

class ApproveIn(BaseModel):
    qa_comment: str | None = Field(default=None, max_length=2000)


class ReviewOut(BaseModel):
    qa_review_id: uuid.UUID
    claim_id: uuid.UUID
    decision: str       # "approved" | "returned"
    error_category: str | None
    qa_comment: str | None
    reviewed_at: datetime


# ---------------------------------------------------------------------------
# POST /qa-reviews/{claim_id}/return
# ---------------------------------------------------------------------------

class ReturnIn(BaseModel):
    error_category: QaReturnReason
    qa_comment: str = Field(min_length=10, max_length=2000)

    @field_validator("qa_comment")
    @classmethod
    def strip_comment(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 10:
            raise ValueError("qa_comment phai co it nhat 10 ky tu (VR-QA-002).")
        return stripped
