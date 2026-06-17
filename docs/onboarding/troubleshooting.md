# Troubleshooting — Sự cố thường gặp

> Lỗi hay gặp khi setup/chạy dự án + cách sửa. Tìm lỗi của bạn theo nhóm.

---

## Docker / Compose

### `docker compose up` báo "port is already allocated"
Port (5432/6379/9000/8000/5173/9001) đang bị tiến trình khác chiếm.
```bash
# Tìm tiến trình chiếm port (vd 8000):
# Windows (PowerShell):
Get-NetTCPConnection -LocalPort 8000 | Select-Object OwningProcess
# Linux/Mac:
lsof -i :8000
```
→ Tắt tiến trình đó, hoặc đổi port trong `docker-compose.yml` (vd `8001:8000`).

### Container `api`/`worker` chết ngay (Exited)
```bash
docker compose logs api --tail 50          # xem lỗi thật
```
Nguyên nhân hay gặp:
- **Thiếu dependency** → rebuild: `docker compose build --no-cache api && docker compose up -d api`
- **`.env` thiếu/sai** → `cp .env.example .env`, kiểm biến.
- **venv bị volume mount che** (`arq`/`uvicorn` not found) → Dockerfile đã đặt venv ở
  `/opt/venv` ngoài `/app`. Nếu vẫn lỗi → `docker compose build --no-cache`.

### Sửa code mà không thấy reload
- API/Web mount volume → reload tự động. Nếu không: `docker compose restart api` (hoặc web).
- Đổi `Dockerfile`/deps → phải `docker compose build` lại.

### `docker compose down -v` lỡ xóa data
`-v` xóa cả volume (mất DB). Để giữ data: chỉ `docker compose down` (không `-v`).

---

## Database / Migration

### `alembic upgrade` lỗi / schema lệch
```bash
docker compose exec api alembic current     # đang ở revision nào
docker compose exec api alembic history      # lịch sử
docker compose exec api alembic upgrade head
```
- **"Target database is not up to date"** → chạy `upgrade head`.
- **Conflict / muốn làm lại từ đầu (DEV ONLY, mất data):**
  ```bash
  docker compose down -v && docker compose up -d postgres
  docker compose exec api alembic upgrade head
  ```

### Thêm model mà migration không thấy
- Import model mới vào `app/models/__init__.py` → Alembic autogenerate mới thấy.
- Rồi: `alembic revision --autogenerate -m "..."`.

### Không connect được DB
- Kiểm `DATABASE_URL` trong `.env`. Trong docker dùng host `postgres` (tên service), ngoài
  docker dùng `localhost`.
- `docker compose ps` xem postgres "healthy" chưa.

---

## Auth / Login

### Login mock báo sai dù đúng tài khoản
- Kiểm `AUTH_MOCK_ENABLED=true` trong `.env` (dev).
- Email đúng: `admin@vsf.local` / `annotator@vsf.local` / `qa@vsf.local`.

### Login trả 422 "value is not a valid email"
- Đã sửa: `LoginRequest.email` dùng `str` (không `EmailStr`) để chấp nhận domain `.local`.
- Nếu gặp lại sau khi đổi code → kiểm schema auth.

### Lên staging vẫn login được bằng mock
- **Lỗi bảo mật!** `AUTH_MOCK_ENABLED` phải `=false` ở staging/prod. Sửa `.env` staging.

---

## Frontend

### `npm install` lỗi / `npm run dev` không chạy
- Cần Node 20+. Kiểm `node --version`.
- Xóa cache: `rm -rf node_modules package-lock.json && npm install`.

### Trang trắng / lỗi import `@/...`
- Alias `@` = `src/` (cấu hình ở `vite.config.ts` + `tsconfig.json`). Kiểm import path.

### Đổi theme/ngôn ngữ không có tác dụng
- Theme: kiểm `ThemeProvider` bọc app (trong `App.tsx`).
- i18n: key phải có trong `locales/{vi,en}.json` đúng namespace.

### Test FE lỗi "useTheme phải dùng trong ThemeProvider"
- Component dùng theme → bọc `<ThemeProvider>` khi render trong test (xem
  `LoginPage.test.tsx`).

---

## Backend

### `ruff check` báo lỗi
```bash
docker compose exec api ruff check .         # xem lỗi
docker compose exec api ruff format .        # tự format
```

### pytest lỗi import / không tìm thấy module
- Chạy trong container (có Python 3.12 + deps): `docker compose exec api pytest`.
- Local Python 3.10 sẽ thiếu — dùng container.

### Endpoint trả 501
- **Đúng thiết kế** — route nghiệp vụ chưa implement (scaffold). Xem
  [PROJECT_STATE](../PROJECT_STATE.md) cái gì đã làm.

---

## MinIO / Storage

### Không vào được MinIO console
- URL: http://localhost:9001 (console), `minioadmin`/`minioadmin`.
- `:9000` là S3 API (không phải console).

### Bucket `vsf-pdf` không tồn tại
- Service `minio-init` tạo tự động. Nếu chưa: `docker compose up -d minio-init`.

---

## Playwright E2E

### `npx playwright test` báo thiếu browser
```bash
npx playwright install chromium
```

### E2E fail "connection refused"
- Cần `web` (:5173) + `api` (:8000) đang chạy: `docker compose up -d`.

---

## Vẫn không sửa được?

1. Xem log chi tiết: `docker compose logs <service> --tail 100`.
2. Kiểm [PROJECT_STATE](../PROJECT_STATE.md) — có phải tính năng chưa làm không.
3. Hỏi team, kèm **request_id** (từ response/log) nếu là lỗi API.
4. Reset sạch (DEV, mất data): `docker compose down -v && docker compose up -d --build`.
