"""Factory chọn LLM provider theo settings.LLM_PROVIDER (OQ-002: OpenRouter mặc định).

Đổi provider/model = đổi `.env` (LLM_PROVIDER/LLM_MODEL/...), không sửa code.
`get_llm_provider(config=None)` cho phép override bằng Project LLM config
(`get_decrypted_llm_config`) khi project đã cấu hình riêng — fallback `.env` nếu None.
"""

from __future__ import annotations

from app.core.config import settings
from app.integrations.llm.base import LLMProvider, PreScoreResult
from app.integrations.llm.openrouter import OpenRouterProvider


class MockProvider(LLMProvider):
    """Provider giả lập — trả dữ liệu cố định để dev/test luồng khi không cần gọi LLM thật."""

    async def extract_claims(self, answer_text: str, *, prompt_version: str) -> list[dict]:
        return []

    async def pre_score(
        self,
        claim_text: str,
        source_context: str,
        *,
        prompt_version: str,
        domain: str | None = None,
        title: str | None = None,
    ) -> PreScoreResult:
        # 5 chiều — SQ do rule engine điền ở pipeline (Hướng A).
        zero = {d: 0.0 for d in ("sf", "sc", "hr", "rel", "comp")}
        return PreScoreResult(
            scores=zero,
            rationales={},
            raw_response_reference=None,
            extra={"fact_check_status": "KHONG TIM THAY"},
            prompt_version_used="pre_score_mock_v1",
        )


_REGISTRY: dict[str, type[LLMProvider]] = {
    "mock": MockProvider,
    "": MockProvider,  # mặc định khi chưa cấu hình
    "openrouter": OpenRouterProvider,
}


def get_llm_provider(config: dict | None = None) -> LLMProvider:
    """Tạo provider mới theo config (project override) hoặc theo `.env` (global default).

    `config` (nếu có) là dict từ `get_decrypted_llm_config(project)`:
    {"endpoint": ..., "api_key": ..., "model": ..., "prompt_template": ...}.
    Không cache (lru_cache) vì api_key/model có thể khác nhau theo từng project.
    """
    provider_name = settings.llm_provider.lower()
    cls = _REGISTRY.get(provider_name, MockProvider)

    if cls is MockProvider:
        return MockProvider()

    api_key = (config or {}).get("api_key") or settings.llm_api_key
    model = (config or {}).get("model") or settings.llm_model
    base_url = (config or {}).get("endpoint") or settings.llm_base_url
    return cls(api_key=api_key, model=model, base_url=base_url)


__all__ = ["LLMProvider", "PreScoreResult", "get_llm_provider"]
