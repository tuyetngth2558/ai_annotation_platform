"""PARENT_TASK — bài/answer sau parse, là gốc của các claim.

ERD: parent_task_id, bundle_id, batch_id, article_code, title, category, tier,
confidence_score, created_date, answer_text_normalized, answer_reference,
status, total_claims, metadata_json.
"""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPkMixin


class ParentTask(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "parent_task"

    bundle_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pdf_bundle.id", ondelete="CASCADE"), index=True, nullable=False
    )
    batch_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("batch.id", ondelete="CASCADE"), index=True, nullable=False
    )
    article_code: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    tier: Mapped[str | None] = mapped_column(String(32), nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    created_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    answer_text_normalized: Mapped[str | None] = mapped_column(Text, nullable=True)
    answer_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(48), default="ready_for_claim_extraction", nullable=False
    )
    total_claims: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    bundle: Mapped[PdfBundle] = relationship(back_populates="parent_task")
    sources: Mapped[list[SourceReference]] = relationship(back_populates="parent_task")
    claims: Mapped[list[ClaimTask]] = relationship(back_populates="parent_task")
