"""PROJECT — dự án annotation (MVP: Vivipedia). Giữ hướng multi-project.

ERD: project_id, project_code, project_name, modality, project_type, status, created_at.
LLM config (AC-1.2): llm_endpoint, llm_api_key_enc (Fernet, BR-1.2), llm_model,
llm_prompt_template (phải có {{claim_text}} và {{source_context}}, BR-1.3).
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import Date, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPkMixin


class Project(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "project"

    project_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    project_name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # MVP khóa cứng 'text' ở UI; cột để Enum('text','audio','image') hướng mở rộng (BR-1.1).
    modality: Mapped[str] = mapped_column(String(16), default="text", nullable=False)
    project_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)

    # LLM config (AC-1.2) — API key mã hóa Fernet at-rest (BR-1.2).
    llm_endpoint: Mapped[str | None] = mapped_column(String(500), nullable=True)
    llm_api_key_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Prompt phải có {{claim_text}} và {{source_context}} (BR-1.3) — validate ở service.
    llm_prompt_template: Mapped[str | None] = mapped_column(Text, nullable=True)

    batches: Mapped[list[Batch]] = relationship(back_populates="project")
    roles: Mapped[list[UserProjectRole]] = relationship(back_populates="project")
