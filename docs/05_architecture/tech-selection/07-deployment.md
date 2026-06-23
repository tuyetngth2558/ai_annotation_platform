# 07 — Lựa chọn Deployment / Hosting

**Hướng đã chốt:** Staging dùng **PaaS managed (Railway hoặc Render)** — chọn cụ thể
Railway/Render khi deploy thật.
**Để mở:** nền tảng production sau MVP (DEP-007) — quyết khi có nhu cầu scale.
**Trạng thái:** Hướng đã chốt; chi tiết nền tảng deploy thật chốt ở bước CI/CD (tuần 3-4).
· **Ngày:** 2026-06-09

> Khác với stack core (đã Accepted — [ADR 0001](../../adr/0001-tech-stack.md)): deployment
> để mở có chủ đích vì app đã dockerized → đổi nền tảng không sửa code (xem §4).

---

## 1. Bài toán cần giải

Cần đưa hệ thống lên môi trường truy cập được từ ngoài, chia 2 tầng:

| Tầng | Khi nào | Yêu cầu |
|---|---|---|
| **Staging** | MVP tuần 4 (demo/UAT) | URL public cho mentor/stakeholder; nhanh dựng; rẻ/free; ít công vận hành |
| **Production** | Sau MVP (nếu đi tiếp) | Scale, domain riêng, CI/CD, backup, monitoring, ổn định |

**Cái cần deploy** (DB và Storage đã quyết riêng — xem [03](03-database.md), [04](04-storage.md)):

```
app cần deploy:  api (FastAPI) + worker (ARQ) + web (React build) + redis
đã có sẵn:        DB → Supabase · Storage → Supabase/MinIO
```

Điểm quan trọng: hệ thống có **worker chạy nền (ARQ)** + **Redis** — không phải app web
đơn thuần. Đây là yếu tố phân loại các nền tảng (một số PaaS làm web rất dễ nhưng
worker/redis thì vướng).

---

## 2. Tầng STAGING (cho MVP)

### 2.1. Các phương án

| Nền tảng | Mô hình | Free tier | Worker + Redis | Ghi chú |
|---|---|---|---|---|
| **Railway** | PaaS, deploy từ Dockerfile/compose | Có credit hàng tháng | ✅ dễ (multi-service, Redis add-on) | Hợp app nhiều service |
| **Render** | PaaS | Có (web service free, ngủ khi idle) | ✅ background worker + Redis có | Web free ngủ sau 15ph idle |
| **Fly.io** | PaaS chạy container gần edge | Có free allowance | ✅ (machines + Upstash Redis) | Mạnh nhưng cấu hình phức tạp hơn |
| **VPS tự host** (DigitalOcean/Vultr) | docker-compose trên máy ảo | ❌ (trả phí ~5-10$/th) | ✅ toàn quyền | Tốn công vận hành/SSL/backup |
| Vercel / Netlify | PaaS thiên frontend | Có | ❌ **không hợp** worker/redis dài hạn | Chỉ hợp web tĩnh + serverless |

### 2.2. Phân tích ưu/nhược

**Railway (ĐỀ XUẤT cho staging)**
- **Ưu:** Deploy thẳng từ Dockerfile (đã có sẵn `infra/docker/`), khai báo nhiều
  service (api/worker/web) gọn; có Redis/Postgres add-on; có URL public ngay; credit
  free đủ cho staging MVP. Ít công vận hành nhất.
- **Nhược:** Credit free có hạn (hết phải trả); vendor-specific config (railway.toml);
  cold start nếu để idle lâu.

**Render (ĐỀ XUẤT thay thế ngang)**
- **Ưu:** Có background worker service riêng + Redis managed; tài liệu rõ; free tier cho web.
- **Nhược:** **Web service free ngủ sau 15 phút idle** → request đầu chờ ~30-50s (khó
  chịu khi demo bất chợt); worker free hạn chế.

**Fly.io**
- **Ưu:** Mạnh, chạy container thật gần người dùng, free allowance khá.
- **Nhược:** Cấu hình (`fly.toml`, volumes, Machines) phức tạp hơn Railway/Render — tốn
  thời gian học trong 4 tuần. Redis phải qua Upstash.

