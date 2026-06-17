"""Unit test OpenRouterProvider — mock httpx, không gọi API thật.

Verify: prompt được điền đúng placeholder, parse JSON response đúng kiểu trả về,
lỗi HTTP/parse/schema raise đúng AppError code.
"""

from __future__ import annotations

import json

import httpx
import pytest

from app.core.exceptions import AppError
from app.integrations.llm.base import PreScoreResult
from app.integrations.llm.openrouter import OpenRouterProvider


class _FakeResponse:
    def __init__(
        self, *, content: str | None = None, status_code: int = 200, body: dict | None = None
    ):
        self.status_code = status_code
        if body is not None:
            self._body = body
        else:
            self._body = {
                "id": "gen-123",
                "choices": [{"message": {"content": content}}],
            }

    def json(self) -> dict:
        return self._body

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise httpx.HTTPError("error")


class _FakeClient:
    """Thay httpx.AsyncClient — ghi lại payload và trả response cố định."""

    captured: dict = {}

    def __init__(self, *, response: _FakeResponse, raise_exc: Exception | None = None):
        self._response = response
        self._raise_exc = raise_exc

    def __call__(self, *args, **kwargs):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, *, json=None, headers=None):
        _FakeClient.captured = {"url": url, "json": json, "headers": headers}
        if self._raise_exc is not None:
            raise self._raise_exc
        return self._response


def _patch_client(monkeypatch, response=None, raise_exc=None):
    fake = _FakeClient(response=response, raise_exc=raise_exc)
    monkeypatch.setattr(httpx, "AsyncClient", fake)
    return fake


def _provider() -> OpenRouterProvider:
    return OpenRouterProvider(
        api_key="test-key", model="openai/gpt-5.4", base_url="https://openrouter.ai/api/v1/"
    )


def test_init_requires_api_key():
    with pytest.raises(AppError) as exc:
        OpenRouterProvider(api_key="", model="m", base_url="http://x")
    assert exc.value.code == "llm_not_configured"


def test_init_requires_model():
    with pytest.raises(AppError) as exc:
        OpenRouterProvider(api_key="k", model="", base_url="http://x")
    assert exc.value.code == "llm_not_configured"


@pytest.mark.asyncio
async def test_extract_claims_parses_list_and_fills_prompt(monkeypatch):
    content = json.dumps({"claims": [{"claim_order": 1, "claim_text": "Trời xanh."}]})
    _patch_client(monkeypatch, response=_FakeResponse(content=content))

    result = await _provider().extract_claims(
        "Văn bản trả lời mẫu.", prompt_version="claim_extraction_v1"
    )

    assert result == [{"claim_order": 1, "claim_text": "Trời xanh."}]
    sent = _FakeClient.captured["json"]
    # base_url được rstrip '/' → URL chuẩn
    assert _FakeClient.captured["url"] == "https://openrouter.ai/api/v1/chat/completions"
    assert _FakeClient.captured["headers"]["Authorization"] == "Bearer test-key"
    assert sent["model"] == "openai/gpt-5.4"
    assert sent["response_format"] == {"type": "json_object"}
    # answer_text đã được điền vào user message
    user_msg = next(m for m in sent["messages"] if m["role"] == "user")
    assert "Văn bản trả lời mẫu." in user_msg["content"]
    assert "{{answer_text}}" not in user_msg["content"]


@pytest.mark.asyncio
async def test_extract_claims_bad_schema_raises(monkeypatch):
    content = json.dumps({"wrong_key": []})
    _patch_client(monkeypatch, response=_FakeResponse(content=content))
    with pytest.raises(AppError) as exc:
        await _provider().extract_claims("x", prompt_version="v1")
    assert exc.value.code == "llm_invalid_response"


