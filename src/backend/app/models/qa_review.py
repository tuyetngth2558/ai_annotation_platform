"""QA_REVIEW — quyết định của QA (Approve / Return).

ERD: qa_review_id, claim_id, qa_id, decision, qa_comment, reviewed_at.
MVP: chỉ approved/returned (BR-8.1). Return bắt buộc comment (VR-QA-002).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPkMixin


class QaReview(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "qa_review"

    claim_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("claim_task.id", ondelete="CASCADE"), index=True, nullable=False
    )
    qa_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user_account.id"), index=True, nullable=False
    )
    decision: Mapped[str] = mapped_column(String(16), nullable=False)  # QaDecision enum
    # error_category bắt buộc khi Return (BR-8.2) — QaReturnReason enum.
    error_category: Mapped[str | None] = mapped_column(String(48), nullable=True)
    qa_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    claim: Mapped[ClaimTask] = relationship(back_populates="qa_reviews")