**VPS tự host (cho staging)**
- **Ưu:** Toàn quyền, `docker-compose up` y như dev, không phụ thuộc free tier.
- **Nhược (lý do không chọn cho MVP):** phải thuê VPS (tốn tiền), tự lo SSL/domain/backup
  để mentor truy cập — lấy mất *thời gian thật* khỏi việc build trong 4 tuần.

### 2.3. Loại bỏ
- **Vercel/Netlify:** thiên frontend tĩnh + serverless function, **không hợp** worker
  ARQ chạy nền dài hạn + Redis. Có thể dùng *chỉ cho phần web build* nếu sau tách FE
  riêng, nhưng MVP để cả stack một chỗ cho gọn.

---

## 3. Tầng PRODUCTION (định hướng sau MVP)

Khi dự án đi tiếp (đa project, tải thật), cân nhắc lại theo nhu cầu:

| Hướng | Khi nào phù hợp | Ưu | Nhược |
|---|---|---|---|
| **PaaS trả phí** (Railway/Render paid) | Team nhỏ, muốn ít vận hành | Scale dễ, CI/CD tích hợp, backup managed | Chi phí tăng theo scale; vendor lock-in nhẹ |
| **VPS tự host** (docker-compose / Docker Swarm) | Muốn kiểm soát + chi phí cố định | Toàn quyền, rẻ ở scale vừa | Tự lo SSL, backup, monitoring, update |
| **Kubernetes** (managed: GKE/EKS) | Khi scale lớn, nhiều service | Auto-scale, self-heal | Quá nặng cho giai đoạn này — **chưa cần** |

**Khuyến nghị:** chưa quyết production bây giờ. Vì app đã **đóng gói docker chuẩn**, chuyển
từ PaaS staging sang VPS/PaaS prod chỉ là đổi nơi chạy cùng image — không sửa code. Giữ
quyết định mở tới khi có nhu cầu thật (DEP-007).

---

## 4. Điểm mấu chốt giúp KHÔNG lock-in

Mọi lựa chọn deploy đều **hoãn được** vì:
- App đã **dockerized** (`infra/docker/*.Dockerfile` + `docker-compose.yml`) → chạy được
  ở bất kỳ đâu nhận Docker.
- Mọi khác biệt môi trường nằm trong **`.env`** (DATABASE_URL, REDIS_URL, S3_*...) —
  không hardcode.
- DB và Storage đã tách managed/interface riêng.

→ Chọn Railway hôm nay, đổi sang VPS mai sau = đổi nơi deploy + biến môi trường, **không
viết lại code**.

---

## 5. Quyết định & lý do cô đọng

> **Staging MVP: Railway** (hoặc Render nếu thích) — vì cần URL demo nhanh, free, ít công
> vận hành, và hỗ trợ tốt mô hình nhiều service (api + worker + redis + web) từ Dockerfile
> có sẵn. Loại Vercel/Netlify (không hợp worker nền). Loại VPS cho MVP (tốn công vận hành
> trong 4 tuần).
>
> **Production: chưa chốt** — giữ mở tới khi có nhu cầu scale thật. Nhờ dockerized + .env,
> chuyển nền tảng không phải sửa code.

## 6. Hệ quả & việc cần làm
- Cần tạo file cấu hình deploy cho nền tảng chọn (vd `railway.toml` / `render.yaml`) — TODO.
- CI/CD (build image + deploy tự động) — thuộc DEP (Tuấn Anh phụ trách), làm ở tuần 3-4.
- Staging cần set `.env` riêng: `AUTH_MOCK_ENABLED=false`, `DATABASE_URL` → Supabase,
  `REDIS_URL` → Upstash, secret thật.

## 7. Tham chiếu
- ADR: [0001-tech-stack.md](../../adr/0001-tech-stack.md)
- Liên quan: [03 — Database](03-database.md) (Supabase staging), [04 — Storage](04-storage.md),
  [05 — Worker](05-worker-queue.md) (ARQ cần Redis khi deploy)
- DEP-006 (dev env), DEP-007 (LLM provider/hạ tầng) — docs/03_ba/tuyet/04
