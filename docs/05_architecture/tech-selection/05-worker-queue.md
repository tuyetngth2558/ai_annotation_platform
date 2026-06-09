# 05 — Lựa chọn Worker / Job Queue

**Quyết định:** **ARQ** (async, dùng Redis)
**Trạng thái:** Đã chốt · **Ngày:** 2026-06-08

---

## 1. Bài toán cần giải

Sau khi Admin Confirm Import, hệ thống chạy pipeline **nền** (Screen Spec state
"Background Processing"):

```
parse PDF → normalize → extract source refs → claim extraction
→ source mapping → LLM pre-scoring (từng claim)
```

Đặc tính nghiệp vụ quyết định lựa chọn worker:

| Đặc tính | Nguồn | Hệ quả |
|---|---|---|
| Phần lớn thời gian **chờ LLM API** (I/O-bound) | US-03, pre-score per-claim | async tỏa sáng; sync phí process |
| Cần **retry** với max tries | EC-LLM-004 | worker phải có retry built-in |
| Job **dài** (1 bundle × nhiều claim × nhiều LLM call) | pre-scoring per-claim | cần job timeout dài, theo dõi progress |
| Trạng thái lỗi chi tiết (`pre_scoring_failed`) | VR-LLM-004 | worker báo lỗi rõ |
| Quy mô MVP nhỏ (4 tuần, 1 project) | scope | ưu tiên đơn giản, ít bộ phận |

**Mấu chốt:** nghiệp vụ ~90% là **chờ LLM** (I/O-bound). Đây là yếu tố phân loại worker.

---

## 2. Các phương án đã cân nhắc

| Tiêu chí | **ARQ** | Celery | RQ |
|---|---|---|---|
| Mô hình | **async/await native** | sync (async qua workaround) | sync (fork process) |
| Hợp I/O-bound (chờ LLM) | ✅ 1 worker chạy nhiều call đồng thời | ⚠️ prefork nhiều process, nặng RAM | ⚠️ mỗi job 1 fork, tốn |
| Retry built-in | ✅ | ✅ mạnh nhất | ✅ cơ bản |
| Khớp FastAPI (cùng async) | ✅ share code async | ⚠️ hai thế giới sync/async | ⚠️ sync |
| Phức tạp setup | ✅ nhẹ (chỉ Redis) | ❌ nặng (broker + result backend + flower) | ✅ nhẹ |
| Hệ sinh thái/tài liệu | trung bình | ✅ khổng lồ | khá |
| RAM/tài nguyên | ✅ thấp | ❌ cao (prefork) | trung bình |
| Hợp quy mô MVP | ✅ vừa khít | ⚠️ over-engineered | ✅ ok nhưng sync phí |

---

## 3. Phân tích ưu/nhược chi tiết

### ARQ (ĐÃ CHỌN)

**Ưu điểm:**
- **Async-native** — đây là điểm khớp mạnh nhất. Nghiệp vụ chờ LLM nhiều → 1 worker ARQ
  xử lý nhiều LLM call **đồng thời** mà không tốn thêm process/thread. Tận dụng đúng bản
  chất I/O-bound.
- **Cùng async với FastAPI** → **share code**: dùng chung `LLMProvider`, SQLAlchemy async
  session giữa API và worker, không viết 2 lần.
- **Nhẹ — chỉ cần Redis** (đã có trong stack cho cache/broker). Không cần result backend
  riêng như Celery. Setup tối giản hợp "build hẹp 4 tuần".
- Có retry built-in (cấu hình `max_tries`) cho bước gọi LLM (EC-LLM-004).

**Nhược điểm (và cách bù):**
- **Hệ sinh thái nhỏ hơn Celery** — ít plugin, ít tài liệu hơn. *Bù:* nhu cầu MVP đơn
  giản (1 pipeline), không cần tính năng nâng cao của Celery.
