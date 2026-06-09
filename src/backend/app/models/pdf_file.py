"""PDF_FILE — từng file PDF trong bundle (answer / source_ref / source_content).

ERD: file_id, bundle_id, file_role, original_filename, storage_path, mime_type,
file_size_bytes, parse_status, uploaded_at.
"""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPkMixin


class PdfFile(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "pdf_file"

    bundle_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pdf_bundle.id", ondelete="CASCADE"), index=True, nullable=False
    )
    file_role: Mapped[str] = mapped_column(String(32), nullable=False)  # PdfFileRole enum
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    # Đường dẫn trong object storage (S3/MinIO) — xem integrations/storage.
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parse_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)

    bundle: Mapped[PdfBundle] = relationship(back_populates="files")
