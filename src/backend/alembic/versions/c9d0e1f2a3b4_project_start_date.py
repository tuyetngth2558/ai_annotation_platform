"""project: thêm start_date (ngày bắt đầu)

Bổ sung cột start_date cho project — cùng với deadline để hiển thị khoảng thời gian
dự án. Nullable (project cũ không có). Validate start_date <= deadline ở service.

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-06-17
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c9d0e1f2a3b4"
down_revision: str | None = "b8c9d0e1f2a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("project", sa.Column("start_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("project", "start_date")
