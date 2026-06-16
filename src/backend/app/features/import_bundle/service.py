"""Logic nghiệp vụ cho import_bundle feature.

Flow:
1. upload_file  — nhận 1 file PDF, lưu vào storage, ghi PdfFile row, trả về upload_token
2. validate_bundle — kiểm tra group file đủ role (answer + source_ref), size, mime
3. preview_parse — parse answer_pdf + source_ref_pdf, trả preview cho Admin xem trước confirm
4. confirm_import — tạo Batch + PdfBundle + PdfFile rows, enqueue background job
5. get_bundle_status — đọc trạng thái bundle từ DB
"""

from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants import Role
from app.core.exceptions import AppError, NotFoundError
from app.core.logging import get_logger
from app.features.audit.service import write_audit_log
from app.features.import_bundle.pdf_parser import parse_answer_pdf
from app.features.import_bundle.ref_parser import parse_source_ref_pdf
from app.features.import_bundle.schemas import (
    BundleStatusOut,
    ConfirmImportIn,
    ConfirmImportOut,
    FileValidationItem,
    ParseWarning,
    PreviewParseIn,
    PreviewParseOut,
    SectionPreview,
    SourceRefItem,
    UploadFileOut,
    ValidateBundleIn,
    ValidateBundleOut,
)
from app.integrations.storage import get_storage
from app.integrations.storage.base import validate_storage_key
from app.jobs.settings import get_arq_pool
from app.models.batch import Batch
from app.models.bundle import PdfBundle
from app.models.pdf_file import PdfFile

logger = get_logger(__name__)

# Các role bắt buộc trong 1 bundle đầy đủ (VR-BUNDLE-001)
_REQUIRED_ROLES = {"answer_pdf", "source_ref_pdf"}
# Giới hạn kích thước file: 50 MB
_MAX_FILE_SIZE = 50 * 1024 * 1024
# MIME types hợp lệ
_VALID_MIMES = {"application/pdf", "application/x-pdf"}


# ---------------------------------------------------------------------------
# Step 1: Upload single file
# ---------------------------------------------------------------------------

async def _resolve_user_id(user_id: str, db: AsyncSession) -> uuid.UUID | None:
    """Verify uploader tồn tại theo user_id (JWT subject = str(user.id))."""
    from app.models.user import UserAccount
    result = await db.execute(select(UserAccount).where(UserAccount.id == user_id))
    user = result.scalar_one_or_none()
    return user.id if user else None


async def upload_file(
    *,
    file_data: bytes,
    original_filename: str,
    file_role: str,
    mime_type: str,
    project_id: uuid.UUID,
    uploader_subject: str,
    db: AsyncSession,
) -> UploadFileOut:
    """Lưu 1 PDF vào storage, ghi PdfFile tạm (chưa có bundle_id), trả upload_token."""
    # Validate size
    if len(file_data) > _MAX_FILE_SIZE:
        raise AppError(
            f"File {original_filename!r} vượt quá 50 MB (VR-UP-004).",
            code="file_too_large",
        )

    # Validate mime
    normalized_mime = mime_type.lower().split(";")[0].strip()
    if normalized_mime not in _VALID_MIMES:
        raise AppError(
            f"File {original_filename!r} không phải PDF (mime: {mime_type!r}).",
            code="invalid_mime",
        )

    file_id = uuid.uuid4()
    upload_token = secrets.token_urlsafe(24)

    # Key trong storage: projects/<project_id>/tmp/<upload_token>/<file_id>_<filename>
    safe_name = original_filename.replace("/", "_").replace("\\", "_")
    storage_key = validate_storage_key(
        f"projects/{project_id}/tmp/{upload_token}/{file_id}_{safe_name}"
    )

    storage = get_storage()
    await storage.put(storage_key, file_data, content_type="application/pdf")

    # bundle_id = None vì bundle chưa được tạo (staging). Set sau khi confirm_import.
    # Migration d4e5f6a7b8c9 đã đổi column sang nullable=True.
    db_file = PdfFile(
        id=file_id,
        bundle_id=None,
        file_role=file_role,
        original_filename=original_filename,
        storage_path=storage_key,
        mime_type=normalized_mime,
        file_size_bytes=len(file_data),
        parse_status="pending",
    )
    db.add(db_file)
    await db.commit()

    logger.info(
        "upload_file: file_id=%s role=%s size=%d uploader=%s",
        file_id,
        file_role,
        len(file_data),
        uploader_subject,
    )

    # upload_token encode cả file_id để client group lại
    # Format: "<upload_token>:<file_id>"  (opaque từ phía client)
    composite_token = f"{upload_token}:{file_id}"

    return UploadFileOut(
        file_id=file_id,
        original_filename=original_filename,
        file_role=file_role,
        file_size_bytes=len(file_data),
        upload_token=composite_token,
    )


