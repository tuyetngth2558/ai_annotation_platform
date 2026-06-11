"""BATCH — một lần upload nhiều PDF bundle.

ERD: batch_id, project_id, batch_name, import_type, total/valid/invalid_bundles, created_at.
"""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPkMixin


class Batch(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "batch"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("project.id", ondelete="CASCADE"), index=True, nullable=False
    )
    batch_name: Mapped[str] = mapped_column(String(200), nullable=False)
    import_type: Mapped[str] = mapped_column(String(32), default="pdf_bundle", nullable=False)
    total_bundles: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_bundles: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    invalid_bundles: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    project: Mapped[Project] = relationship(back_populates="batches")
    bundles: Mapped[list[PdfBundle]] = relationship(back_populates="batch")
