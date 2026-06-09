"""USER_ACCOUNT — tài khoản người dùng nội bộ.

ERD: user_id, full_name, email, status, created_at.
"""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPkMixin


class UserAccount(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "user_account"

    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)

    # Mật khẩu hash (bcrypt). Không có trong ERD gốc nhưng cần cho auth tự viết (OQ-006).
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    project_roles: Mapped[list[UserProjectRole]] = relationship(back_populates="user")

    # TODO(auth): last_login_at, is_active flag, password reset token...
