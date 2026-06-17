"""Integration test file serving — stream PDF theo file_id, RBAC, 404 (DR-004).

Dùng db_session thật + FakeStorage (không đụng MinIO). Verify:
- get_pdf_bytes trả đúng bytes + mime + filename.
- file_id không tồn tại → NotFoundError.
- storage thiếu nội dung → NotFoundError (không 500).
"""

from __future__ import annotations

import uuid

import pytest

from app.core.exceptions import NotFoundError
from app.features.files import service
from app.models.batch import Batch
from app.models.bundle import PdfBundle
from app.models.pdf_file import PdfFile
from app.models.project import Project


class _FakeStorage:
    def __init__(self, mapping: dict[str, bytes]):
        self._mapping = mapping

    async def get(self, key: str) -> bytes:
        return self._mapping[key]  # KeyError nếu thiếu → service map sang NotFoundError


@pytest.fixture
async def pdf_file_row(db_session):
    suffix = uuid.uuid4().hex[:8]
    project = Project(project_code=f"f_{suffix}", project_name="File Test", modality="text")
    db_session.add(project)
    await db_session.flush()
    batch = Batch(project_id=project.id, batch_name=f"b_{suffix}")
    db_session.add(batch)
    await db_session.flush()
    bundle = PdfBundle(batch_id=batch.id, bundle_name=f"bd_{suffix}")
    db_session.add(bundle)
    await db_session.flush()
    pdf = PdfFile(
        bundle_id=bundle.id,
        original_filename="answer.pdf",
        file_role="answer_pdf",
        storage_path=f"projects/{project.id}/bundles/{bundle.id}/answer.pdf",
        mime_type="application/pdf",
        file_size_bytes=10,
    )
    db_session.add(pdf)
    await db_session.commit()

    yield {"pdf": pdf, "project": project, "batch": batch, "bundle": bundle}

    from sqlalchemy import delete

    await db_session.execute(delete(PdfFile).where(PdfFile.id == pdf.id))
    await db_session.execute(delete(PdfBundle).where(PdfBundle.id == bundle.id))
    await db_session.execute(delete(Batch).where(Batch.id == batch.id))
    await db_session.execute(delete(Project).where(Project.id == project.id))
    await db_session.commit()


async def test_get_pdf_bytes_returns_content(db_session, pdf_file_row, monkeypatch):
    pdf = pdf_file_row["pdf"]
    storage = _FakeStorage({pdf.storage_path: b"%PDF-1.7 fake"})
    monkeypatch.setattr(service, "get_storage", lambda: storage)

    data, mime, filename = await service.get_pdf_bytes(pdf.id, db_session)
    assert data == b"%PDF-1.7 fake"
    assert mime == "application/pdf"
    assert filename == "answer.pdf"


async def test_get_pdf_bytes_missing_file_id(db_session):
    with pytest.raises(NotFoundError):
        await service.get_pdf_bytes(uuid.uuid4(), db_session)


async def test_get_pdf_bytes_missing_in_storage(db_session, pdf_file_row, monkeypatch):
    pdf = pdf_file_row["pdf"]
    storage = _FakeStorage({})  # storage rỗng → KeyError → NotFoundError, KHÔNG 500
    monkeypatch.setattr(service, "get_storage", lambda: storage)

    with pytest.raises(NotFoundError):
        await service.get_pdf_bytes(pdf.id, db_session)
