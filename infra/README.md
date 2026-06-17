# Infrastructure

Hạ tầng dev/staging cho VSF AI Annotation Platform.

## Nội dung

- `docker/` — Dockerfile cho từng service
  - `api.Dockerfile` — FastAPI (uv)
  - `worker.Dockerfile` — ARQ worker
  - `web.Dockerfile` — React + Vite
- `postgres/init.sql` — khởi tạo extension; chỗ thêm REVOKE cho audit immutable (BR-10.1)

## Dev stack (docker compose)

`docker-compose.yml` ở gốc repo dựng: `postgres` + `redis` + `minio` (+ `minio-init` tạo bucket) + `api` + `worker` + `web`.

| Service | Port | Ghi chú |
|---|---|---|
| api (FastAPI) | 8000 | `/health`, `/docs` (OpenAPI) |
| web (Vite) | 5173 | UI |
| postgres | 5432 | user/pass/db: `vsf` / `vsf` / `vsf_annotation` |
| redis | 6379 | broker ARQ |
| minio (S3) | 9000 | API S3 |
| minio console | 9001 | `minioadmin` / `minioadmin` |

```bash
cp .env.example .env      # điền secret nếu cần
docker compose up -d      # hoặc: make up  /  .\scripts\dev.ps1 up
```

## Môi trường

- **Dev**: toàn bộ chạy local trong docker (offline).
- **Staging**: DB → Supabase (đổi `DATABASE_URL`); Storage → MinIO tự host hoặc Supabase Storage (đổi `S3_ENDPOINT_URL`); Redis → Upstash (đổi `REDIS_URL`).

Mọi khác biệt dev/staging nằm trong `.env` — code không đổi. Xem `docs/adr/` cho lý do các lựa chọn.
