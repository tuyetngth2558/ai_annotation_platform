"""CLAIM_TASK — đơn vị annotation (1 claim = 1 task).

ERD: claim_id, parent_task_id, claim_order, section_name, claim_text_original,
claim_text_final, citation_markers, status, assigned_annotator_id, rubric_version,
submitted_at, approved_at.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPkMixin


class ClaimTask(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "claim_task"
    __table_args__ = (
        UniqueConstraint("parent_task_id", "claim_order", name="uq_claim_order_per_parent"),
    )

    parent_task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("parent_task.id", ondelete="CASCADE"), index=True, nullable=False
    )
    claim_order: Mapped[int] = mapped_column(Integer, nullable=False)
    section_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    claim_text_original: Mapped[str] = mapped_column(Text, nullable=False)
    claim_text_final: Mapped[str | None] = mapped_column(Text, nullable=True)
    citation_markers: Mapped[str | None] = mapped_column(String(255), nullable=True)  # "[1];[3]"
    status: Mapped[str] = mapped_column(String(48), default="ready", index=True, nullable=False)
    assigned_annotator_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user_account.id"), index=True, nullable=True
    )
    rubric_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    parent_task: Mapped[ParentTask] = relationship(back_populates="claims")
    source_maps: Mapped[list[ClaimSourceMap]] = relationship(back_populates="claim")
    pre_scores: Mapped[list[LlmPreScore]] = relationship(back_populates="claim")
    submissions: Mapped[list[AnnotationSubmission]] = relationship(back_populates="claim")
    qa_reviews: Mapped[list[QaReview]] = relationship(back_populates="claim")
