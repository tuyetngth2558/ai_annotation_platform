"""Schemas cho import_bundle feature.

Flow: UploadFile → ValidateBundle → PreviewParse → ConfirmImport → BundleStatus
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# Step 1: Upload single file
# ---------------------------------------------------------------------------

PdfFileRole = Literal["answer_pdf", "source_ref_pdf", "source_content_pdf"]


class UploadFileOut(BaseModel):
    file_id: uuid.UUID
    original_filename: str
    file_role: PdfFileRole
    file_size_bytes: int
    upload_token: str           # opaque token để group files vào 1 bundle (session-scoped)


# ---------------------------------------------------------------------------
# Step 2: Validate bundle (group by upload_token)
# ---------------------------------------------------------------------------

class ValidateBundleIn(BaseModel):
    project_id: uuid.UUID
    upload_token: str = Field(min_length=1)
    bundle_name: str = Field(min_length=1, max_length=200)

    @field_validator("bundle_name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class FileValidationItem(BaseModel):
    file_id: uuid.UUID
    original_filename: str
    file_role: PdfFileRole
    file_size_bytes: int
    is_valid: bool
    errors: list[str] = Field(default_factory=list)


class ValidateBundleOut(BaseModel):
    upload_token: str
    bundle_name: str
    is_valid: bool
    files: list[FileValidationItem]
    errors: list[str] = Field(default_factory=list)     # bundle-level errors
    warnings: list[str] = Field(default_factory=list)   # bundle-level warnings


# ---------------------------------------------------------------------------
# Step 3: Preview parse (answer_pdf + source_ref_pdf)
# ---------------------------------------------------------------------------

class PreviewParseIn(BaseModel):
    project_id: uuid.UUID
    upload_token: str = Field(min_length=1)


class CitationItem(BaseModel):
    index: int
    citation_text: str   # [1] hoặc [src_vinmec_com_000]
    paragraph_preview: str


class SectionPreview(BaseModel):
    heading: str
    claim_count: int
    sample_claims: list[str] = Field(default_factory=list)  # tối đa 2 câu đầu


class SourceRefItem(BaseModel):
    index: int
    url: str
    source_text: str
    page: int


class ParseWarning(BaseModel):
    warning_code: str
    message: str


class PreviewParseOut(BaseModel):
    upload_token: str
    # Từ answer_pdf
    title: str
    citation_format: str        # "law" | "med" | "none"
    total_sections: int
    total_claim_candidates: int
    sections: list[SectionPreview]
    # Từ source_ref_pdf
    source_ref_count: int
    source_refs: list[SourceRefItem]
    # Metadata từ answer PDF
    article_code: str | None
    metadata: dict
    # Tổng hợp cảnh báo
    warnings: list[ParseWarning] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Step 4: Confirm import → tạo batch+bundle+parent_task, enqueue job
# ---------------------------------------------------------------------------

class ConfirmImportIn(BaseModel):
    project_id: uuid.UUID
    upload_token: str = Field(min_length=1)
    bundle_name: str = Field(min_length=1, max_length=200)
    batch_name: str = Field(default="", max_length=200)

    @field_validator("bundle_name", "batch_name")
    @classmethod
    def strip_str(cls, v: str) -> str:
        return v.strip()


class ConfirmImportOut(BaseModel):
    bundle_id: uuid.UUID
    batch_id: uuid.UUID
    bundle_name: str
    status: str             # "queued"
    message: str            # "Đã enqueue xử lý PDF..."
    job_id: str | None      # ARQ job id (None nếu chưa implement ARQ real)


# ---------------------------------------------------------------------------
# Step 5: Bundle status (GET /{bundle_id}/status)
# ---------------------------------------------------------------------------

class BundleStatusOut(BaseModel):
    bundle_id: uuid.UUID
    bundle_name: str
    bundle_status: str      # uploaded | validating | parsing | pre_scoring | done | failed
    article_code: str | None
    title: str | None
    file_count: int
    created_at: datetime
    updated_at: datetime
    error_detail: str | None = None
