"""SOURCE_REFERENCE — nguồn tham khảo của parent task (từ Source Ref PDF).

ERD: source_id, parent_task_id, source_order, source_title, source_tier,
source_url, source_file_id, source_text_extract, source_parse_status, access_status.

Rule: source_order/source_title required; source_url optional (DRD-006).
"""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPkMixin


class SourceReference(UUIDPkMixin, Base):
    __tablename__ = "source_reference"
    __table_args__ = (
        UniqueConstraint("parent_task_id", "source_order", name="uq_source_order_per_parent"),
    )

    parent_task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("parent_task.id", ondelete="CASCADE"), index=True, nullable=False
    )
    source_order: Mapped[int] = mapped_column(Integer, nullable=False)
    source_title: Mapped[str] = mapped_column(String(1000), nullable=False)
    source_tier: Mapped[str | None] = mapped_column(String(32), default="unknown", nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)  # optional (DRD-006)
    source_file_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pdf_file.id"), nullable=True
    )
    source_text_extract: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_parse_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)
    access_status: Mapped[str] = mapped_column(String(32), default="unknown", nullable=False)

    parent_task: Mapped[ParentTask] = relationship(back_populates="sources")
    claim_maps: Mapped[list[ClaimSourceMap]] = relationship(back_populates="source")
