# ADR 0007 — LLM provider qua OpenRouter (gateway OpenAI-compatible)

**Trạng thái:** Accepted · **Ngày:** 2026-06-16 · **Giải quyết:** OQ-002, OQ-003

## Context
Pipeline cần LLM cho 2 việc: **claim extraction** (tách answer thành các claim) và
**pre-scoring** (chấm 6 chiều SF/SC/NH/SQ/REL/COMP). OQ-002 (chốt provider/endpoint) và
OQ-003 (claim extraction tách riêng hay gộp pre-scoring) đang chặn việc implement pipeline.

Yêu cầu: đổi model dễ dàng (chưa chốt model cuối), không lock vào 1 vendor, hợp build hẹp.

## Decision
1. **Provider = OpenRouter** — gateway tuân chuẩn OpenAI Chat Completions. Đổi
   provider/model = đổi `.env` (`LLM_PROVIDER`/`LLM_MODEL`/`LLM_BASE_URL`/`LLM_API_KEY`),
   **không sửa code**. Model mặc định tạm `openai/gpt-5.4`. Cho phép override theo
   project qua `Project` LLM config (key Fernet-encrypted, BR-1.2).
2. **OQ-003 = 2 bước RIÊNG** — `extract_claims()` rồi `pre_score()`, khớp interface
   `LLMProvider` (`app/integrations/llm/base.py`). Mỗi bước có `prompt_version` riêng để
   versioning prompt (`claim_extraction_v1`, `pre_score_v1`).

## Consequences
- `OpenRouterProvider` (`app/integrations/llm/openrouter.py`) dùng `httpx.AsyncClient`,
  `response_format: json_object`. Lỗi HTTP/parse/schema → `AppError`
  (`llm_request_failed`/`llm_invalid_response`) để ARQ retry (`max_tries=3`, EC-LLM-004).
- `factory.get_llm_provider()` chọn provider theo `.env`; `MockProvider` giữ cho test
  (không gọi API thật).
- Thêm cột `llm_pre_score.raw_response_reference` (migration `f6a7b8c9d0e1`) để trace
  response thật (VR-LLM-005).
- Pipeline (`run_import_pipeline`) idempotent theo `bundle_id`; pre-scoring best-effort
  theo claim (1 claim lỗi không fail toàn bundle); `LlmPreScore` immutable (chỉ INSERT,
  BR-5.1).
- Phụ thuộc ADR 0004 (ARQ) cho enqueue/retry.
