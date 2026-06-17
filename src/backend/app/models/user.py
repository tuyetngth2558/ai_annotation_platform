"""USER_ACCOUNT — tài khoản người dùng nội bộ.

ERD: user_id, full_name, email, status, created_at.
Auth baseline (OQ-006): password_hash + last_login_at. KHÔNG OAuth/verify email/MFA
(BA hoãn — xem docs/PROJECT_STATE.md).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPkMixin


class UserAccount(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "user_account"

    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    # status: active | disabled (dùng cho khóa tài khoản — không thêm cột is_active riêng).
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)

    # Role "duy nhất" của user (ANNOTATOR | QA | ADMIN). 1 user = 1 role, áp dụng cho mọi
    # project user thuộc về. Cho phép tạo user chưa thuộc project nào (default_role giữ role
    # dự kiến; UserProjectRole sẽ dùng đúng role này khi gán vào project). Nullable cho user cũ.
    default_role: Mapped[str | None] = mapped_column(String(16), nullable=True)

    # Mật khẩu hash (bcrypt). Không có trong ERD gốc nhưng cần cho auth tự viết (OQ-006).
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    project_roles: Mapped[list[UserProjectRole]] = relationship(back_populates="user")
