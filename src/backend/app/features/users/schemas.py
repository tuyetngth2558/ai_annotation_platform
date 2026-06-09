"""Schema cho quản lý user (Admin)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.constants import Role


class UserCreate(BaseModel):
    email: str
    full_name: str = Field(min_length=1, max_length=200)
    temp_password: str = Field(
        min_length=8, max_length=72, description="Mật khẩu tạm (8-72 ký tự) — user đổi sau"
    )
    role: Role
    project_id: uuid.UUID = Field(description="Gán role trong project này (RBAC per-project)")


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    status: str
    last_login_at: datetime | None = None

    model_config = {"from_attributes": True}
