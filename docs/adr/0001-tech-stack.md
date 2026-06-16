# ADR 0001 — Lựa chọn tech stack cho MVP

**Trạng thái:** Accepted · **Ngày:** 2026-06-08 · **Người quyết:** Khải (DevOps/Dev)

> ADR này tóm tắt quyết định. Phân tích chi tiết ưu/nhược từng phương án xem
> [docs/05_architecture/tech-selection/](../05_architecture/tech-selection/).

## Bối cảnh

DEP-006 yêu cầu chốt stack trước khi build (đang block toàn bộ implementation).
Đặc điểm nghiệp vụ chi phối lựa chọn:

- **Parse PDF** (answer + source ref + source content) — DR-002, DR-007.
- **Gọi LLM** cho claim extraction + pre-scoring 6 chiều — I/O-bound, có retry.
- **Data model quan hệ chặt**: 16 entity, chuỗi FK `project→batch→bundle→parent_task→claim`,
  export CSV 40+ cột toàn FK (DRD-005), audit log INSERT-only immutable (BR-10.1).
- **Field bán cấu trúc**: `metadata_json`, `parse_warnings_json`, `rationale_json`.
- Quy mô MVP 4 tuần, 1 project (Vivipedia), 3 role.

## Quyết định

| Hạng mục | Chọn | Lý do cốt lõi | Chi tiết |
|---|---|---|---|
| Backend | **Python + FastAPI** | PDF parsing + LLM SDK mạnh nhất ở Python; FastAPI async hợp I/O-bound; Pydantic validate | [01](../05_architecture/tech-selection/01-backend-framework.md) |
| Frontend | **React + Vite + TypeScript** | Annotation Workspace state-heavy (live composite, auto-save, SC lock, diff) | [02](../05_architecture/tech-selection/02-frontend-framework.md) |
| Database | **Postgres** | Relational + JSONB; export FK-heavy + audit immutable cần relational. Loại Mongo | [03](../05_architecture/tech-selection/03-database.md) |
| DB host | dev **docker** · staging **Supabase** | Tách data dev; staging managed khỏi tự nuôi VPS | [03](../05_architecture/tech-selection/03-database.md) |
| Storage | **MinIO / S3 interface** | S3-compatible, không lock-in; lưu PDF gốc | [04](../05_architecture/tech-selection/04-storage.md) |
| Worker | **ARQ** | Async hợp FastAPI + I/O-bound; nhẹ, chỉ cần Redis. Loại Celery/RQ | [05](../05_architecture/tech-selection/05-worker-queue.md) |
| Auth | **Tự viết** (bcrypt + JWT) | RBAC per-project phải tự viết dù sao; tránh lock-in | [06](../05_architecture/tech-selection/06-auth.md) |
| Deploy | staging **PaaS (Railway/Render)** · prod để mở | URL demo nhanh, free; dockerized nên không lock-in | [07](../05_architecture/tech-selection/07-deployment.md) |
| Deps Python | **uv** (pyproject.toml) | Nhanh, lock reproducible | — |

## Hệ quả

- **Một ngôn ngữ (Python)** cho cả API + worker + parser → share code, giảm context-switch.
- **Postgres zero lock-in**: đổi host = đổi `DATABASE_URL`. Supabase chỉ dùng làm Postgres
  thuần + Storage, KHÔNG dùng Auth/Realtime (xem [ADR 0003](0003-self-written-auth.md)).
- **LLM provider chưa chốt (OQ-002)** → interface `LLMProvider` trừu tượng, cắm sau.
- **Mongo bị loại** dù tiện ở `*_json` — vì data model quan hệ + audit immutable là phần
  lớn và quan trọng hơn; Postgres JSONB đã đủ cho phần bán cấu trúc.

## Liên quan
[ADR 0002](0002-storage-minio-s3-interface.md) ·
[ADR 0003](0003-self-written-auth.md) ·
[ADR 0004](0004-worker-arq.md) ·
[ADR 0005](0005-feature-based-structure.md)
