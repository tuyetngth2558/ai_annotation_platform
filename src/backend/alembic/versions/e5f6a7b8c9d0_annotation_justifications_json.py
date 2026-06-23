"""annotation_submission.justifications_json -- luu ly do lech nguong (BR-7.3).

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-16

Ly do: dữ lieu justification hien bi bo qua sau khi validate (data loss).
Them 1 cot JSONB thay vi 6 cot rieng cho 6 dimension -- gon hon, du cho MVP.
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "annotation_submission",
        sa.Column("justifications_json", JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("annotation_submission", "justifications_json")
