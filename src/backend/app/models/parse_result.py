"""PDF_PARSE_RESULT — kết quả parse/normalize từ PDF bundle.

ERD: parse_result_id, bundle_id, parser_version, answer_text_raw,
answer_text_normalized, metadata_extracted_json, source_list_extracted_json,
parse_warnings_json, parse_status, parsed_at.

Tách raw khỏi normalized để trace/debug (DR-002, Recommendation 4).
"""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPkMixin


class PdfParseResult(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "pdf_parse_result"

    bundle_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pdf_bundle.id", ondelete="CASCADE"), index=True, nullable=False
    )
    parser_version: Mapped[str] = mapped_column(String(64), nullable=False)
    answer_text_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    answer_text_normalized: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_extracted_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    source_list_extracted_json: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    parse_warnings_json: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    parse_status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)

    bundle: Mapped[PdfBundle] = relationship(back_populates="parse_result")
