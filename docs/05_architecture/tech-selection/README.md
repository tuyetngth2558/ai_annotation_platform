# Khảo sát & Lựa chọn Công nghệ — VSF AI Annotation Platform

Bộ tài liệu phân tích chi tiết **vì sao chọn từng công nghệ** trong stack MVP:
ưu điểm, nhược điểm, các phương án đã cân nhắc, và lý do loại/chọn.

> Đây là tài liệu **phân tích sâu**. Bản tóm tắt quyết định nằm ở
> [docs/adr/0001-tech-stack.md](../../adr/0001-tech-stack.md).

## Mục lục

| # | Tài liệu | Quyết định |
|---|---|---|
| 01 | [Backend Framework](01-backend-framework.md) | Python + FastAPI |
| 02 | [Frontend Framework](02-frontend-framework.md) | React + Vite + TypeScript |
| 03 | [Database & Hosting](03-database.md) | Postgres (dev docker / staging Supabase) |
| 04 | [Object Storage](04-storage.md) | MinIO / S3 interface |
| 05 | [Worker / Job Queue](05-worker-queue.md) | ARQ |
| 06 | [Authentication](06-auth.md) | Tự viết (bcrypt + JWT) |
| 07 | [Deployment / Hosting](07-deployment.md) | Staging PaaS (Railway/Render); prod để mở |
| 08 | [LLM Provider & Chi phí](08-llm-provider.md) | Chưa chốt (OQ-002) — bảng so sánh model + chi phí pre-scoring |

## Nguyên tắc đánh giá chung

Mọi lựa chọn được cân theo các tiêu chí, ưu tiên theo thứ tự:

1. **Khớp nghiệp vụ** — có gánh được yêu cầu thật trong docs BA không (parse PDF,
   LLM, data model quan hệ, RBAC per-project, audit immutable)?
2. **Phù hợp quy mô MVP 4 tuần** — đủ dùng, không over-engineer.
3. **Tránh lock-in** — đổi nhà cung cấp/hạ tầng không phải viết lại code.
4. **Hệ sinh thái & độ chín** — tài liệu, cộng đồng, ổn định.
5. **Chi phí vận hành** — công sức DevOps, tiền hạ tầng.

## Tóm tắt nhanh

```
Backend   : Python + FastAPI       (PDF + LLM ecosystem, async I/O-bound)
Frontend  : React + Vite + TS       (workspace state-heavy)
Database  : Postgres                (relational + JSONB; loại Mongo)
DB host   : docker (dev) / Supabase (staging)
Storage   : MinIO / S3 interface    (S3-compatible, no lock-in)
Worker    : ARQ                     (async, nhẹ, loại Celery/RQ)
Auth      : tự viết bcrypt + JWT     (RBAC per-project, no lock-in)
Deploy    : staging PaaS (Railway)   (prod để mở; dockerized nên không lock-in)
```
