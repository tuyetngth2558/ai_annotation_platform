"""AUDIT_LOG — nhật ký bất biến (INSERT-only, BR-10.1).

ERD: log_id, project_id, user_id, entity_type, entity_id, action_type,
before_value, after_value, reason, timestamp.

Tính bất biến enforce ở DB: migration sẽ REVOKE UPDATE/DELETE (xem infra/postgres/init.sql).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPkMixin


class AuditLog(UUIDPkMixin, Base):
    __tablename__ = "audit_log"

    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("project.id"), index=True, nullable=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("user_account.id"), index=True, nullable=True
    )
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    # action_type: import | claim_edit | submit | approve | return | export (AC-10).
    action_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    before_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    after_value: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )

    # TODO(audit): user_role, client_ip, description (BR-10.2 yêu cầu đủ field).
