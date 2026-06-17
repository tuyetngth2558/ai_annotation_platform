"""Integration test cho run_import_pipeline với fake LLM + fake storage.

Không gọi OpenRouter thật (tránh tốn tiền/flaky). Dùng:
- PDF thật sinh bằng fitz (PyMuPDF) để parser chạy được.
- FakeProvider trả claim + score cố định.
- FakeStorage trả bytes PDF theo storage_path.

Verify chuỗi: ParentTask → SourceReference → ClaimTask → ClaimSourceMap → LlmPreScore
và bundle_status chuyển parsing → pre_scoring → done.
"""

from __future__ import annotations

import uuid

import fitz  # PyMuPDF
import pytest
from sqlalchemy import delete, select, text

from app.integrations.llm.base import PreScoreResult
from app.jobs.pipelines import import_pipeline
from app.models.batch import Batch
from app.models.bundle import PdfBundle
from app.models.claim_source_map import ClaimSourceMap
from app.models.claim_task import ClaimTask
from app.models.llm_pre_score import LlmPreScore
from app.models.parent_task import ParentTask
from app.models.parse_result import PdfParseResult
from app.models.pdf_file import PdfFile
from app.models.project import Project
from app.models.source_reference import SourceReference

# LLM giờ chỉ trả 5 chiều — SQ do rule engine (Hướng A).
_LLM_DIMS = ("sf", "sc", "hr", "rel", "comp")


def _answer_pdf_bytes() -> bytes:
    """PDF answer có text + citation marker [1] để parser trích được."""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Tiêu đề bài viết mẫu", fontsize=16)
    page.insert_text((72, 110), "ENC_20260101_ABCD1234", fontsize=10)
    page.insert_text((72, 130), "created 2026-01-01", fontsize=10)
    page.insert_text((72, 160), "Nội dung chính", fontsize=14)
    page.insert_text(
        (72, 190),
        "Trời có màu xanh vào ban ngày do tán xạ ánh sáng [1].",
        fontsize=10,
    )
    data = doc.tobytes()
    doc.close()
    return data


def _ref_pdf_bytes() -> bytes:
    """PDF source_ref có 1 hyperlink annotation để ref_parser trích được URL."""
    doc = fitz.open()
    page = doc.new_page()
    rect = fitz.Rect(72, 72, 400, 92)
    page.insert_text((72, 88), "https://example.com/source-1", fontsize=10)
    page.insert_link({"kind": fitz.LINK_URI, "from": rect, "uri": "https://example.com/source-1"})
    data = doc.tobytes()
    doc.close()
    return data


class _FakeStorage:
    def __init__(self, mapping: dict[str, bytes]):
        self._mapping = mapping

    async def get(self, key: str) -> bytes:
        return self._mapping[key]


class _FakeProvider:
    _model = "fake-model"

    def __init__(self):
        self.extract_called = False
        self.last_domain = None
        self.last_title = None
        self.last_source_context = None

    async def extract_claims(self, answer_text, *, prompt_version):
        self.extract_called = True
        return [
            {
                "claim_order": 1,
                "section_name": "Fallback",
                "claim_text": "Claim fallback từ LLM.",
                "citation_markers": [1],
                "source_order_candidates": [1],
                "confidence": 0.9,
            }
        ]

    async def pre_score(
        self, claim_text, source_context, *, prompt_version, domain=None, title=None
    ):
        self.last_domain = domain
        self.last_title = title
        self.last_source_context = source_context
        return PreScoreResult(
            scores={d: 0.75 for d in _LLM_DIMS},  # 5 chiều, KHÔNG có sq
            rationales={d: "ok" for d in _LLM_DIMS},
            raw_response_reference="fake-ref-1",
            extra={"fact_check_status": "XAC NHAN"},
            prompt_version_used="pre_score_law_v1",
        )


@pytest.fixture
async def pipeline_sessionmaker(monkeypatch):
    """Bind SessionLocal của pipeline vào engine tạo trong event loop của test hiện tại.

    Pipeline dùng `SessionLocal` module-level (patch sang engine session-scoped ở conftest);
    gọi pipeline nhiều lần trong 1 test gây 'Future attached to a different loop' với NullPool.
    Tạo engine riêng theo loop test → an toàn.
    """
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool

    from app.core.config import settings

    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    maker = async_sessionmaker(bind=engine, expire_on_commit=False)
    monkeypatch.setattr(import_pipeline, "SessionLocal", maker)
    try:
        yield maker
    finally:
        await engine.dispose()


