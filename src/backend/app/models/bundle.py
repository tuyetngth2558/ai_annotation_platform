"""PDF_BUNDLE — một bài input gồm nhiều PDF (answer + ref + content).

ERD: bundle_id, batch_id, bundle_name, article_code, title, bundle_status,
uploaded_by, uploaded_at, metadata_json.
"""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPkMixin


class PdfBundle(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "pdf_bundle"

    batch_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("batch.id", ondelete="CASCADE"), index=True, nullable=False
    )
    bundle_name: Mapped[str] = mapped_column(String(200), nullable=False)
    article_code: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bundle_status: Mapped[str] = mapped_column(String(32), default="uploaded", nullable=False)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user_account.id"), nullable=True
    )
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    batch: Mapped[Batch] = relationship(back_populates="bundles")
    files: Mapped[list[PdfFile]] = relationship(back_populates="bundle")
    parse_result: Mapped[PdfParseResult | None] = relationship(back_populates="bundle")
    parent_task: Mapped[ParentTask | None] = relationship(back_populates="bundle")