@pytest.mark.asyncio
async def test_pre_score_returns_prescoreresult(monkeypatch):
    scores = {"sf": 0.9, "sc": 0.8, "hr": 1.0, "rel": 0.85, "comp": 0.6}  # 5 chiều, SQ rule riêng
    content = json.dumps(
        {
            "scores": scores,
            "rationales": {"sf": "ok"},
            "fact_check_status": "XAC_NHAN",
            "fact_check_source_url": "https://chinhphu.vn/abc",
        }
    )
    _patch_client(monkeypatch, response=_FakeResponse(content=content))

    res = await _provider().pre_score(
        "Claim X", "Source context Y", prompt_version="pre_score_v1", title="Tiêu đề Z"
    )

    assert isinstance(res, PreScoreResult)
    assert res.scores == {k: float(v) for k, v in scores.items()}
    assert res.rationales == {"sf": "ok"}
    assert res.raw_response_reference == "gen-123"
    # fact_check_status được normalize (XAC_NHAN → "XAC NHAN") và đưa vào extra
    assert res.extra["fact_check_status"] == "XAC NHAN"
    assert res.extra["fact_check_source_url"] == "https://chinhphu.vn/abc"
    # prompt_version_used phản ánh domain thực tế (default khi không truyền domain)
    assert res.prompt_version_used == "pre_score_default_v1"
    user_msg = next(m for m in _FakeClient.captured["json"]["messages"] if m["role"] == "user")
    assert "Claim X" in user_msg["content"]
    assert "Source context Y" in user_msg["content"]
    assert "Tiêu đề Z" in user_msg["content"]
    assert "{{claim_text}}" not in user_msg["content"]
    assert "{{source_context}}" not in user_msg["content"]
    assert "{{title}}" not in user_msg["content"]


@pytest.mark.asyncio
async def test_pre_score_selects_domain_prompt(monkeypatch):
    """domain='law' → system prompt là prompt pháp luật (đặc thù, KHÔNG còn bảng SQ — Hướng A)."""
    scores = {d: 0.5 for d in ("sf", "sc", "hr", "rel", "comp")}
    content = json.dumps({"scores": scores, "rationales": {}})
    _patch_client(monkeypatch, response=_FakeResponse(content=content))

    res = await _provider().pre_score("c", "s", prompt_version="pre_score_v1", domain="law")

    sys_msg = next(m for m in _FakeClient.captured["json"]["messages"] if m["role"] == "system")
    assert "PHÁP LUẬT" in sys_msg["content"]
    # SQ đã tách sang rule engine → prompt KHÔNG còn bảng tra SQ.
    assert "BẢNG TRA SQ" not in sys_msg["content"]
    # law domain → version riêng được lưu vào DB, không phải "pre_score_v1" hard-code
    assert res.prompt_version_used == "pre_score_law_v1"


@pytest.mark.asyncio
async def test_pre_score_parses_json_with_extra_text(monkeypatch):
    """extract_json chịu được text dẫn + code fence trước/sau JSON."""
    scores = {d: 0.6 for d in ("sf", "sc", "hr", "rel", "comp")}
    inner = json.dumps({"scores": scores, "rationales": {}})
    content = f"Đây là kết quả:\n```json\n{inner}\n```\nHết."
    _patch_client(monkeypatch, response=_FakeResponse(content=content))

    res = await _provider().pre_score("c", "s", prompt_version="pre_score_v1")
    assert res.scores["sf"] == 0.6


@pytest.mark.asyncio
async def test_pre_score_clamps_out_of_range(monkeypatch):
    """LLM trả điểm ngoài [0,1] → clamp (fix #4), tránh vi phạm CHECK constraint DB."""
    scores = {"sf": 1.5, "sc": -0.3, "hr": 0.5, "rel": 2.0, "comp": 0.0}
    content = json.dumps({"scores": scores, "rationales": {}})
    _patch_client(monkeypatch, response=_FakeResponse(content=content))

    res = await _provider().pre_score("c", "s", prompt_version="pre_score_v1")
    assert res.scores["sf"] == 1.0    # 1.5 → 1.0
    assert res.scores["sc"] == 0.0    # -0.3 → 0.0
    assert res.scores["hr"] == 0.5
    assert res.scores["rel"] == 1.0   # 2.0 → 1.0
    assert res.scores["comp"] == 0.0


@pytest.mark.asyncio
async def test_pre_score_missing_dimension_raises(monkeypatch):
    scores = {"sf": 0.9, "sc": 0.8}  # thiếu chiều
    content = json.dumps({"scores": scores})
    _patch_client(monkeypatch, response=_FakeResponse(content=content))
    with pytest.raises(AppError) as exc:
        await _provider().pre_score("c", "s", prompt_version="v1")
    assert exc.value.code == "llm_invalid_response"


@pytest.mark.asyncio
async def test_http_error_raises_request_failed(monkeypatch):
    _patch_client(monkeypatch, raise_exc=httpx.ConnectError("boom"))
    with pytest.raises(AppError) as exc:
        await _provider().extract_claims("x", prompt_version="v1")
    assert exc.value.code == "llm_request_failed"


@pytest.mark.asyncio
async def test_non_json_content_raises_invalid_response(monkeypatch):
    _patch_client(monkeypatch, response=_FakeResponse(content="not json at all"))
    with pytest.raises(AppError) as exc:
        await _provider().pre_score("c", "s", prompt_version="v1")
    assert exc.value.code == "llm_invalid_response"
