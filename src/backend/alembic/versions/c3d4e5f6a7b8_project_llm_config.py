"""project: thêm description, deadline, llm_config (AC-1.1/1.2, BR-1.2)

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-15
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: str | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("project", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("project", sa.Column("deadline", sa.Date(), nullable=True))
    # LLM config (AC-1.2). api_key lưu dạng Fernet ciphertext (BR-1.2).
    op.add_column("project", sa.Column("llm_endpoint", sa.String(length=500), nullable=True))
    op.add_column("project", sa.Column("llm_api_key_enc", sa.Text(), nullable=True))
    op.add_column("project", sa.Column("llm_model", sa.String(length=128), nullable=True))
    op.add_column("project", sa.Column("llm_prompt_template", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("project", "llm_prompt_template")
    op.drop_column("project", "llm_model")
    op.drop_column("project", "llm_api_key_enc")
    op.drop_column("project", "llm_endpoint")
    op.drop_column("project", "deadline")
    op.drop_column("project", "description")
