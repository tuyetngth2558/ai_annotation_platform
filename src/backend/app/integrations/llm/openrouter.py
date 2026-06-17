"""OpenRouterProvider — implement LLMProvider qua OpenRouter (gateway OpenAI-compatible).

OQ-002: OpenRouter cho phép đổi model bằng cấu hình (.env hoặc Project LLM config),
không phải sửa code. Endpoint tuân theo chuẩn OpenAI Chat Completions.

Pre-score chọn prompt theo domain qua registry (ADR 0008) và trả thêm fact_check_status
(lưu vào PreScoreResult.extra → rationale_json, không ảnh hưởng 6 chiều điểm).
"""

from __future__ import annotations

import logging

import httpx

from app.constants import normalize_fact_check_status
from app.core.exceptions import AppError
from app.integrations.llm._json import extract_json
from app.integrations.llm.base import LLMProvider, PreScoreResult
from app.integrations.llm.prompts import (
    CLAIM_EXTRACTION_SYSTEM_V1,
    CLAIM_EXTRACTION_USER_V1,
    get_pre_score_prompt,
)

logger = logging.getLogger(__name__)

_REQUEST_TIMEOUT = 60.0
# LLM chỉ chấm 5 chiều — SQ do rule engine tính (Hướng A, sq_engine.py), KHÔNG hỏi LLM.
_DIMENSIONS = ("sf", "sc", "hr", "rel", "comp")


def _clamp01(value: object) -> float:
    """Ép điểm về [0.0, 1.0]. Giá trị không parse được → 0.0 (an toàn, không crash)."""
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return 0.0


class OpenRouterProvider(LLMProvider):
    """Gọi OpenRouter Chat Completions API. Cấu hình qua endpoint/api_key/model truyền vào."""

    def __init__(self, *, api_key: str, model: str, base_url: str) -> None:
        if not api_key:
            raise AppError("Thiếu OpenRouter API key.", code="llm_not_configured", status_code=422)
        if not model:
            raise AppError("Thiếu OpenRouter model.", code="llm_not_configured", status_code=422)
        self._api_key = api_key
        self._model = model
        self._base_url = base_url.rstrip("/")

    async def _chat(self, system: str, user: str) -> dict:
        url = f"{self._base_url}/chat/completions"
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}

        try:
            async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
                resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.error("OpenRouter HTTP error: %s", exc)
            raise AppError(
                f"Gọi OpenRouter thất bại: {exc}", code="llm_request_failed"
            ) from exc

        body = resp.json()
        try:
            content = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            logger.error("OpenRouter response thiếu choices/content: %s", body)
            raise AppError(
                f"OpenRouter trả response không hợp lệ: {exc}", code="llm_invalid_response"
            ) from exc

        try:
            parsed = extract_json(content)  # robust với text thừa (4-strategy)
        except ValueError as exc:
            logger.error("OpenRouter content không parse được JSON: %s", content[:300])
            raise AppError(
                f"OpenRouter trả JSON không hợp lệ: {exc}", code="llm_invalid_response"
            ) from exc

        return {"parsed": parsed, "raw": body}

    async def extract_claims(self, answer_text: str, *, prompt_version: str) -> list[dict]:
        user = CLAIM_EXTRACTION_USER_V1.replace("{{answer_text}}", answer_text)
        result = await self._chat(CLAIM_EXTRACTION_SYSTEM_V1, user)
        claims = result["parsed"].get("claims")
        if not isinstance(claims, list):
            raise AppError(
                "OpenRouter trả claim extraction sai schema (thiếu 'claims' list).",
                code="llm_invalid_response",
            )
        return claims

    async def pre_score(
        self,
        claim_text: str,
        source_context: str,
        *,
        prompt_version: str,
        domain: str | None = None,
        title: str | None = None,
    ) -> PreScoreResult:
        spec = get_pre_score_prompt(domain)
        user = (
            spec.user_template.replace("{{title}}", title or "")
            .replace("{{claim_text}}", claim_text)
            .replace("{{source_context}}", source_context)
        )
        result = await self._chat(spec.system, user)
        parsed = result["parsed"]
        scores = parsed.get("scores")
        rationales = parsed.get("rationales", {})
        if not isinstance(scores, dict) or not all(d in scores for d in _DIMENSIONS):
            raise AppError(
                "OpenRouter trả pre-score sai schema (thiếu chiều điểm).",
                code="llm_invalid_response",
            )

        extra: dict = {}
        fc_status = normalize_fact_check_status(parsed.get("fact_check_status"))
        if fc_status:
            extra["fact_check_status"] = fc_status
        fc_url = parsed.get("fact_check_source_url")
        if fc_url:
            extra["fact_check_source_url"] = fc_url

        raw_ref = result["raw"].get("id")
        return PreScoreResult(
            # Clamp [0,1]: LLM đôi khi trả ngoài range (vd 1.2, -0.1) → tránh vi phạm CHECK
            # constraint ở DB làm fail commit cả bundle (chỉ ảnh hưởng claim này thì best-effort).
            scores={d: _clamp01(scores[d]) for d in _DIMENSIONS},
            rationales=rationales,
            raw_response_reference=raw_ref,
            extra=extra,
            prompt_version_used=spec.version,
        )
