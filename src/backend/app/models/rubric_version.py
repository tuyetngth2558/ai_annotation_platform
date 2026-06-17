"""RUBRIC_VERSION — phiên bản rubric (6 tiêu chí fixed v1 cho MVP).

ERD: rubric_version_id, project_id, version_name, dimensions_json, weights_json,
is_active, effective_from.

MVP hard-code 6 dimension; bảng giữ hướng mở rộng rubric động (Design-Only).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPkMixin


class RubricVersion(UUIDPkMixin, Base):
    __tablename__ = "rubric_version"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("project.id", ondelete="CASCADE"), index=True, nullable=False
    )
    version_name: Mapped[str] = mapped_column(String(64), nullable=False)
    dimensions_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    weights_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    effective_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
