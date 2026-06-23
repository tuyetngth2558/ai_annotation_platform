"""Prompt registry cho LLM — chọn prompt pre-score theo domain (ADR 0008).

Thêm domain mới (v2/v3) = thêm 1 entry vào PRE_SCORE_REGISTRY + 1 file prompts/<domain>.py,
rồi deploy. KHÔNG có loader động/Admin-editable ở vòng này (chủ ý — quyết định user).

Domain chưa khai báo → fallback PRE_SCORE_SYSTEM_DEFAULT.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.integrations.llm.prompts._default import (
    PRE_SCORE_SYSTEM_DEFAULT,
    PRE_SCORE_USER_TEMPLATE,
)
from app.integrations.llm.prompts.law import PRE_SCORE_SYSTEM_LAW
from app.integrations.llm.prompts.med import PRE_SCORE_SYSTEM_MED
from app.integrations.llm.prompts.trv import PRE_SCORE_SYSTEM_TRV


@dataclass(frozen=True)
class PromptSpec:
    """1 prompt pre-score: system + user_template (placeholder) + version để trace."""

    system: str
    user_template: str
    version: str


# user_template dùng chung cho mọi domain (chỉ system đổi theo domain).
def _spec(system: str, version: str) -> PromptSpec:
    return PromptSpec(system=system, user_template=PRE_SCORE_USER_TEMPLATE, version=version)


# Registry domain_key → PromptSpec. 3 domain thật + default (port từ tool cũ).
PRE_SCORE_REGISTRY: dict[str, PromptSpec] = {
    "law": _spec(PRE_SCORE_SYSTEM_LAW, "pre_score_law_v1"),
    "med": _spec(PRE_SCORE_SYSTEM_MED, "pre_score_med_v1"),
    "trv": _spec(PRE_SCORE_SYSTEM_TRV, "pre_score_trv_v1"),
}

PRE_SCORE_DEFAULT = _spec(PRE_SCORE_SYSTEM_DEFAULT, "pre_score_default_v1")


def get_pre_score_prompt(domain_key: str | None) -> PromptSpec:
    """Trả PromptSpec theo domain; fallback PRE_SCORE_DEFAULT nếu domain chưa khai báo."""
    if not domain_key:
        return PRE_SCORE_DEFAULT
    return PRE_SCORE_REGISTRY.get(domain_key.lower(), PRE_SCORE_DEFAULT)


# ---------------------------------------------------------------------------
# Claim extraction prompt — CHỈ dùng khi parser-first ra 0 claim (fallback).
# ---------------------------------------------------------------------------

CLAIM_EXTRACTION_SYSTEM_V1 = """Bạn là chuyên gia tách claim (nhận định) từ văn bản trả lời \
tiếng Việt. Tách answer_text thành danh sách claim riêng biệt, giữ nguyên thứ tự xuất hiện.

Mỗi claim là một nhận định có thể kiểm chứng bằng nguồn. Giữ nguyên citation marker dạng [n] \
hoặc [src_xxx] đi kèm — đây là tín hiệu map claim với nguồn.

Trả về DUY NHẤT một JSON object (không markdown):
{"claims": [
  {"claim_order": 1, "section_name": "<tên section hoặc rỗng>",
   "claim_text": "<câu hoàn chỉnh>", "citation_markers": ["1"],
   "source_order_candidates": [1], "confidence": 0.88, "extraction_note": ""}
]}"""

CLAIM_EXTRACTION_USER_V1 = """answer_text:
---
{{answer_text}}
---

Tách answer_text trên thành danh sách claim theo đúng format JSON đã yêu cầu."""

CLAIM_EXTRACTION_VERSION = "claim_extraction_v1"


__all__ = [
    "PromptSpec",
    "PRE_SCORE_REGISTRY",
    "PRE_SCORE_DEFAULT",
    "get_pre_score_prompt",
    "CLAIM_EXTRACTION_SYSTEM_V1",
    "CLAIM_EXTRACTION_USER_V1",
    "CLAIM_EXTRACTION_VERSION",
]
