# Deploy lên Vercel (frontend) + Render (backend)

> Hướng dẫn dựng staging cho **demo MVP**. Kiến trúc: **Supabase (DB) + Render
> (FastAPI) + Vercel (React/Vite)**. Tham chiếu: [ADR 07-deployment](../../05_architecture/tech-selection/07-deployment.md).

## TL;DR cho demo

Pipeline nghiệp vụ còn skeleton (API trả `501`) → chỉ cần demo **login + điều hướng**.
Vì vậy chỉ deploy **API + frontend**, dùng **mock auth**. Worker/Redis hoãn (xem cuối file).

```
[ Vercel ]  React build (vsf-annotation.vercel.app)
     │  fetch  VITE_API_BASE_URL
     ▼
[ Render ]  FastAPI  (vsf-api.onrender.com)  ── DATABASE_URL ──▶ [ Supabase ]
```

3 tài khoản mock (demo): `admin@vsf.local` / `admin-demo-2026`,
`annotator@vsf.local` / `annotator-demo-2026`, `qa@vsf.local` / `qa-demo-2026`.

---

## Bước 1 — Backend lên Render (Blueprint)

File [`render.yaml`](../../../render.yaml) ở gốc repo khai báo sẵn service `vsf-api`.

1. Render Dashboard → **New → Blueprint** → kết nối repo → chọn nhánh → **Apply**.
   Render đọc `render.yaml`, tạo service `vsf-api` (Docker, plan free).
2. Khi hỏi các biến `sync:false`, điền (lấy từ Supabase project đã có,
   ref `widkoobhvazkwgdytezd`, format đầy đủ ở [`src/backend/.env.example`](../../../src/backend/.env.example)):

   | Biến | Giá trị |
   |---|---|
   | `DATABASE_URL` | `postgresql+asyncpg://postgres.<ref>:<pwd>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres` |
   | `DATABASE_URL_SYNC` | như trên nhưng `postgresql+psycopg://...` |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | (Supabase → Settings → API) — **secret, không commit** |
   | `CORS_ORIGINS` | điền **sau Bước 2** = URL Vercel |
   | `SECRET_ENCRYPTION_KEY`, `S3_*`, `LLM_*` | có thể để trống cho demo |

   > Dùng **Shared Pooler (port 5432, host `...pooler.supabase.com`)** — IPv4
   > compatible. KHÔNG dùng `db.<ref>.supabase.co` (chỉ IPv6, Render không kết nối được).

3. Deploy xong → mở `https://<service>.onrender.com/health` → phải trả `{"status":"ok"}`.

> ⚠️ **Web service free ngủ sau ~15 phút idle** → request đầu tiên chờ ~30-50s.
> Trước khi demo, mở `/health` 1 lần cho service "thức dậy".

---

## Bước 2 — Frontend lên Vercel

File [`src/frontend/web/vercel.json`](../../../src/frontend/web/vercel.json) đã cấu hình SPA rewrite (React Router).

1. Vercel → **Add New → Project** → import repo.
2. **Root Directory** = `src/frontend/web` (quan trọng — đây là monorepo).
   Framework tự nhận **Vite**; build `npm run build`, output `dist`.
3. **Environment Variables**:

   | Biến | Giá trị |
   |---|---|
   | `VITE_API_BASE_URL` | `https://<service>.onrender.com` (URL Render ở Bước 1, **không** kèm `/api/v1`) |

4. Deploy → lấy URL (vd `https://vsf-annotation.vercel.app`).

---

## Bước 3 — Nối CORS

Quay lại Render → service `vsf-api` → Environment → đặt
`CORS_ORIGINS = https://vsf-annotation.vercel.app` → **Save** (service redeploy).

→ Mở URL Vercel, login bằng tài khoản mock → điều hướng theo role chạy được.

---

## ⚠️ Sau demo — bắt buộc

- **`AUTH_MOCK_ENABLED=true` chỉ cho demo.** Khi login thật xong
  ([`auth/service.py`](../../../src/backend/app/features/auth/service.py) `login()` còn `raise`),
  đặt lại `false`. Staging/prod không được để mock.
- **Service role key Supabase** là secret cấp cao — chỉ đặt qua env Render,
  không commit, cân nhắc rotate nếu từng lộ.

## Bật Worker + Redis (khi pipeline chạy thật)

Chưa cần cho demo. Khi cần: bỏ comment block `vsf-worker` + `vsf-redis` trong
[`render.yaml`](../../../render.yaml) và đổi `REDIS_URL` của `vsf-api` sang `fromService`
(hướng dẫn ngay trong file). Lưu ý: **Render background worker không có free tier** (~$7/th).
