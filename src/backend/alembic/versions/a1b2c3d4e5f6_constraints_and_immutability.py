"""CHECK score range + immutability (audit log, llm_pre_score)

Bổ sung các invariant mà docs mô tả nhưng schema đầu chưa enforce:
- CHECK: mọi cột score trong [0,1] (VR-LLM-002, VR-ANN-002, BR-7.1).
- AUDIT_LOG immutable: trigger chặn UPDATE/DELETE (BR-10.1).
- LLM_PRE_SCORE immutable: trigger chặn UPDATE/DELETE (BR-5.1).

Dùng TRIGGER (không phải REVOKE) để enforce immutable: trigger chặn cả owner/superuser,
trong khi REVOKE không chặn được owner bảng (ở dev user `vsf` là owner). Trigger raise
exception khi có UPDATE/DELETE → bất biến thật sự ở DB layer.

Revision ID: a1b2c3d4e5f6
Revises: cbf57c0cefd7
Create Date: 2026-06-09
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "cbf57c0cefd7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SCORE_COLS = ("sf", "sc", "hr", "sq", "rel", "comp", "composite_score")
_SCORE_TABLES = ("llm_pre_score", "annotation_submission")


def upgrade() -> None:
    # 1. CHECK range [0,1] cho mọi cột score.
    for table in _SCORE_TABLES:
        for col in _SCORE_COLS:
            op.create_check_constraint(
                f"ck_{table}_{col}_range",
                table,
                f"{col} >= 0 AND {col} <= 1",
            )

    # 2. Immutability bằng TRIGGER (chặn cả owner, khác REVOKE).
    op.execute(
        """
        CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'Bảng % là INSERT-only, không cho phép %',
                TG_TABLE_NAME, TG_OP;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    for table in ("audit_log", "llm_pre_score"):
        op.execute(
            f"""
            CREATE TRIGGER trg_{table}_immutable
            BEFORE UPDATE OR DELETE ON {table}
            FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
            """
        )


def downgrade() -> None:
    for table in ("audit_log", "llm_pre_score"):
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_immutable ON {table}")
    op.execute("DROP FUNCTION IF EXISTS forbid_mutation()")
    for table in _SCORE_TABLES:
        for col in _SCORE_COLS:
            op.drop_constraint(f"ck_{table}_{col}_range", table, type_="check")
