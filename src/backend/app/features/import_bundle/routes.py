"""Import Bundle routes — upload PDF bundle, validate, preview, confirm (ADMIN).

Flow: POST /upload-file → POST /validate → POST /preview → POST /confirm → GET /{id}/status
RBAC: chỉ ADMIN (AC mục 1).
API path: /api/v1/import-bundles
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import Role
from app.core.permissions import require_role
from app.core.request_meta import get_client_ip
from app.db.session import get_db
from app.features.auth.deps import CurrentUser, get_current_user
from app.features.import_bundle import service
from app.features.import_bundle.schemas import (
    BundleStatusOut,
    ConfirmImportIn,
    ConfirmImportOut,
    PdfFileRole,
    PreviewParseIn,
    PreviewParseOut,
    UploadFileOut,
    ValidateBundleIn,
    ValidateBundleOut,
)

router = APIRouter(
    prefix="/import-bundles",
    tags=["import"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


@router.post("/upload-file", response_model=UploadFileOut, status_code=201)
async def upload_file(
    file: UploadFile = File(..., description="PDF file"),
    file_role: PdfFileRole = Form(...),
    project_id: uuid.UUID = Form(...),
    current_user: Annotated[CurrentUser, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db),
) -> UploadFileOut:
    """Upload 1 file PDF, nhận upload_token để group vào bundle."""
    file_data = await file.read()
    return await service.upload_file(
        file_data=file_data,
        original_filename=file.filename or "unknown.pdf",
        file_role=file_role,
        mime_type=file.content_type or "application/pdf",
        project_id=project_id,
        uploader_subject=current_user.subject,
        db=db,
    )


@router.post("/validate", response_model=ValidateBundleOut)
async def validate_bundle(
    payload: ValidateBundleIn,
    upload_tokens: list[str] = Query(..., description="Danh sách composite token từ upload-file"),
    db: AsyncSession = Depends(get_db),
) -> ValidateBundleOut:
    """Kiểm tra bundle: đủ role, size, mime (VR-BUNDLE-001 .. VR-UP-008)."""
    return await service.validate_bundle(
        payload,
        upload_tokens=upload_tokens,
        db=db,
    )


@router.post("/preview", response_model=PreviewParseOut)
async def preview_parse(
    payload: PreviewParseIn,
    upload_tokens: list[str] = Query(..., description="Danh sách composite token từ upload-file"),
    db: AsyncSession = Depends(get_db),
) -> PreviewParseOut:
    """Parse preview answer_pdf + source_ref — metadata, sections, source refs, warnings."""
    return await service.preview_parse(
        payload,
        upload_tokens=upload_tokens,
        project_id=payload.project_id,
        db=db,
    )


@router.post("/confirm", response_model=ConfirmImportOut, status_code=202)
async def confirm_import(
    payload: ConfirmImportIn,
    request: Request,
    upload_tokens: list[str] = Query(..., description="Danh sách composite token từ upload-file"),
    current_user: Annotated[CurrentUser, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db),
) -> ConfirmImportOut:
    """Confirm import: tạo Batch + Bundle + PdfFile rows, enqueue background job."""
    return await service.confirm_import(
        payload,
        upload_tokens=upload_tokens,
        uploader_subject=current_user.subject,
        db=db,
        user_role=current_user.role,
        client_ip=get_client_ip(request),
    )


@router.get("/{bundle_id}/status", response_model=BundleStatusOut)
async def get_bundle_status(
    bundle_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> BundleStatusOut:
    """Đọc trạng thái bundle (uploaded → parsing → pre_scoring → done | failed)."""
    return await service.get_bundle_status(bundle_id, db=db)
