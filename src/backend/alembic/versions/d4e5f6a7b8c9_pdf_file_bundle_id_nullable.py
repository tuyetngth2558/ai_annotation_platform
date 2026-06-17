"""pdf_file.bundle_id nullable for staging uploads.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-16

Ly do: khi Admin upload tung file truoc khi confirm import, chua co PdfBundle nao
duoc tao. bundle_id can nullable de luu PdfFile tam (staging). Chi set sau khi
confirm_import tao PdfBundle thanh cong.
"""

from __future__ import annotations

from alembic import op

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop FK constraint truoc, doi nullable, roi add FK lai
    op.drop_constraint("pdf_file_bundle_id_fkey", "pdf_file", type_="foreignkey")
    op.alter_column("pdf_file", "bundle_id", nullable=True)
    op.create_foreign_key(
        "pdf_file_bundle_id_fkey",
        "pdf_file",
        "pdf_bundle",
        ["bundle_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    # Xoa cac row staging (bundle_id IS NULL) truoc khi revert ve NOT NULL
    op.execute("DELETE FROM pdf_file WHERE bundle_id IS NULL")
    op.drop_constraint("pdf_file_bundle_id_fkey", "pdf_file", type_="foreignkey")
    op.alter_column("pdf_file", "bundle_id", nullable=False)
    op.create_foreign_key(
        "pdf_file_bundle_id_fkey",
        "pdf_file",
        "pdf_bundle",
        ["bundle_id"],
        ["id"],
        ondelete="CASCADE",
    )
