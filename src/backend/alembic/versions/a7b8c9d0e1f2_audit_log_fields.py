"""audit_log: thêm user_role, description, client_ip (BR-10.2)

BR-10.2 yêu cầu mỗi dòng audit_log ghi đủ: user_role (vai trò lúc thực hiện),
description (mô tả hành động), client_ip (IP client). Bảng vẫn INSERT-only
(trigger trg_audit_log_immutable từ migration a1b2c3d4e5f6 vẫn áp dụng).

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-06-16
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: str | None = "f6a7b8c9d0e1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("audit_log", sa.Column("user_role", sa.String(length=32), nullable=True))
    op.add_column("audit_log", sa.Column("description", sa.String(length=1000), nullable=True))
    op.add_column("audit_log", sa.Column("client_ip", sa.String(length=45), nullable=True))


def downgrade() -> None:
    # Bảng INSERT-only: drop column là DDL (không bị trigger UPDATE/DELETE chặn).
    op.drop_column("audit_log", "client_ip")
    op.drop_column("audit_log", "description")
    op.drop_column("audit_log", "user_role")
