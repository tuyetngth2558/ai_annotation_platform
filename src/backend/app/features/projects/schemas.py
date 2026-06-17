"""Schema cho Projects (AC-1.1, AC-1.2, AC-1.3, AC-1.4)."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.constants import Role

# Template biến bắt buộc trong prompt (BR-1.3).
_REQUIRED_PROMPT_VARS = {"{{claim_text}}", "{{source_context}}"}


def _validate_prompt_template(v: str | None) -> str | None:
    """Kiểm tra prompt có đủ {{claim_text}} và {{source_context}} (BR-1.3)."""
    if v is None:
        return v
    missing = [var for var in _REQUIRED_PROMPT_VARS if var not in v]
    if missing:
        raise ValueError(
            f"Prompt template thiếu biến bắt buộc: {', '.join(missing)} (BR-1.3)"
        )
    return v


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class LlmConfigIn(BaseModel):
    """Cấu hình LLM cho project (AC-1.2). Validate prompt (BR-1.3)."""

    endpoint: str = Field(description="URL endpoint LLM (https://...)")
    api_key: str = Field(min_length=1, description="API key — sẽ encrypt at-rest (BR-1.2)")
    model: str = Field(min_length=1, max_length=128)
    prompt_template: str = Field(
        min_length=10,
        description="Phải chứa {{claim_text}} và {{source_context}} (BR-1.3)",
    )

    @field_validator("prompt_template")
    @classmethod
    def check_prompt_vars(cls, v: str) -> str:
        _validate_prompt_template(v)
        return v

    @field_validator("endpoint")
    @classmethod
    def check_endpoint_url(cls, v: str) -> str:
        if not v.startswith("https://") and not v.startswith("http://"):
            raise ValueError("Endpoint phải là URL hợp lệ bắt đầu bằng http(s)://")
        return v


class ProjectCreate(BaseModel):
    """Tạo project mới (AC-1.1 + AC-1.2). Modality luôn 'text' (BR-1.1).

    llm_config tùy chọn: nếu bỏ trống, pipeline dùng cấu hình LLM từ .env
    (settings.llm_*) — không cần nhập endpoint/key/model per-project ở MVP.
    """

    # project_code tùy chọn: bỏ trống → BE tự sinh proj_001, proj_002...
    project_code: str | None = Field(default=None, max_length=64, pattern=r"^[A-Za-z0-9_\-]+$")
    project_name: str = Field(min_length=3, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    start_date: date | None = None
    deadline: date | None = None
    llm_config: LlmConfigIn | None = None


class AssignMemberIn(BaseModel):
    """Gán user vào project với role (AC-1.3)."""

    user_id: uuid.UUID
    role: Role = Field(description="ANNOTATOR hoặc QA")

    @field_validator("role")
    @classmethod
    def not_admin(cls, v: Role) -> Role:
        if v == Role.ADMIN:
            raise ValueError("Không gán role ADMIN qua endpoint này.")
        return v


class AssignMembersIn(BaseModel):
    members: list[AssignMemberIn] = Field(min_length=1)


class AssignClaimsIn(BaseModel):
    """Gán claim cho 1 annotator. claim_ids rỗng = gán TẤT CẢ claim của project."""

    annotator_id: uuid.UUID
    claim_ids: list[uuid.UUID] = Field(
        default_factory=list,
        description="Claim cần gán. Rỗng = gán toàn bộ claim của project.",
    )


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class LlmConfigStatus(BaseModel):
    """Hiển thị trạng thái LLM config cho Admin (AC-1.4). API key bị mask (BR-1.2)."""

    endpoint: str | None
    api_key_masked: str  # luôn "••••••••" nếu đã set
    model: str | None
    is_configured: bool


class MemberOut(BaseModel):
    user_id: uuid.UUID
    full_name: str
    email: str
    role: str
    is_active: bool


class ProjectOut(BaseModel):
    """Response project list/detail (AC-1.4)."""

    id: uuid.UUID
    project_code: str
    project_name: str
    description: str | None
    modality: str
    status: str
    start_date: date | None = None
    deadline: date | None
    created_at: datetime
    llm_config: LlmConfigStatus
    member_count: int

    model_config = {"from_attributes": True}


class ProjectDetail(ProjectOut):
    """Chi tiết project gồm cả danh sách thành viên."""

    members: list[MemberOut]


class ProjectClaimOut(BaseModel):
    """1 claim trong project (cho trang chi tiết + gán annotator)."""

    claim_id: uuid.UUID
    claim_order: int
    section_name: str | None
    claim_text: str
    status: str
    article_code: str | None
    title: str | None
    assigned_annotator_id: uuid.UUID | None
    assigned_annotator_email: str | None


class ClaimStatusStats(BaseModel):
    """Đếm claim theo trạng thái (tiến độ project) — KHÔNG phụ thuộc filter/phân trang."""

    total: int = 0
    ready: int = 0
    in_annotation: int = 0
    submitted: int = 0
    returned: int = 0
    approved: int = 0
    unassigned: int = 0


class ProjectClaimsOut(BaseModel):
    items: list[ProjectClaimOut]
    total: int  # tổng claim KHỚP filter (cho phân trang)
    limit: int
    offset: int
    stats: ClaimStatusStats  # thống kê toàn project (không theo filter)


class AssignClaimsOut(BaseModel):
    assigned_count: int
    annotator_id: uuid.UUID