# ---------------------------------------------------------------------------
# Step 2: Validate bundle
# ---------------------------------------------------------------------------

def _parse_upload_tokens(raw_tokens: list[str]) -> list[uuid.UUID]:
    """Tách file_id từ composite token list."""
    file_ids: list[uuid.UUID] = []
    for t in raw_tokens:
        try:
            _, fid_str = t.rsplit(":", 1)
            file_ids.append(uuid.UUID(fid_str))
        except (ValueError, AttributeError) as exc:
            raise AppError(f"upload_token không hợp lệ: {t!r}", code="invalid_token") from exc
    return file_ids


async def validate_bundle(
    payload: ValidateBundleIn,
    *,
    upload_tokens: list[str],
    db: AsyncSession,
) -> ValidateBundleOut:
    """Kiểm tra group file đủ role, không trùng, size OK."""
    file_ids = _parse_upload_tokens(upload_tokens)

    # Load PdfFile rows từ DB
    result = await db.execute(
        select(PdfFile).where(PdfFile.id.in_(file_ids))
    )
    db_files = result.scalars().all()
    found_ids = {f.id for f in db_files}

    bundle_errors: list[str] = []
    bundle_warnings: list[str] = []
    file_items: list[FileValidationItem] = []
    roles_found: set[str] = set()

    for fid in file_ids:
        if fid not in found_ids:
            bundle_errors.append(f"File ID {fid} không tìm thấy — đã hết hạn hoặc sai token.")

    # Prefix kiểm tra ownership — storage_path có dạng projects/<project_id>/...
    expected_prefix = f"projects/{payload.project_id}/"

    for db_file in db_files:
        errs: list[str] = []
        # #1 Cross-project check: ngăn Admin dự án A dùng file_id của dự án B
        if not db_file.storage_path.startswith(expected_prefix):
            raise AppError(
                f"File {db_file.id} không thuộc dự án này.",
                code="project_mismatch",
                status_code=403,
            )
        if db_file.file_size_bytes and db_file.file_size_bytes > _MAX_FILE_SIZE:
            errs.append("Vượt quá 50 MB (VR-UP-004).")
        if db_file.mime_type and db_file.mime_type not in _VALID_MIMES:
            errs.append(f"MIME không hợp lệ: {db_file.mime_type}.")

        roles_found.add(db_file.file_role)
        file_items.append(FileValidationItem(
            file_id=db_file.id,
            original_filename=db_file.original_filename,
            file_role=db_file.file_role,
            file_size_bytes=db_file.file_size_bytes or 0,
            is_valid=len(errs) == 0,
            errors=errs,
        ))

    # Kiểm tra role bắt buộc (VR-BUNDLE-001)
    missing = _REQUIRED_ROLES - roles_found
    if missing:
        bundle_errors.append(f"Bundle thiếu file role: {', '.join(sorted(missing))}.")

    # Kiểm tra role trùng
    role_list = [f.file_role for f in db_files]
    for role in _REQUIRED_ROLES:
        if role_list.count(role) > 1:
            bundle_errors.append(f"Có nhiều hơn 1 file với role {role!r} — chỉ cho phép 1.")

    is_valid = len(bundle_errors) == 0 and all(f.is_valid for f in file_items)

    return ValidateBundleOut(
        upload_token=payload.upload_token,
        bundle_name=payload.bundle_name,
        is_valid=is_valid,
        files=file_items,
        errors=bundle_errors,
        warnings=bundle_warnings,
    )


