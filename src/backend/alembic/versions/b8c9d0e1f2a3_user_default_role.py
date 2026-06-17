"""user_account: thêm default_role (1 user = 1 role, thuộc 0..N project)

Model nghiệp vụ: mỗi user có đúng 1 role (ANNOTATOR | QA | ADMIN) áp dụng cho mọi
project. default_role lưu role này, cho phép tạo user chưa thuộc project nào. Khi gán
vào project, UserProjectRole.role = default_role. Nullable cho user cũ (đã có qua
UserProjectRole) — backfill từ role per-project nếu nhất quán.

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-06-16
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b8c9d0e1f2a3"
down_revision: str | None = "a7b8c9d0e1f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("user_account", sa.Column("default_role", sa.String(length=16), nullable=True))
    # Backfill: user đã có role per-project nhất quán (chỉ 1 role duy nhất) → set default_role.
    op.execute(
        """
        UPDATE user_account ua
        SET default_role = sub.role
        FROM (
            SELECT user_id, MAX(role) AS role
            FROM user_project_role
            GROUP BY user_id
            HAVING COUNT(DISTINCT role) = 1
        ) AS sub
        WHERE ua.id = sub.user_id AND ua.default_role IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("user_account", "default_role")
