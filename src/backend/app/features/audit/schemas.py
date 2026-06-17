"""Schemas cho Audit Log (đọc — list có phân trang). Ghi log dùng service trực tiếp."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogOut(BaseModel):
    """1 dòng audit log trả cho ADMIN xem (BR-10.2 fields)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID | None
    user_id: uuid.UUID | None
    user_role: str | None
    entity_type: str
    entity_id: uuid.UUID | None
    action_type: str
    description: str | None
    reason: str | None
    client_ip: str | None
    timestamp: datetime


class AuditLogPage(BaseModel):
    """Trang kết quả audit log."""

    items: list[AuditLogOut]
    total: int
    limit: int
    offset: int