# ---------------------------------------------------------------------------
# Step 3: Preview parse
# ---------------------------------------------------------------------------

async def preview_parse(
    payload: PreviewParseIn,
    *,
    upload_tokens: list[str],
    project_id: uuid.UUID,
    db: AsyncSession,
) -> PreviewParseOut:
    """Parse answer_pdf + source_ref_pdf — trả preview để Admin xem trước confirm."""
    file_ids = _parse_upload_tokens(upload_tokens)

    result = await db.execute(
        select(PdfFile).where(PdfFile.id.in_(file_ids))
    )
    all_files = result.scalars().all()

    # #1 Cross-project check cho preview
    expected_prefix = f"projects/{project_id}/"
    for f in all_files:
        if not f.storage_path.startswith(expected_prefix):
            raise AppError(
                f"File {f.id} không thuộc dự án này.",
                code="project_mismatch",
                status_code=403,
            )

    db_files = {f.file_role: f for f in all_files}
    answer_file = db_files.get("answer_pdf")
    ref_file = db_files.get("source_ref_pdf")

    if not answer_file:
        raise AppError("Không tìm thấy answer_pdf trong bundle.", code="missing_answer_pdf")

    storage = get_storage()

    # Parse answer PDF
    answer_data = await storage.get(answer_file.storage_path)
    try:
        answer_result = parse_answer_pdf(answer_data)
    except Exception as e:
        raise AppError(str(e), code="pdf_parse_error") from e

    # Parse source_ref PDF — #3: chỉ gọi 1 lần, tái dùng ref_result cho warnings
    source_items: list[SourceRefItem] = []
    source_count = 0
    ref_result = None
    if ref_file:
        ref_data = await storage.get(ref_file.storage_path)
        try:
            ref_result = parse_source_ref_pdf(ref_data)
        except Exception as e:
            # #4: wrap lỗi thư viện fitz thành 400 thay để tránh HTTP 500
            raise AppError(
                f"Lỗi parse source_ref PDF: {e}",
                code="ref_pdf_parse_error",
            ) from e
        source_count = ref_result.url_count
        source_items = [
            SourceRefItem(
                index=it.index,
                url=it.url,
                source_text=it.source_text,
                page=it.page,
            )
            for it in ref_result.items[:20]  # tối đa 20 item trong preview
        ]

    # Build section previews
    section_previews: list[SectionPreview] = []
    total_claims = 0
    for sec in answer_result.sections:
        n = len(sec.paragraphs)
        total_claims += n
        sample = [
            p.text[:120] + "..." if len(p.text) > 120 else p.text
            for p in sec.paragraphs[:2]
        ]
        section_previews.append(SectionPreview(
            heading=sec.heading,
            claim_count=n,
            sample_claims=sample,
        ))

    # Tổng hợp warnings — #3: tái dùng ref_result đã parse, không gọi lại
    all_warnings = [
        ParseWarning(warning_code=w["warning_code"], message=w["message"])
        for w in answer_result.warnings
    ]
    if ref_result is not None:
        all_warnings += [
            ParseWarning(warning_code=w["warning_code"], message=w["message"])
            for w in ref_result.warnings
        ]

    return PreviewParseOut(
        upload_token=payload.upload_token,
        title=answer_result.title,
        citation_format=answer_result.citation_format,
        total_sections=len(section_previews),
        total_claim_candidates=total_claims,
        sections=section_previews,
        source_ref_count=source_count,
        source_refs=source_items,
        article_code=answer_result.metadata.get("article_code"),
        metadata=answer_result.metadata,
        warnings=all_warnings,
    )


# ---------------------------------------------------------------------------
# Step 4: Confirm import
# ---------------------------------------------------------------------------

