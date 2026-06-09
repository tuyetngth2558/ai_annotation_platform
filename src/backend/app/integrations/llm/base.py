"""LLMProvider — interface trừu tượng cho LLM (OQ-002 chưa chốt provider).

Tách interface để cắm provider sau (Claude/OpenAI/...) mà không sửa pipeline.
Dùng cho 2 việc: claim extraction (OQ-PDF-005 hybrid) và pre-scoring 6 chiều.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class PreScoreResult:
    """Output chuẩn hóa của pre-scoring (khớp Import schema §7)."""

    scores: dict[str, float]  # {sf, sc, hr, sq, rel, comp} — 0.00..1.00
    rationales: dict[str, str]
    raw_response_reference: str | None = None


class LLMProvider(ABC):
    """Hợp đồng tối thiểu cho LLM provider."""

    @abstractmethod
    async def extract_claims(self, answer_text: str, *, prompt_version: str) -> list[dict]:
        """Tách answer_text thành danh sách claim (giữ thứ tự). Xem schema §6."""

    @abstractmethod
    async def pre_score(
        self, claim_text: str, source_context: str, *, prompt_version: str
    ) -> PreScoreResult:
        """Chấm 6 chiều cho 1 claim. Prompt phải có {{claim_text}} {{source_context}} (BR-1.3)."""
