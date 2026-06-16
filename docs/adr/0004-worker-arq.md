# ADR 0004 — Worker dùng ARQ

**Trạng thái:** Accepted · **Ngày:** 2026-06-08

## Context
Pipeline import chạy nền: parse PDF → claim extraction → source mapping → pre-scoring.
Đặc tính: phần lớn thời gian là **chờ LLM API** (I/O-bound), cần retry (EC-LLM-004),
job dài. Quy mô MVP nhỏ. So sánh ARQ vs Celery vs RQ.

## Decision
**ARQ.** Vì:
- Async-native → 1 worker xử lý nhiều LLM call đồng thời (hợp I/O-bound), không tốn process.
- Cùng async với FastAPI → share code (LLMProvider, SQLAlchemy async session).
- Nhẹ, chỉ cần Redis (đã có trong stack). Setup tối giản hợp "build hẹp 4 tuần".

Loại Celery (over-engineered, sync-first, nặng RAM cho job chờ I/O) và RQ (sync,
fork mỗi job → phí với job chờ LLM).

## Consequences
- Worker entrypoint: `arq app.jobs.worker.WorkerSettings`.
- Task ở `app/jobs/tasks/`, pipeline ở `app/jobs/pipelines/`.
- Cần cấu hình `max_tries`/`job_timeout` cho bước gọi LLM (TODO).
