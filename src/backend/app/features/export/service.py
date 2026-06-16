"""Export service -- tao CSV claim-level tu approved claims (BR-9.1).

Columns theo §10 Import/Export Schema v0.4.
Export sync (in-memory CSV) -- du cho MVP. ARQ async export la TODO sau.

Rules:
- BR-9.1: chi export claim co status='approved'
- BR-9.2: UTF-8, quoting chuan
- DRD-005: moi row phai trace ve bundle_id + file name goc
"""

from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants import ClaimStatus
from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.models.batch import Batch
from app.models.bundle import PdfBundle
from app.models.claim_source_map import ClaimSourceMap
from app.models.claim_task import ClaimTask
from app.models.parent_task import ParentTask
from app.models.pdf_file import PdfFile

logger = get_logger(__name__)

# Cac column theo §10 Export CSV Schema (theo thu tu)
_CSV_COLUMNS = [
    "project_id",
    "batch_id",
    "bundle_id",
    "answer_pdf_filename",
    "source_ref_pdf_filename",
    "article_code",
    "parent_task_id",
    "answer_reference",
    "title",
    "category",
    "confidence_score",
    "claim_id",
    "claim_order",
    "section_name",
    "claim_text_original",
    "claim_text_final",
    "citation_markers",
    "mapped_source_orders",
    "mapped_source_titles",
    "source_tiers",
    "source_file_refs",
    "source_parse_status",
    "source_access_status",
    "source_note",
    "pre_sf", "pre_sc", "pre_hr", "pre_sq", "pre_rel", "pre_comp",
    "ann_sf", "ann_sc", "ann_hr", "ann_sq", "ann_rel", "ann_comp",
    "composite_score",
    "annotator_id",
    "annotator_note",
    "qa_id",
    "qa_decision",
    "qa_comment",
    "status",
    "submitted_at",
    "reviewed_at",
]


def _fmt(v: object) -> str:
    if v is None:
        return ""
    if isinstance(v, datetime):
        return v.isoformat()
    return str(v)


