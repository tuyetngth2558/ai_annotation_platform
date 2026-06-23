"""ANNOTATION_SUBMISSION — điểm do annotator chấm (override pre-score).

ERD: submission_id, claim_id, annotator_id, sf, sc, hr, sq, rel, comp,
composite_score, source_access_status, annotator_note, status, submitted_at.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPkMixin

_SCORE = Numeric(3, 2)  # 0.00–1.00 (VR-ANN-002/003)
_SCORE_COLS = ("sf", "sc", "hr", "sq", "rel", "comp", "composite_score")


class AnnotationSubmission(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "annotation_submission"
    # CHECK: mỗi score trong [0, 1] (VR-ANN-002, BR-7.1).
    __table_args__ = tuple(
        CheckConstraint(f"{c} >= 0 AND {c} <= 1", name=f"ck_annotation_submission_{c}_range")
        for c in _SCORE_COLS
    )

    claim_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("claim_task.id", ondelete="CASCADE"), index=True, nullable=False
    )
    annotator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user_account.id"), index=True, nullable=False
    )

    sf: Mapped[float] = mapped_column(_SCORE, nullable=False)
    sc: Mapped[float] = mapped_column(_SCORE, nullable=False)
    hr: Mapped[float] = mapped_column(_SCORE, nullable=False)  # non-hallucination (NH)
    sq: Mapped[float] = mapped_column(_SCORE, nullable=False)
    rel: Mapped[float] = mapped_column(_SCORE, nullable=False)
    comp: Mapped[float] = mapped_column(_SCORE, nullable=False)
    composite_score: Mapped[float | None] = mapped_column(_SCORE, nullable=True)

    source_access_status: Mapped[str | None] = mapped_column(String(48), nullable=True)
    annotator_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    justifications_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="submitted", nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    claim: Mapped[ClaimTask] = relationship(back_populates="submissions")
