"""Schemas cho annotation feature.

Annotator flow: GET /tasks → GET /tasks/{id} → PUT /tasks/{id}/autosave → POST /tasks/{id}/submit
RBAC: ANNOTATOR (chỉ task được giao — OQ-008).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.constants import Dimension

# ---------------------------------------------------------------------------
# Shared score block
# ---------------------------------------------------------------------------

SourceAccessStatus = Literal["accessible", "partial", "inaccessible", "not_checked"]


class ScoreBlock(BaseModel):
    """6 chiều điểm annotator nhập (VR-ANN-002/003)."""

    sf: float = Field(ge=0.0, le=1.0)
    sc: float = Field(ge=0.0, le=1.0)
    hr: float = Field(ge=0.0, le=1.0)   # NH trong UI, hr trong DB
    sq: float = Field(ge=0.0, le=1.0)
    rel: float = Field(ge=0.0, le=1.0)
    comp: float = Field(ge=0.0, le=1.0)

    def as_dimension_dict(self) -> dict[Dimension, float]:
        return {
            Dimension.SF: self.sf,
            Dimension.SC: self.sc,
            Dimension.NH: self.hr,
            Dimension.SQ: self.sq,
            Dimension.REL: self.rel,
            Dimension.COMP: self.comp,
        }


class JustificationBlock(BaseModel):
    """Lý do khi lệch ngưỡng ±0.20 so với pre-score (BR-7.3)."""

    sf: str | None = None
    sc: str | None = None
    hr: str | None = None
    sq: str | None = None
    rel: str | None = None
    comp: str | None = None


# ---------------------------------------------------------------------------
# Pre-score read model (immutable, trả kèm task detail — BR-5.1)
# ---------------------------------------------------------------------------

class PreScoreOut(BaseModel):
    pre_score_id: uuid.UUID
    provider: str
    model: str
    sf: float
    sc: float
    hr: float
    sq: float
    rel: float
    comp: float
    composite_score: float | None
    rationale_json: dict | None = None


# ---------------------------------------------------------------------------
# Source reference (hiển thị cùng workspace)
# ---------------------------------------------------------------------------

class SourceRefOut(BaseModel):
    source_id: uuid.UUID
    source_url: str | None
    citation_marker: str | None
    access_status: str | None


# ---------------------------------------------------------------------------
# GET /tasks — danh sách task của annotator
# ---------------------------------------------------------------------------

class TaskListItem(BaseModel):
    claim_id: uuid.UUID
    claim_order: int
    section_name: str | None
    claim_text: str
    status: str
    submitted_at: datetime | None
    parent_task_id: uuid.UUID
    article_code: str | None
    title: str | None


class TaskListOut(BaseModel):
    items: list[TaskListItem]
    total: int


# ---------------------------------------------------------------------------
# GET /tasks/{claim_id} — chi tiết claim + pre-score + sources
# ---------------------------------------------------------------------------

class TaskDetailOut(BaseModel):
    claim_id: uuid.UUID
    claim_order: int
    section_name: str | None
    claim_text: str
    status: str
    citation_markers: str | None
    # Ngữ cảnh bài gốc
    parent_task_id: uuid.UUID
    article_code: str | None
    title: str | None
    answer_context: str | None      # đoạn answer text xung quanh claim (200 ký tự)
    # Pre-score (immutable baseline — BR-5.1)
    pre_score: PreScoreOut | None
    # Nguồn tham khảo liên quan đến claim này
    sources: list[SourceRefOut]
    # Draft hiện tại nếu annotator đang làm dở (autosave)
    draft: DraftOut | None


class DraftOut(BaseModel):
    scores: ScoreBlock | None
    source_access_status: SourceAccessStatus | None
    annotator_note: str | None
    justifications: JustificationBlock | None
    saved_at: datetime | None


# ---------------------------------------------------------------------------
# PUT /tasks/{claim_id}/autosave
# ---------------------------------------------------------------------------

class AutosaveIn(BaseModel):
    scores: ScoreBlock | None = None
    source_access_status: SourceAccessStatus | None = None
    annotator_note: str | None = Field(default=None, max_length=2000)
    justifications: JustificationBlock | None = None


class AutosaveOut(BaseModel):
    claim_id: uuid.UUID
    saved_at: datetime


# ---------------------------------------------------------------------------
# POST /tasks/{claim_id}/submit
# ---------------------------------------------------------------------------

class SubmitIn(BaseModel):
    scores: ScoreBlock
    source_access_status: SourceAccessStatus
    annotator_note: str | None = Field(default=None, max_length=2000)
    justifications: JustificationBlock | None = None
    # pre_scores truyền từ client để validate ngưỡng — server sẽ verify lại từ DB
    # Không expose composite ở đây; server tính lại (BR-7.2)

    @field_validator("annotator_note")
    @classmethod
    def strip_note(cls, v: str | None) -> str | None:
        return v.strip() if v else None

    @model_validator(mode="after")
    def check_justification_fields_present(self) -> SubmitIn:
        """Chỉ validate cấu trúc — việc check đủ lý do cho từng dimension lệch ngưỡng
        phải so với pre-score từ DB, nên được thực hiện trong service.py."""
        return self


class SubmitOut(BaseModel):
    claim_id: uuid.UUID
    composite_score: float
    status: str             # "submitted"
    submitted_at: datetime
    # Các dimension nào cần justification (để FE highlight)
    dimensions_needing_justification: list[str]
