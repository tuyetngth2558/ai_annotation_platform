# Logging & Observability — Quy ước

> Chuẩn ghi log & giám sát cho team. Mục tiêu: log có ích để debug/giám sát, **không bao
> giờ lộ secret/PII**, và trace được 1 request xuyên hệ thống.

---

## 1. Logging trong code (backend)

### Dùng logger, KHÔNG dùng `print`
```python
from app.core.logging import get_logger
logger = get_logger(__name__)

logger.info("Bắt đầu parse bundle %s", bundle_id)
logger.warning("Source URL không parse được, bỏ qua")
logger.error("LLM call thất bại", exc_info=True)   # exc_info để log traceback
```

### Format tự động theo môi trường
- **Dev** (`LOG_FORMAT=console`): dòng dễ đọc, có `[request_id]`.
- **Staging/prod** (`LOG_FORMAT=json`): mỗi log 1 dòng JSON → đẩy vào Loki/ELK/CloudWatch.
  ```json
  {"ts":"2026-06-09T...","level":"INFO","logger":"app.jobs...","request_id":"a1b2","msg":"..."}
  ```
- Cấu hình: `LOG_LEVEL` (DEBUG/INFO/WARNING/ERROR), `LOG_FORMAT` (console/json) trong `.env`.

### Request ID (trace 1 request)
- Middleware gắn `x-request-id` mỗi request + đưa vào contextvar.
- **Mọi log trong cùng request tự kèm `request_id`** → lọc log theo 1 request dễ dàng.
- Response trả header `x-request-id`; lỗi (`ErrorResponse`) cũng kèm `request_id` → user
  báo lỗi kèm id này, dev tra log nhanh.

### Log level dùng khi nào
| Level | Khi nào |
|---|---|
| `DEBUG` | Chi tiết debug (chỉ bật khi cần; tắt ở prod) |
| `INFO` | Sự kiện bình thường: bắt đầu/xong job, import, submit |
| `WARNING` | Bất thường nhưng xử lý được: source thiếu URL, retry |
| `ERROR` | Lỗi cần chú ý: LLM fail, DB lỗi, exception |

---

## 2. ⛔ KHÔNG BAO GIỜ log những thứ này

| Cấm log | Vì sao |
|---|---|
| Password (plain hoặc hash) | Lộ credential |
| JWT / access token / refresh token | Chiếm phiên |
| **LLM API key** | Lộ key trả phí (BR-1.2 yêu cầu encrypt) |
| `SECRET_ENCRYPTION_KEY`, `JWT_SECRET` | Lộ khóa hệ thống |
| Nội dung `.env` | Tổng hợp secret |
| PII nhạy cảm không cần thiết | Tuân thủ dữ liệu |

**An toàn để log:** request_id, user_id (uuid), tên action, status, mã lỗi, URL (không kèm
token trong query), thời gian, số lượng. Log URL được coi là an toàn — nhưng **đảm bảo URL
không chứa token/secret ở query string**.

> Khi log object/dict, kiểm tra không vô tình dump cả field secret. Mask trước khi log
> (vd `mask_secret()` trong `core/crypto.py`).

---

## 3. Audit log (nghiệp vụ — khác application log)

| | Application log | Audit log |
|---|---|---|
| Là gì | App ghi khi chạy (debug/giám sát) | Nghiệp vụ: ai làm gì (BR-10.1) |
| Lưu ở | stdout → aggregator | Bảng `audit_log` (DB) |
| Tính chất | có thể xoay vòng/xóa | **INSERT-only, immutable** |
| Ghi khi | bất cứ đâu cần | import/claim_edit/submit/approve/return/export (AC-10) |

Audit log: bảng `audit_log` (model đã có), ghi qua service khi có action nghiệp vụ chính.
Migration sau sẽ `REVOKE UPDATE,DELETE` để đảm bảo immutable (xem `infra/postgres/init.sql`).
**Không nhầm 2 loại** — application log để debug, audit log để truy vết nghiệp vụ.

---

## 4. Monitoring (giám sát)

### Health check
- API: `GET /health` (dùng cho docker healthcheck, uptime monitor).
- Service: postgres/redis/minio có healthcheck trong docker-compose.

### Cần theo dõi (khi vận hành thật)
| Hạng mục | Theo dõi gì | Vì sao |
|---|---|---|
| **Chi phí LLM** | token mỗi call (input/output), số call | Kiểm soát chi phí (xem [08-llm-provider](../05_architecture/tech-selection/08-llm-provider.md)) |
| **Worker (ARQ)** | job status, job fail, thời gian job | Phát hiện `pre_scoring_failed`, treo |
| **API** | error rate, latency, 5xx | Sức khỏe hệ thống |
| **DB** | connection, slow query | Tránh cạn connection (Supabase free giới hạn) |

### Gợi ý tool (sau MVP)
- Log: Grafana Loki / ELK (nhận JSON log).
- Metrics: Prometheus + Grafana (nếu cần).
- Uptime: UptimeRobot / healthcheck của nền tảng deploy.
- Chi phí LLM: log token → dashboard đơn giản; đặt budget alert ở provider.

---

## 5. Checklist khi thêm log vào code

- [ ] Dùng `get_logger(__name__)`, không `print`
- [ ] Level đúng (INFO/WARNING/ERROR)
- [ ] **Không log secret/PII**
- [ ] Lỗi quan trọng có `exc_info=True`
- [ ] Message rõ nghĩa, có context (id liên quan)

## Tham chiếu
- Code: `src/backend/app/core/logging.py`, `core/middleware.py`
- Audit log: AC mục 10, BR-10.1 ([docs/03_ba/quang/...](../03_ba/quang/VSF_AI_Annotation_Platform_AC_and_Business_Rules.md))
- Chi phí LLM: [08-llm-provider.md](../05_architecture/tech-selection/08-llm-provider.md)