@pytest.fixture
async def pipeline_bundle(db_session):
    """Tạo Project → Batch → Bundle → answer/ref PdfFile (chưa parse). Tự dọn sau test."""
    suffix = uuid.uuid4().hex[:8]
    project = Project(
        project_code=f"pipe_{suffix}", project_name="Pipe E2E", modality="text"
    )
    db_session.add(project)
    await db_session.flush()

    batch = Batch(project_id=project.id, batch_name=f"b_{suffix}")
    db_session.add(batch)
    await db_session.flush()

    bundle = PdfBundle(batch_id=batch.id, bundle_name=f"bd_{suffix}", bundle_status="uploaded")
    db_session.add(bundle)
    await db_session.flush()

    base = f"projects/{project.id}/bundles/{bundle.id}"
    answer = PdfFile(
        bundle_id=bundle.id,
        original_filename="answer.pdf",
        file_role="answer_pdf",
        storage_path=f"{base}/answer.pdf",
        mime_type="application/pdf",
        file_size_bytes=1024,
    )
    ref = PdfFile(
        bundle_id=bundle.id,
        original_filename="ref.pdf",
        file_role="source_ref_pdf",
        storage_path=f"{base}/ref.pdf",
        mime_type="application/pdf",
        file_size_bytes=1024,
    )
    content = PdfFile(
        bundle_id=bundle.id,
        original_filename="content1.pdf",
        file_role="source_content_pdf",
        storage_path=f"{base}/content1.pdf",
        mime_type="application/pdf",
        file_size_bytes=1024,
    )
    db_session.add_all([answer, ref, content])
    await db_session.commit()

    storage_map = {
        answer.storage_path: _answer_pdf_bytes(),
        ref.storage_path: _ref_pdf_bytes(),
        content.storage_path: _answer_pdf_bytes(),
    }

    yield {"project": project, "batch": batch, "bundle": bundle, "storage_map": storage_map}

    # Teardown — xóa ngược FK. Pipeline tạo parent/claim/source/map/prescore.
    parents = (
        await db_session.execute(
            select(ParentTask).where(ParentTask.bundle_id == bundle.id)
        )
    ).scalars().all()
    for parent in parents:
        claims = (
            await db_session.execute(
                select(ClaimTask).where(ClaimTask.parent_task_id == parent.id)
            )
        ).scalars().all()
        await db_session.execute(
            text("ALTER TABLE llm_pre_score DISABLE TRIGGER trg_llm_pre_score_immutable")
        )
        for claim in claims:
            await db_session.execute(
                delete(LlmPreScore).where(LlmPreScore.claim_id == claim.id)
            )
            await db_session.execute(
                delete(ClaimSourceMap).where(ClaimSourceMap.claim_id == claim.id)
            )
        await db_session.execute(
            text("ALTER TABLE llm_pre_score ENABLE TRIGGER trg_llm_pre_score_immutable")
        )
        await db_session.execute(
            delete(ClaimTask).where(ClaimTask.parent_task_id == parent.id)
        )
        await db_session.execute(
            delete(SourceReference).where(SourceReference.parent_task_id == parent.id)
        )
    await db_session.execute(delete(PdfParseResult).where(PdfParseResult.bundle_id == bundle.id))
    await db_session.execute(delete(ParentTask).where(ParentTask.bundle_id == bundle.id))
    await db_session.execute(delete(PdfFile).where(PdfFile.bundle_id == bundle.id))
    await db_session.execute(delete(PdfBundle).where(PdfBundle.id == bundle.id))
    await db_session.execute(delete(Batch).where(Batch.id == batch.id))
    await db_session.execute(delete(Project).where(Project.id == project.id))
    await db_session.commit()


