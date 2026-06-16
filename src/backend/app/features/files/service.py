"""File serving service — đọc PDF gốc từ storage theo file_id (DR-004).

Stream qua API thay vì lộ storage_path: client chỉ biết file_id (UUID), backend
resolve → storage key → bytes. An toàn (không path traversal từ client), kiểm tra
tồn tại + có thể mở rộng RBAC per-project sau.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.integrations.storage import get_storage
from app.integrations.storage.base import InvalidStorageKey
from app.models.pdf_file import PdfFile

logger = get_logger(__name__)


async def get_pdf_bytes(
    file_id: uuid.UUID, db: AsyncSession
) -> tuple[bytes, str, str]:
    """Trả (data, mime_type, original_filename) cho file_id. Raise NotFoundError nếu thiếu."""
    result = await db.execute(select(PdfFile).where(PdfFile.id == file_id))
    pdf = result.scalar_one_or_none()
    if pdf is None:
        raise NotFoundError(f"File {file_id} không tồn tại.")

    storage = get_storage()
    try:
        data = await storage.get(pdf.storage_path)
    except (FileNotFoundError, InvalidStorageKey, KeyError) as exc:
        logger.error(
            "get_pdf_bytes: không đọc được file %s (%s): %s",
            file_id, pdf.storage_path, exc,
        )
        raise NotFoundError(f"Nội dung file {file_id} không có trong storage.") from exc

    return data, pdf.mime_type or "application/pdf", pdf.original_filename
