"""Declarative base + mixin dùng chung cho models.

Bám ERD (docs/03_ba/dan/01_ERD_MVP_and_Extensible.md): PK uuid, timestamp tạo/cập nhật.
KHÔNG thêm created_by/updated_by/deleted_at — truy vết qua AUDIT_LOG (BR-10.1).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base cho mọi model."""


class UUIDPkMixin:
    """Khóa chính uuid (gen ở DB qua pgcrypto/gen_random_uuid)."""

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    """created_at / updated_at — có ở hầu hết entity theo ERD."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
