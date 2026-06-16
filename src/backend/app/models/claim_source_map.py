"""CLAIM_SOURCE_MAP — map claim ↔ source (many-to-many).

ERD: claim_source_map_id, claim_id, source_id, mapping_method,
mapping_confidence, is_primary_source.

1 claim được map nhiều source (VR-MAP-004). Citation markers [n] là signal chính (DRD-007).
"""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPkMixin


class ClaimSourceMap(UUIDPkMixin, Base):
    __tablename__ = "claim_source_map"
    __table_args__ = (UniqueConstraint("claim_id", "source_id", name="uq_claim_source"),)

    claim_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("claim_task.id", ondelete="CASCADE"), index=True, nullable=False
    )
    source_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("source_reference.id", ondelete="CASCADE"), index=True, nullable=False
    )
    mapping_method: Mapped[str | None] = mapped_column(String(32), nullable=True)  # citation|manual
    mapping_confidence: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    is_primary_source: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    claim: Mapped[ClaimTask] = relationship(back_populates="source_maps")
    source: Mapped[SourceReference] = relationship(back_populates="claim_maps")
