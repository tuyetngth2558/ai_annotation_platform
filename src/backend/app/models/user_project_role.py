"""USER_PROJECT_ROLE — RBAC: gán role của user theo từng project.

ERD: user_project_role_id, user_id, project_id, role, is_active.
Đây là bảng cho phép role-per-project (1 user có thể là Annotator ở project A,
QA ở project B). Tham chiếu core/permissions.py.
"""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPkMixin


class UserProjectRole(UUIDPkMixin, Base):
    __tablename__ = "user_project_role"
    __table_args__ = (
        UniqueConstraint("user_id", "project_id", "role", name="uq_user_project_role"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True, nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("project.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # Role enum
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped[UserAccount] = relationship(back_populates="project_roles")
    project: Mapped[Project] = relationship(back_populates="roles")
