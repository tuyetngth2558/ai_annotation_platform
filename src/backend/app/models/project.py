"""PROJECT — dự án annotation (MVP: Vivipedia). Giữ hướng multi-project.

ERD: project_id, project_code, project_name, modality, project_type, status, created_at.
"""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPkMixin


class Project(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "project"

    project_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    project_name: Mapped[str] = mapped_column(String(200), nullable=False)
    # MVP khóa cứng 'text' ở UI; cột để Enum('text','audio','image') hướng mở rộng (BR-1.1).
    modality: Mapped[str] = mapped_column(String(16), default="text", nullable=False)
    project_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)

    batches: Mapped[list[Batch]] = relationship(back_populates="project")
    roles: Mapped[list[UserProjectRole]] = relationship(back_populates="project")

    # TODO(projects): description, deadline, LLM config (endpoint/key mã hóa/model/prompt).
    #   API key phải encrypt-at-rest (BR-1.2) — xem core/crypto.py.
