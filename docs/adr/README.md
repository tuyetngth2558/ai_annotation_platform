# Architecture Decision Records (ADR)

Ghi lại các quyết định kiến trúc quan trọng và lý do, để team sau hiểu *tại sao*
chứ không chỉ *cái gì*.

| ADR | Quyết định | Trạng thái |
|---|---|---|
| [0001](0001-tech-stack.md) | Tech stack: FastAPI + React/Vite + Postgres + ARQ | Accepted |
| [0002](0002-storage-minio-s3-interface.md) | Storage qua interface S3 (MinIO / Supabase) | Accepted |
| [0003](0003-self-written-auth.md) | Tự viết auth (bcrypt + JWT, RBAC per-project) | Accepted |
| [0004](0004-worker-arq.md) | Worker dùng ARQ (thay Celery/RQ) | Accepted |
| [0005](0005-feature-based-structure.md) | Cấu trúc feature-based co-locate | Accepted |
| [0006](0006-auth-token-storage.md) | Auth token: localStorage + Bearer (MVP nội bộ) | Accepted |
| [0007](0007-llm-provider-openrouter.md) | LLM provider qua OpenRouter; claim extraction + pre-scoring 2 bước (OQ-002/003) | Accepted |
| [0008](0008-pre-scoring-domain-prompts.md) | Pre-scoring prompt theo domain (registry) + claim extraction parser-first + SQ rule engine (LLM 5 chiều) | Accepted |

Mẫu: Context → Decision → Consequences. Quyết định mới thêm file `NNNN-tieu-de.md`.