async def test_pipeline_creates_full_chain(
    db_session, pipeline_bundle, pipeline_sessionmaker, monkeypatch
):
    bundle = pipeline_bundle["bundle"]
    storage = _FakeStorage(pipeline_bundle["storage_map"])
    provider = _FakeProvider()

    monkeypatch.setattr(import_pipeline, "get_storage", lambda: storage)
    monkeypatch.setattr(import_pipeline, "get_llm_provider", lambda *a, **k: provider)

    await import_pipeline.run_import_pipeline(bundle.id)

    # Đọc lại từ DB (pipeline commit qua SessionLocal — cùng DB).
    await db_session.refresh(bundle)
    assert bundle.bundle_status == "done"

    # Parser-first: answer PDF có citation [1] → claim tách từ parser, KHÔNG gọi LLM extract.
    assert provider.extract_called is False
    # Domain + title được truyền vào pre_score.
    assert provider.last_title  # title không rỗng
    assert provider.last_domain is not None
    # source_context phải chứa URL nguồn (từ source_ref_pdf) để LLM tra SQ theo tên miền,
    # không phải bịa — URL "https://example.com/source-1" từ _ref_pdf_bytes().
    assert "https://example.com/source-1" in provider.last_source_context
    assert "URL:" in provider.last_source_context

    parent = (
        await db_session.execute(select(ParentTask).where(ParentTask.bundle_id == bundle.id))
    ).scalar_one()
    assert parent.total_claims == 1
    # domain_key lưu trong metadata_json (không migration).
    assert parent.metadata_json.get("domain_key")

    sources = (
        await db_session.execute(
            select(SourceReference).where(SourceReference.parent_task_id == parent.id)
        )
    ).scalars().all()
    assert len(sources) >= 1

    claims = (
        await db_session.execute(
            select(ClaimTask).where(ClaimTask.parent_task_id == parent.id)
        )
    ).scalars().all()
    assert len(claims) == 1
    claim = claims[0]

    maps = (
        await db_session.execute(
            select(ClaimSourceMap).where(ClaimSourceMap.claim_id == claim.id)
        )
    ).scalars().all()
    assert len(maps) == 1
    assert maps[0].is_primary_source is True

    pre = (
        await db_session.execute(
            select(LlmPreScore).where(LlmPreScore.claim_id == claim.id)
        )
    ).scalar_one()
    assert float(pre.sf) == 0.75
    # SQ do rule engine (Hướng A): nguồn test có source_text rỗng → parse_status 'unparsed'
    # → cap 0.49 (BR-SQ-04), thắng cả base/floor.
    assert float(pre.sq) == 0.49
    # composite = trung bình 6 chiều = (0.75*5 + 0.49)/6 = 0.7066 → round 0.71.
    assert float(pre.composite_score) == 0.71
    assert pre.raw_response_reference == "fake-ref-1"
    # fact_check_status (extra) lưu vào rationale_json["_meta"] (ADR 0008).
    assert pre.rationale_json["_meta"]["fact_check_status"] == "XAC NHAN"
    # SQ signals cho FE (Hướng B): domain_class + needs_review.
    assert pre.rationale_json["_meta"]["sq_domain_class"] == "general"
    assert pre.rationale_json["_meta"]["sq_needs_review"] is True  # unparsed
    # prompt_version_used từ PreScoreResult.prompt_version_used, không hard-code "pre_score_v1".
    assert pre.prompt_version == "pre_score_law_v1"


async def test_pipeline_idempotent_on_rerun(
    db_session, pipeline_bundle, pipeline_sessionmaker, monkeypatch
):
    """Chạy lại pipeline không tạo trùng claim/pre-score (idempotent — EC-LLM-004)."""
    bundle = pipeline_bundle["bundle"]
    storage = _FakeStorage(pipeline_bundle["storage_map"])
    monkeypatch.setattr(import_pipeline, "get_storage", lambda: storage)
    monkeypatch.setattr(import_pipeline, "get_llm_provider", lambda *a, **k: _FakeProvider())

    await import_pipeline.run_import_pipeline(bundle.id)
    await import_pipeline.run_import_pipeline(bundle.id)

    parent = (
        await db_session.execute(select(ParentTask).where(ParentTask.bundle_id == bundle.id))
    ).scalar_one()  # vẫn đúng 1 parent
    claims = (
        await db_session.execute(
            select(ClaimTask).where(ClaimTask.parent_task_id == parent.id)
        )
    ).scalars().all()
    assert len(claims) == 1
    pre = (
        await db_session.execute(
            select(LlmPreScore).where(LlmPreScore.claim_id == claims[0].id)
        )
    ).scalars().all()
    assert len(pre) == 1
