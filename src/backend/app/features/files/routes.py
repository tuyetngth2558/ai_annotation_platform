"""File routes — stream PDF gốc qua API (ADMIN, ANNOTATOR, QA).

Annotator/QA cần xem PDF answer + source khi chấm/review (DR-004). Stream theo file_id
(không lộ storage_path). MVP single-project nên cho cả 3 role; RBAC per-project mở rộng sau.
API path: /api/v1/files
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import Role
from app.core.permissions import require_role
from app.db.session import get_db
from app.features.files import service

router = APIRouter(
    prefix="/files",
    tags=["files"],
    dependencies=[Depends(require_role(Role.ADMIN, Role.ANNOTATOR, Role.QA))],
)


@router.get("/{file_id}")
async def get_file(
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Stream nội dung 1 PDF theo file_id (inline để xem trên trình duyệt)."""
    data, mime_type, filename = await service.get_pdf_bytes(file_id, db)
    return Response(
        content=data,
        media_type=mime_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