async def build_export_csv(
    project_id: uuid.UUID,
    *,
    batch_id: uuid.UUID | None = None,
    db: AsyncSession,
) -> bytes:
    """Tao CSV bytes chua tat ca approved claim cua project (hoac 1 batch cu the).

    Raise AppError neu khong co claim nao approved.
    """
    # SQL JOIN filter theo project (+ optional batch) -- tranh load toan bo DB vao memory
    stmt = (
        select(ClaimTask)
        .join(ClaimTask.parent_task)
        .join(ParentTask.bundle)
        .join(PdfBundle.batch)
        .where(
            ClaimTask.status == ClaimStatus.APPROVED,
            Batch.project_id == project_id,
        )
        .options(
            selectinload(ClaimTask.pre_scores),
            selectinload(ClaimTask.submissions),
            selectinload(ClaimTask.qa_reviews),
            selectinload(ClaimTask.source_maps).selectinload(ClaimSourceMap.source),
            selectinload(ClaimTask.parent_task).selectinload(ParentTask.bundle).selectinload(
                PdfBundle.files
            ),
            selectinload(ClaimTask.parent_task).selectinload(ParentTask.bundle).selectinload(
                PdfBundle.batch
            ),
        )
        .order_by(ClaimTask.submitted_at.asc())
    )
    if batch_id:
        stmt = stmt.where(PdfBundle.batch_id == batch_id)

    result = await db.execute(stmt.execution_options(populate_existing=True))
    claims = result.scalars().all()

    if not claims:
        raise AppError(
            "Khong co claim nao da approved trong project nay.",
            code="no_approved_claims",
        )

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=_CSV_COLUMNS,
        quoting=csv.QUOTE_ALL,
        lineterminator="\r\n",
    )
    writer.writeheader()

    for claim in claims:
        parent: ParentTask | None = claim.parent_task
        bundle: PdfBundle | None = parent.bundle if parent else None
        batch: Batch | None = bundle.batch if bundle else None

        # File names theo role
        files: list[PdfFile] = bundle.files if bundle else []
        answer_fn = next((f.original_filename for f in files if f.file_role == "answer_pdf"), "")
        ref_fn = next((f.original_filename for f in files if f.file_role == "source_ref_pdf"), "")

        # Latest pre-score
        pre = (
            sorted(claim.pre_scores, key=lambda p: p.created_at)[-1]
            if claim.pre_scores else None
        )

        # Latest submitted annotation
        submitted_subs = [s for s in claim.submissions if s.status == "submitted"]
        sub = (
            sorted(submitted_subs, key=lambda s: s.submitted_at or s.created_at)[-1]
            if submitted_subs else None
        )

        # Latest QA review — claim đã APPROVED nên chỉ cần latest review
        qa_rev = (
            sorted(claim.qa_reviews, key=lambda r: r.reviewed_at or r.created_at)[-1]
            if claim.qa_reviews else None
        )

        # Source maps
        source_orders = ";".join(
            str(m.source.source_order) for m in claim.source_maps if m.source
        )
        source_titles = ";".join(
            m.source.source_title for m in claim.source_maps if m.source
        )
        source_tiers = ";".join(
            (m.source.source_tier or "") for m in claim.source_maps if m.source
        )
        source_file_refs = ";".join(
            str(m.source.source_file_id)
            for m in claim.source_maps
            if m.source and m.source.source_file_id
        )
        source_parse_statuses = ";".join(
            m.source.source_parse_status for m in claim.source_maps if m.source
        )
        source_access_statuses_str = ";".join(
            m.source.access_status for m in claim.source_maps if m.source
        )

        row = {
            "project_id": _fmt(batch.project_id if batch else None),
            "batch_id": _fmt(bundle.batch_id if bundle else None),
            "bundle_id": _fmt(bundle.id if bundle else None),
            "answer_pdf_filename": answer_fn,
            "source_ref_pdf_filename": ref_fn,
            "article_code": _fmt(parent.article_code if parent else None),
            "parent_task_id": _fmt(claim.parent_task_id),
            "answer_reference": _fmt(parent.answer_reference if parent else None),
            "title": _fmt(parent.title if parent else None),
            "category": _fmt(parent.category if parent else None),
            "confidence_score": _fmt(parent.confidence_score if parent else None),
            "claim_id": _fmt(claim.id),
            "claim_order": _fmt(claim.claim_order),
            "section_name": _fmt(claim.section_name),
            "claim_text_original": _fmt(claim.claim_text_original),
            "claim_text_final": _fmt(claim.claim_text_final),
            "citation_markers": _fmt(claim.citation_markers),
            "mapped_source_orders": source_orders,
            "mapped_source_titles": source_titles,
            "source_tiers": source_tiers,
            "source_file_refs": source_file_refs,
            "source_parse_status": source_parse_statuses,
            "source_access_status": (
                source_access_statuses_str or _fmt(sub.source_access_status if sub else None)
            ),
            "source_note": "",
            "pre_sf": _fmt(float(pre.sf) if pre else None),
            "pre_sc": _fmt(float(pre.sc) if pre else None),
            "pre_hr": _fmt(float(pre.hr) if pre else None),
            "pre_sq": _fmt(float(pre.sq) if pre else None),
            "pre_rel": _fmt(float(pre.rel) if pre else None),
            "pre_comp": _fmt(float(pre.comp) if pre else None),
            "ann_sf": _fmt(float(sub.sf) if sub else None),
            "ann_sc": _fmt(float(sub.sc) if sub else None),
            "ann_hr": _fmt(float(sub.hr) if sub else None),
            "ann_sq": _fmt(float(sub.sq) if sub else None),
            "ann_rel": _fmt(float(sub.rel) if sub else None),
            "ann_comp": _fmt(float(sub.comp) if sub else None),
            "composite_score": _fmt(
                float(sub.composite_score) if sub and sub.composite_score else None
            ),
            "annotator_id": _fmt(sub.annotator_id if sub else None),
            "annotator_note": _fmt(sub.annotator_note if sub else None),
            "qa_id": _fmt(qa_rev.qa_id if qa_rev else None),
            "qa_decision": _fmt(qa_rev.decision if qa_rev else None),
            "qa_comment": _fmt(qa_rev.qa_comment if qa_rev else None),
            "status": _fmt(claim.status),
            "submitted_at": _fmt(claim.submitted_at),
            "reviewed_at": _fmt(qa_rev.reviewed_at if qa_rev else None),
        }
        writer.writerow(row)

    logger.info(
        "build_export_csv: project_id=%s claims=%d",
        project_id,
        len(claims),
    )
    return output.getvalue().encode("utf-8-sig")  # utf-8-sig: BOM cho Excel mo duoc
