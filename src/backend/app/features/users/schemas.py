"""Schema cho quản lý user (Admin)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.constants import Role
from app.features.auth.schemas import Password


class UserCreate(BaseModel):
    email: str
    full_name: str = Field(min_length=1, max_length=200)
    temp_password: Password  # 8 ký tự tối thiểu + ≤72 byte — user đổi sau
    role: Role  # 1 user = 1 role duy nhất, áp cho mọi project user thuộc về
    # 0..N project. Rỗng = tạo user chưa thuộc project nào (chỉ có default_role).
    project_ids: list[uuid.UUID] = Field(
        default_factory=list,
        description="Gán role (= role ở trên) trong các project này. Rỗng = chưa thuộc project.",
    )


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    status: str
    # Role duy nhất của user (từ default_role). None nếu user cũ chưa set.
    role: Role | None = None
    last_login_at: datetime | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user) -> UserOut:
        """Map UserAccount → UserOut, lấy role từ default_role."""
        return cls(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            status=user.status,
            role=user.default_role,
            last_login_at=user.last_login_at,
        )
