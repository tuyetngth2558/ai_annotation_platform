# Onboarding — DevOps / Infra

Hướng dẫn cho DevOps: hạ tầng, env, secret, deploy, vận hành. Đọc
[README.md](README.md) (quickstart chung) trước.

---

## 1. Bạn phụ trách gì (theo Scope §6.2)

- Môi trường Dev & Staging hoạt động ổn định
- Quản lý secret + config bảo mật
- CI/CD pipeline (sau)
- Deploy DB + storage
- Log tập trung giám sát API/LLM

---

## 2. Kiến trúc hạ tầng

```
docker-compose.yml (dev stack):
  postgres  :5432   ← DB chính (vsf/vsf/vsf_annotation)
  redis     :6379   ← broker ARQ + cache
  minio     :9000   ← object storage (S3), console :9001
  minio-init        ← tạo bucket vsf-pdf rồi thoát
  api       :8000   ← FastAPI (uvicorn --reload)
  worker            ← ARQ worker
  web       :5173   ← React + Vite
```

Dockerfile ở `infra/docker/`: `api.Dockerfile`, `worker.Dockerfile`, `web.Dockerfile`.
- API/Worker dùng **uv**, venv đặt ở `/opt/venv` (ngoài `/app`) để volume mount không che.
- Postgres init: `infra/postgres/init.sql` (extension pgcrypto; chỗ thêm REVOKE audit sau).

---

## 3. Môi trường: Dev vs Staging

| | Dev (mỗi người) | Staging (chung) |
|---|---|---|
| Postgres | docker local | **Supabase** (online) |
| Redis | docker local | **Upstash** (cloud free) |
| Storage | MinIO local | Supabase Storage / MinIO tự host |
| App | docker-compose local | deploy (Railway/Render/VPS — chốt sau) |

**Mọi khác biệt nằm trong `.env`** — code không đổi. Xem
[docs/05_architecture/tech-selection/07-deployment.md](../05_architecture/tech-selection/07-deployment.md).

---

## 4. Quản lý ENV & Secret

### File env
- `.env.example` — **commit** (template, không có secret thật).
- `.env` — **gitignore** (giá trị thật, mỗi máy tự tạo: `cp .env.example .env`).
- `.gitignore` đã chặn `.env`/`.env.*` nhưng giữ `!.env.example`.

### Biến quan trọng (xem `.env.example` đầy đủ)
| Nhóm | Biến | Ghi chú |
|---|---|---|
| App | `APP_ENV`, `APP_DEBUG`, `CORS_ORIGINS` | development/staging/production |
| Auth | `JWT_SECRET` | **đổi ở staging/prod, ≥32 bytes, không commit** |
| Auth | `AUTH_MOCK_ENABLED` | **dev=true, staging/prod=false** (quan trọng!) |
| Crypto | `SECRET_ENCRYPTION_KEY` | Fernet key, mã hóa LLM API key (BR-1.2) |
| DB | `DATABASE_URL`, `DATABASE_URL_SYNC` | async (app) + sync (Alembic) |
| Redis | `REDIS_URL` | broker ARQ |
| Storage | `STORAGE_BACKEND`, `S3_*` | local/s3; đổi endpoint = đổi backend |
| LLM | `LLM_PROVIDER`, `LLM_API_KEY`, ... | OQ-002 chưa chốt; key encrypt |

### Sinh secret
```bash
# Fernet key (SECRET_ENCRYPTION_KEY):
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# JWT secret (≥32 bytes):
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Nguyên tắc secret (bảo mật cơ bản MVP)
1. **Không commit secret** — chỉ `.env.example` có placeholder.
2. **Staging/prod**: secret đặt qua biến môi trường của nền tảng (Railway/Render
   secrets), không nằm trong file repo.
3. **LLM API key**: mã hóa Fernet at-rest trong DB (BR-1.2) — không lưu plain.
4. **`AUTH_MOCK_ENABLED=false`** ở mọi môi trường không phải dev.
5. Khi lộ secret → đổi ngay (rotate JWT/Fernet/API key).

---

## 5. Vận hành dev stack

```bash
make up / make down / make build       # hoặc .\scripts\dev.ps1 up/down/build
make logs s=api                        # log 1 service
make migrate                           # alembic upgrade head
make seed                              # seed user mock

# Trực tiếp docker compose:
docker compose ps                      # trạng thái
docker compose restart api             # restart 1 service
docker compose down -v                 # XÓA cả volume (mất data!) — cẩn thận
docker compose build --no-cache api    # rebuild sạch khi đổi Dockerfile/deps
```

### Healthcheck
- postgres: `pg_isready` · redis: `redis-cli ping` · minio: `mc ready`
- api: `GET /health` · web: `GET :5173`

---

## 6. Database & Storage ops

### DB
```bash
docker compose exec postgres psql -U vsf -d vsf_annotation   # vào psql
docker compose exec api alembic upgrade head                 # migrate
# Backup (dev):
docker compose exec postgres pg_dump -U vsf vsf_annotation > backup.sql
```
Staging Supabase: backup managed sẵn; chỉ cần đổi `DATABASE_URL`.

### Storage (MinIO)
- Console: http://localhost:9001 (`minioadmin`/`minioadmin`).
- Bucket `vsf-pdf` tạo tự động bởi `minio-init`.
- Đổi sang Supabase Storage/S3: đổi `S3_ENDPOINT_URL` + key, code không đổi.

---

## 7. Deploy lên Staging (định hướng)

Chi tiết: [docs/05_architecture/tech-selection/07-deployment.md](../05_architecture/tech-selection/07-deployment.md).

**Tóm tắt:**
- App đã **dockerized** → deploy được lên Railway/Render (đọc Dockerfile sẵn) hoặc VPS.
- DB → Supabase (đổi `DATABASE_URL`). Redis → Upstash. Storage → Supabase/MinIO.
- `.env` staging: `APP_ENV=staging`, `AUTH_MOCK_ENABLED=false`, secret thật.
- Cần file cấu hình nền tảng (`railway.toml`/`render.yaml`) — TODO.
- CI/CD (build image + deploy tự động) — làm tuần 3-4 (Tuấn Anh).

---

## 8. Logging & Monitoring

- Cấu hình ở `app/core/logging.py`: `LOG_LEVEL`, `LOG_FORMAT` (console/json).
- Staging/prod nên `LOG_FORMAT=json` để đẩy vào log aggregator.
- Middleware gắn `x-request-id` mỗi request (trace).
- Theo dõi: API call LLM (chi phí token), worker job status, lỗi `pre_scoring_failed`.

---

## 9. Checklist khi setup môi trường mới
- [ ] `cp .env.example .env`, điền secret (sinh JWT + Fernet key)
- [ ] `AUTH_MOCK_ENABLED` đúng môi trường (dev=true, khác=false)
- [ ] `docker compose up -d`, kiểm `docker compose ps` healthy
- [ ] `make migrate` (tạo schema)
- [ ] `make seed` (user mock — chỉ dev)
- [ ] Verify: `/health` 200, web `:5173` mở được, login 3 role OK

## Tham chiếu
- Deployment: [07-deployment.md](../05_architecture/tech-selection/07-deployment.md)
- Storage: [04-storage.md](../05_architecture/tech-selection/04-storage.md)
- Infra README: [infra/README.md](../../infra/README.md)