- **Ít người quen hơn Celery** — *Bù:* API ARQ đơn giản, học nhanh; lợi ích async đáng giá.
- Không có UI giám sát sẵn (Celery có Flower) — *Bù:* log + trạng thái task trong DB đủ
  cho MVP.

### Celery (KHÔNG CHỌN)

**Ưu:** mạnh nhất, retry/routing phong phú, hệ sinh thái khổng lồ, Flower UI.
**Nhược (lý do loại):**
- **Over-engineered cho MVP 4 tuần** — phải dựng thêm broker + result backend, lo prefork
  pool, RAM cao. Sức mạnh (routing phức tạp, triệu task) không dùng tới.
- **Sync-first** — với nghiệp vụ toàn chờ LLM I/O, dùng Celery nghĩa là process ngồi
  không trong lúc chờ → lãng phí tài nguyên.

### RQ (KHÔNG CHỌN)

**Ưu:** đơn giản, nhẹ, chỉ cần Redis.
**Nhược (lý do loại):**
- **Sync + fork mỗi job** — với job chờ LLM lâu, mỗi job ôm trọn 1 process ngồi đợi,
  lãng phí. Không tận dụng được I/O-bound như ARQ.

---

## 3b. Chi phí · Rủi ro · Phương án dự phòng

**Chi phí:** ARQ open-source miễn phí. Chỉ cần Redis (đã có trong stack). Dev = $0; staging
Redis dùng **Upstash free tier**. Không thêm hạ tầng so với Celery (đỡ result backend riêng).

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Hệ sinh thái/cộng đồng nhỏ hơn Celery | Trung bình | Nhu cầu MVP đơn giản (1 pipeline); API ARQ dễ học |
| Không có UI giám sát (Celery có Flower) | Thấp | Log + trạng thái task trong DB; thêm monitor sau nếu cần |
| Job LLM lỗi/treo giữa chừng | Cao | `max_tries` + `job_timeout` (EC-LLM-004); trạng thái `pre_scoring_failed` rõ |
| Redis chết → mất job đang chờ | Trung bình | Upstash managed; job idempotent theo bundle_id để chạy lại an toàn |

**Phương án dự phòng:** nếu sau cần tính năng nâng cao (routing phức tạp, lịch chạy định
kỳ, hàng triệu task), chuyển sang Celery — interface task đã tách (`jobs/tasks/`,
`jobs/pipelines/`) nên migration không phải viết lại logic pipeline.

## 4. Quyết định & lý do cô đọng

> **Chọn ARQ** vì nghiệp vụ ~90% là chờ LLM (I/O-bound): async cho phép 1 worker xử lý
> nhiều call đồng thời, không tốn process; cùng async với FastAPI nên share code; nhẹ,
> chỉ cần Redis — hợp "build hẹp 4 tuần".
>
> Celery bị loại (over-engineered, sync-first, nặng RAM cho job chờ I/O). RQ bị loại
> (sync, fork mỗi job → phí với job chờ LLM).
>
> *Ngoại lệ:* nếu team đã có người thạo Celery sẵn, lợi thế "quen tay" có thể bù phần
> nặng nề — nhưng team này chưa có, nên ARQ thắng rõ.

## 5. Hệ quả
- Worker entrypoint: `arq app.jobs.worker.WorkerSettings`.
- Cấu trúc: `jobs/worker.py` + `settings.py` + `tasks/` + `pipelines/import_pipeline.py`.
- Cần cấu hình `max_tries` / `job_timeout` cho bước gọi LLM (TODO — EC-LLM-004).
- Khi deploy: worker là 1 service riêng (đã có trong docker-compose), cần Redis (Upstash
  ở staging — xem [07 — Deployment](07-deployment.md)).

## 6. Tham chiếu
- ADR: [0004-worker-arq.md](../../adr/0004-worker-arq.md)
- Liên quan: [01 — Backend](01-backend-framework.md) (FastAPI cùng async), [07 — Deployment](07-deployment.md) (Redis khi deploy)
