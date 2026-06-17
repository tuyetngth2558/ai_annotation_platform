"""Import pipeline — luồng xử lý nền sau khi Admin Confirm Import.

Các bước (Import schema §1-7 / Screen Spec state 'Background Processing'):
  parse PDF → normalize → tạo ParentTask → extract source refs → claim extraction
  → source mapping → LLM pre-scoring

Đặc tính: I/O-bound (chờ LLM) → async; lỗi 1 claim không fail toàn bundle (BR best-effort).
Idempotent theo bundle_id: nếu ParentTask/ClaimTask của bundle đã tồn tại, bước đó được skip
khi job được retry (EC-LLM-004).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.features.import_bundle.pdf_parser import Section, parse_answer_pdf
from app.features.import_bundle.ref_parser import parse_source_ref_pdf
from app.features.import_bundle.sq_engine import compute_sq
from app.integrations.llm.factory import get_llm_provider
from app.integrations.storage import get_storage
from app.models.bundle import PdfBundle
from app.models.claim_source_map import ClaimSourceMap
from app.models.claim_task import ClaimTask
from app.models.parent_task import ParentTask
from app.models.parse_result import PdfParseResult
from app.models.pdf_file import PdfFile
from app.models.source_reference import SourceReference

logger = get_logger(__name__)

# 6 chiều điểm (composite = trung bình đều — BR-7.2). LLM trả 5, SQ do rule engine.
_DIMS = ("sf", "sc", "hr", "sq", "rel", "comp")


class PipelineError(Exception):
    """Lỗi không phục hồi được — toàn bundle phải fail."""


def _claims_from_sections(sections: list[Section]) -> list[dict]:
    """Tách claim từ paragraph parser (mỗi paragraph có citation = 1 claim).

    Trả về list dict cùng shape với LLM extract_claims (claim_order, section_name,
    claim_text, citation_markers, source_order_candidates) để dùng chung downstream.
    citation_markers [n] vừa là marker vừa là source_order_candidates (map nguồn theo số).
    """
    raw_claims: list[dict] = []
    order = 0
    for sec in sections:
        for para in sec.paragraphs:
            text = (para.text or "").strip()
            if not text:
                continue
            order += 1
            markers = [str(c) for c in para.citations]
            raw_claims.append(
                {
                    "claim_order": order,
                    "section_name": sec.heading or None,
                    "claim_text": text,
                    "citation_markers": markers,
                    "source_order_candidates": list(para.citations),
                }
            )
    return raw_claims


async def run_import_pipeline(bundle_id: uuid.UUID) -> None:
    """Chạy toàn bộ pipeline cho 1 bundle. Idempotent theo bundle_id."""
    logger.info("Bắt đầu import pipeline cho bundle %s", bundle_id)

    async with SessionLocal() as db:
        try:
            await _run(bundle_id, db)
        except Exception as exc:
            logger.error("Pipeline lỗi cho bundle %s: %s", bundle_id, exc)
            try:
                await db.rollback()
                bundle = await db.get(PdfBundle, bundle_id, populate_existing=True)
                if bundle:
                    bundle.bundle_status = "failed"
                    bundle.metadata_json = {
                        **(bundle.metadata_json or {}),
                        "error_detail": str(exc)[:500],
                    }
                    await db.commit()
            except Exception as inner_exc:
                logger.critical("Không thể cập nhật bundle_status=failed: %s", inner_exc)
            raise


async def _run(bundle_id: uuid.UUID, db: AsyncSession) -> None:
    bundle = await db.get(PdfBundle, bundle_id)
    if bundle is None:
        raise PipelineError(f"Bundle {bundle_id} không tồn tại.")

    files_result = await db.execute(select(PdfFile).where(PdfFile.bundle_id == bundle_id))
    files = files_result.scalars().all()
    files_by_role = {f.file_role: f for f in files}
    content_files = [f for f in files if f.file_role == "source_content_pdf"]

    answer_file = files_by_role.get("answer_pdf")
    ref_file = files_by_role.get("source_ref_pdf")
    if answer_file is None or ref_file is None:
        raise PipelineError("Bundle thiếu answer_pdf hoặc source_ref_pdf.")

    bundle.bundle_status = "parsing"
    await db.commit()

    # 1. Parse PDF — tái dùng parser cấp thấp đã có.
    storage = get_storage()
    answer_bytes = await storage.get(answer_file.storage_path)
    ref_bytes = await storage.get(ref_file.storage_path)
    answer_result = parse_answer_pdf(answer_bytes)
    ref_result = parse_source_ref_pdf(ref_bytes)

    # Lưu raw parse output để debug/trace (DR-002) — idempotent: 1 row / bundle.
    existing_parse = await db.execute(
        select(PdfParseResult).where(PdfParseResult.bundle_id == bundle_id)
    )
    if existing_parse.scalar_one_or_none() is None:
        db.add(
            PdfParseResult(
                bundle_id=bundle_id,
                parser_version=answer_result.parser_version,
                answer_text_raw=answer_result.answer_text_raw,
                answer_text_normalized=answer_result.answer_text_normalized,
                metadata_extracted_json=answer_result.metadata,
                source_list_extracted_json=[
                    {"index": it.index, "url": it.url, "page": it.page}
                    for it in ref_result.items
                ],
                parse_warnings_json=answer_result.warnings + ref_result.warnings,
                parse_status="parsed_with_warnings"
                if (answer_result.warnings or ref_result.warnings)
                else "parsed",
            )
        )
        await db.commit()

    # 2. Tạo ParentTask (idempotent — 1 parent_task / bundle, MVP: quan hệ 1-1).
    existing_parent = await db.execute(
        select(ParentTask).where(ParentTask.bundle_id == bundle_id)
    )
    parent = existing_parent.scalar_one_or_none()
    if parent is None:
        meta = answer_result.metadata
        created_date_str = meta.get("created_date")
        created_date = (
            datetime.strptime(created_date_str, "%Y-%m-%d").date() if created_date_str else None
        )
        parent = ParentTask(
            bundle_id=bundle_id,
            batch_id=bundle.batch_id,
            article_code=meta.get("article_code"),
            title=answer_result.title,
            category=meta.get("category"),
            tier=meta.get("tier"),
            confidence_score=meta.get("confidence_score"),
            created_date=created_date,
            answer_text_normalized=answer_result.answer_text_normalized,
            status="ready_for_claim_extraction",
            metadata_json=meta,
        )
        db.add(parent)
        await db.flush()

    bundle.article_code = parent.article_code
    bundle.title = parent.title

    # 3. Tạo SourceReference từ source_ref_pdf (idempotent theo parent_task_id).
    existing_sources = await db.execute(
        select(SourceReference).where(SourceReference.parent_task_id == parent.id)
    )
    sources = list(existing_sources.scalars().all())
    if not sources:
        for item in ref_result.items:
            source_file = (
                content_files[item.index - 1] if item.index - 1 < len(content_files) else None
            )
            title = (item.source_text or item.url or f"Nguồn {item.index}").splitlines()[0][:200]
            src = SourceReference(
                parent_task_id=parent.id,
                source_order=item.index,
                source_title=title,
                source_tier="unknown",
                source_url=item.url or None,
                source_file_id=source_file.id if source_file else None,
                source_text_extract=item.source_text or None,
                source_parse_status="parsed" if item.source_text else "unparsed",
            )
            db.add(src)
            sources.append(src)
        await db.flush()

    sources_by_order = {s.source_order: s for s in sources}

    # 4. Claim extraction PARSER-FIRST (idempotent theo parent_task_id).
    #    Answer PDF đã tách paragraph theo citation [n] → mỗi paragraph = 1 claim, không cần
    #    LLM. Chỉ fallback gọi LLM khi parser ra 0 claim (PDF không có citation rõ).
    existing_claims = await db.execute(
        select(ClaimTask).where(ClaimTask.parent_task_id == parent.id)
    )
    claims = list(existing_claims.scalars().all())
    if not claims:
        raw_claims = _claims_from_sections(answer_result.sections)
        if not raw_claims:
            logger.info("Parser không tách được claim — fallback LLM extract_claims.")
            provider = get_llm_provider()
            raw_claims = await provider.extract_claims(
                answer_result.answer_text_normalized or "",
                prompt_version="claim_extraction_v1",
            )
        if not raw_claims:
            raise PipelineError("Claim extraction không trả về claim nào (VR-CE-001).")

        seen_orders: set[int] = set()
        claim_raw_pairs: list[tuple[ClaimTask, dict]] = []
        for raw in raw_claims:
            claim_text = (raw.get("claim_text") or "").strip()
            if not claim_text:
                continue
            order = int(raw.get("claim_order") or len(seen_orders) + 1)
            if order in seen_orders:
                order = max(seen_orders) + 1
            seen_orders.add(order)

            markers = raw.get("citation_markers") or []
            claim = ClaimTask(
                parent_task_id=parent.id,
                claim_order=order,
                section_name=raw.get("section_name") or None,
                claim_text_original=claim_text,
                claim_text_final=claim_text,
                citation_markers=";".join(str(m) for m in markers) if markers else None,
                status="ready",
            )
            db.add(claim)
            claims.append(claim)
            claim_raw_pairs.append((claim, raw))
        await db.flush()

        parent.total_claims = len(claims)
        bundle.bundle_status = "pre_scoring"
        await db.commit()

        # 5. Source mapping — map citation_markers/source_order_candidates → SourceReference.
        for claim, raw in claim_raw_pairs:
            candidates = raw.get("source_order_candidates") or []
            for i, order in enumerate(candidates):
                source = sources_by_order.get(int(order))
                if source is None:
                    continue
                db.add(
                    ClaimSourceMap(
                        claim_id=claim.id,
                        source_id=source.id,
                        mapping_method="citation",
                        is_primary_source=(i == 0),
                    )
                )
        await db.commit()

    # 6. LLM pre-scoring — best-effort: lỗi 1 claim không fail toàn bundle.
    domain_key = (parent.metadata_json or {}).get("domain_key")
    await _pre_score_claims(claims, sources_by_order, db, domain=domain_key, title=parent.title)

    bundle.bundle_status = "done"
    await db.commit()
    logger.info("Pipeline hoàn tất cho bundle %s: %d claim.", bundle_id, len(claims))


_SOURCE_CONTEXT_LIMIT = 3       # tối đa 3 nguồn/claim — tránh context noise
_SOURCE_CONTEXT_MAX_CHARS = 4000  # tối đa 4000 ký tự — tránh blast text


def _format_source_block(source: SourceReference) -> str:
    """Format 1 nguồn thành block có URL + tiêu đề + text trích.

    URL được đưa vào để LLM tra bảng SQ theo tên miền (ADR 0008) — URL là THẬT,
    parse từ source_ref_pdf, không để LLM bịa. Nếu không có URL → ghi rõ "(không có URL)".
    """
    url = source.source_url or "(không có URL)"
    title = source.source_title or f"Nguồn {source.source_order}"
    text = source.source_text_extract or "(không trích được nội dung)"
    return f"[Nguồn {source.source_order}] URL: {url}\nTiêu đề: {title}\nNội dung:\n{text}"


def _build_source_context(sources: list[SourceReference]) -> str:
    """Nối các block nguồn (đã gắn URL/tiêu đề) thành source_context, cắt theo giới hạn."""
    context = "\n\n---\n\n".join(_format_source_block(s) for s in sources)
    return context[:_SOURCE_CONTEXT_MAX_CHARS]


async def _pre_score_claims(
    claims: list[ClaimTask],
    sources_by_order: dict[int, SourceReference],
    db: AsyncSession,
    *,
    domain: str | None = None,
    title: str | None = None,
) -> None:
    from app.models.llm_pre_score import LlmPreScore

    provider = get_llm_provider()
    failed = 0
    sources_by_id = {s.id: s for s in sources_by_order.values()}

    for claim in claims:
        existing = await db.execute(
            select(LlmPreScore).where(LlmPreScore.claim_id == claim.id)
        )
        if existing.scalar_one_or_none() is not None:
            continue  # đã chấm rồi (retry) — immutable, không chấm lại (BR-5.1)

        map_result = await db.execute(
            select(ClaimSourceMap).where(ClaimSourceMap.claim_id == claim.id)
        )
        maps = map_result.scalars().all()
        mapped_sources = [
            sources_by_id[m.source_id] for m in maps if m.source_id in sources_by_id
        ]
        if not mapped_sources:
            # Fallback: dùng tối đa 3 nguồn đầu để tránh noise/blast text.
            mapped_sources = list(sources_by_order.values())[:_SOURCE_CONTEXT_LIMIT]
        source_context = _build_source_context(mapped_sources)

        try:
            result = await provider.pre_score(
                claim.claim_text_final or claim.claim_text_original,
                source_context,
                prompt_version="pre_score_v1",
                domain=domain,
                title=title,
            )
        except Exception as exc:  # noqa: BLE001 — best-effort theo claim
            logger.warning("Pre-score lỗi cho claim %s: %s", claim.id, exc)
            failed += 1
            continue

        # SQ rule engine (Hướng A) — KHÔNG hỏi LLM. Dùng nguồn primary (đầu danh sách map).
        primary = mapped_sources[0] if mapped_sources else None
        sq_result = compute_sq(
            source_url=primary.source_url if primary else None,
            source_tier=primary.source_tier if primary else None,
            parse_status=primary.source_parse_status if primary else None,
        )
        scores = {**result.scores, "sq": sq_result.sq}  # ghép SQ vào 5 chiều LLM → đủ 6
        composite = round(sum(scores[d] for d in _DIMS) / 6, 2)

        # rationale_json = rationale các chiều + sq rule + _meta (fact_check, sq signals).
        rationale_json: dict = dict(result.rationales)
        rationale_json["sq"] = sq_result.rationale
        meta = dict(result.extra)
        meta["sq_domain_class"] = sq_result.domain_class
        meta["sq_tier"] = sq_result.tier
        meta["sq_needs_review"] = sq_result.needs_review
        rationale_json["_meta"] = meta
        db.add(
            LlmPreScore(
                claim_id=claim.id,
                provider=type(provider).__name__,
                model=getattr(provider, "_model", "mock"),
                # Dùng version thực tế từ PromptSpec (theo domain) thay vì hard-code.
                prompt_version=result.prompt_version_used,
                sf=scores["sf"],
                sc=scores["sc"],
                hr=scores["hr"],
                sq=scores["sq"],
                rel=scores["rel"],
                comp=scores["comp"],
                composite_score=composite,
                rationale_json=rationale_json,
                raw_response_reference=result.raw_response_reference,
            )
        )
    await db.commit()

    if failed:
        logger.warning("%d/%d claim pre-score lỗi cho bundle.", failed, len(claims))