async def confirm_import(
    payload: ConfirmImportIn,
    *,
    upload_tokens: list[str],
    uploader_subject: str,
    db: AsyncSession,
    user_role: Role | None = None,
    client_ip: str | None = None,
) -> ConfirmImportOut:
    """Tạo Batch + PdfBundle + gán bundle_id cho PdfFile rows, enqueue ARQ job."""
    file_ids = _parse_upload_tokens(upload_tokens)
    uploader_id = await _resolve_user_id(uploader_subject, db)

    # Cross-project check TRƯỚC khi tạo Batch/Bundle — tránh partial write khi raise.
    result = await db.execute(select(PdfFile).where(PdfFile.id.in_(file_ids)))
    db_files = result.scalars().all()
    expected_prefix = f"projects/{payload.project_id}/"
    for f in db_files:
        if not f.storage_path.startswith(expected_prefix):
            raise AppError(
                f"File {f.id} không thuộc dự án này.",
                code="project_mismatch",
                status_code=403,
            )

    # Tạo Batch
    batch_name = payload.batch_name or f"Batch {datetime.now(UTC).strftime('%Y%m%d-%H%M')}"
    batch = Batch(
        project_id=payload.project_id,
        batch_name=batch_name,
        import_type="pdf_bundle",
        total_bundles=1,
        valid_bundles=0,
        invalid_bundles=0,
    )
    db.add(batch)
    await db.flush()  # lấy batch.id

    # Tạo PdfBundle
    bundle = PdfBundle(
        batch_id=batch.id,
        bundle_name=payload.bundle_name,
        bundle_status="uploaded",
        uploaded_by=uploader_id,
    )
    db.add(bundle)
    await db.flush()  # lấy bundle.id

    for f in db_files:
        f.bundle_id = bundle.id

    # Audit import (BR-2.3 / BR-10.2) — cùng transaction tạo batch+bundle (AC-10.1).
    await write_audit_log(
        db,
        action_type="import",
        entity_type="pdf_bundle",
        entity_id=bundle.id,
        project_id=payload.project_id,
        user_id=uploader_id,
        user_role=user_role,
        description=(
            f"Admin import bundle '{payload.bundle_name}' "
            f"(batch={batch_name}, files={len(db_files)})"
        ),
        client_ip=client_ip,
    )

    await db.commit()

    # Enqueue background job xử lý PDF (parse → claim extraction → pre-scoring).
    # Lỗi enqueue (Redis down) không rollback bundle đã tạo — Admin có thể re-trigger;
    # job_id=None để client biết job chưa được nhận.
    job_id: str | None = None
    try:
        pool = await get_arq_pool()
        job = await pool.enqueue_job("process_bundle", str(bundle.id))
        job_id = job.job_id if job else None
    except Exception as exc:  # noqa: BLE001 — không để lỗi enqueue làm fail confirm
        logger.error("confirm_import: enqueue job lỗi cho bundle %s: %s", bundle.id, exc)

    logger.info(
        "confirm_import: bundle_id=%s batch_id=%s files=%d",
        bundle.id,
        batch.id,
        len(db_files),
    )

    return ConfirmImportOut(
        bundle_id=bundle.id,
        batch_id=batch.id,
        bundle_name=bundle.bundle_name,
        status="queued",
        message="Đã tạo bundle. Job xử lý PDF sẽ chạy trong nền.",
        job_id=job_id,
    )


# ---------------------------------------------------------------------------
# Step 5: Bundle status
# ---------------------------------------------------------------------------

async def get_bundle_status(bundle_id: uuid.UUID, *, db: AsyncSession) -> BundleStatusOut:
    result = await db.execute(
        select(PdfBundle)
        .where(PdfBundle.id == bundle_id)
        .options(selectinload(PdfBundle.files))
    )
    bundle = result.scalar_one_or_none()
    if bundle is None:
        raise NotFoundError(f"Bundle {bundle_id} không tìm thấy.")

    return BundleStatusOut(
        bundle_id=bundle.id,
        bundle_name=bundle.bundle_name,
        bundle_status=bundle.bundle_status,
        article_code=bundle.article_code,
        title=bundle.title,
        file_count=len(bundle.files),
        created_at=bundle.created_at,
        updated_at=bundle.updated_at,
    )
