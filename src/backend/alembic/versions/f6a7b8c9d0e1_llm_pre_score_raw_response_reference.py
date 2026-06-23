"""llm_pre_score.raw_response_reference -- trace LLM call thuc (VR-LLM-005).

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-06-16

Ly do: khi goi LLM provider thuc (OpenRouter), can luu lai id/reference cua
response de debug khi provider tra loi sai/loi -- truoc day chua co cot nay.
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "llm_pre_score",
        sa.Column("raw_response_reference", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("llm_pre_score", "raw_response_reference")
