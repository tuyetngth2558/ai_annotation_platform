"""LLMProvider — interface trừu tượng cho LLM (OQ-002 chưa chốt provider).

Tách interface để cắm provider sau (Claude/OpenAI/...) mà không sửa pipeline.
Dùng cho 2 việc: claim extraction (OQ-PDF-005 hybrid) và pre-scoring 6 chiều.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class PreScoreResult:
    """Output chuẩn hóa của pre-scoring (khớp Import schema §7)."""

    # LLM chỉ trả 5 chiều {sf, sc, hr, rel, comp} — SQ do rule engine tính ở pipeline
    # (Hướng A). Pipeline thêm "sq" vào dict này trước khi tính composite (đủ 6 chiều, BR-7.2).
    scores: dict[str, float]  # 0.00..1.00
    rationales: dict[str, str]
    raw_response_reference: str | None = None
    # Thông tin phụ ngoài 6 chiều (vd fact_check_status, fact_check_source_url) — lưu
    # vào rationale_json["_meta"], KHÔNG ảnh hưởng điểm (ADR 0008).
    extra: dict = field(default_factory=dict)
    # Prompt version thực tế đã dùng (PromptSpec.version) — để pipeline lưu đúng vào DB.
    prompt_version_used: str = "pre_score_default_v1"


class LLMProvider(ABC):
    """Hợp đồng tối thiểu cho LLM provider."""

    @abstractmethod
    async def extract_claims(self, answer_text: str, *, prompt_version: str) -> list[dict]:
        """Tách answer_text thành danh sách claim (giữ thứ tự). Xem schema §6."""

    @abstractmethod
    async def pre_score(
        self,
        claim_text: str,
        source_context: str,
        *,
        prompt_version: str,
        domain: str | None = None,
        title: str | None = None,
    ) -> PreScoreResult:
        """Chấm 6 chiều cho 1 claim. Prompt phải có {{claim_text}} {{source_context}} (BR-1.3).

        `domain` chọn prompt theo domain (ADR 0008); `title` dùng cho chiều sc (câu hỏi tiêu đề).
        """
