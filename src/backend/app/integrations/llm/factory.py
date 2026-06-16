"""Factory chọn LLM provider theo settings.LLM_PROVIDER.

OQ-002 chưa chốt → hiện chỉ có MockProvider để pipeline chạy được luồng.
Khi chốt provider: thêm AnthropicProvider/OpenAIProvider implement LLMProvider
rồi đăng ký vào _REGISTRY.
"""

from __future__ import annotations

from functools import lru_cache

from app.core.config import settings
from app.integrations.llm.base import LLMProvider, PreScoreResult


class MockProvider(LLMProvider):
    """Provider giả lập — trả dữ liệu cố định để dev/test luồng khi chưa có LLM thật."""

    async def extract_claims(self, answer_text: str, *, prompt_version: str) -> list[dict]:
        # TODO(import_bundle): thay bằng provider thật khi chốt OQ-002.
        return []

    async def pre_score(
        self, claim_text: str, source_context: str, *, prompt_version: str
    ) -> PreScoreResult:
        # TODO(annotation): thay bằng provider thật.
        zero = {d: 0.0 for d in ("sf", "sc", "hr", "sq", "rel", "comp")}
        return PreScoreResult(scores=zero, rationales={}, raw_response_reference=None)


_REGISTRY: dict[str, type[LLMProvider]] = {
    "mock": MockProvider,
    "": MockProvider,  # mặc định khi chưa cấu hình
    # "anthropic": AnthropicProvider,   # TODO(OQ-002)
    # "openai": OpenAIProvider,          # TODO(OQ-002)
}


@lru_cache
def get_llm_provider() -> LLMProvider:
    cls = _REGISTRY.get(settings.llm_provider.lower(), MockProvider)
    return cls()


__all__ = ["LLMProvider", "PreScoreResult", "get_llm_provider"]
