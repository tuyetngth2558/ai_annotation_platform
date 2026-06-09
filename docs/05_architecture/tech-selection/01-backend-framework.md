# 01 — Lựa chọn Backend Framework

**Quyết định:** Python + **FastAPI**
**Trạng thái:** Đã chốt · **Ngày:** 2026-06-08

---

## 1. Bài toán cần giải

Backend của hệ thống phải gánh được các yêu cầu nghiệp vụ sau (trích từ docs BA):

| Yêu cầu | Nguồn | Hệ quả lên lựa chọn |
|---|---|---|
| Parse PDF (answer + source ref + source content) | DR-002, DR-007 | Cần thư viện PDF parsing mạnh |
| Gọi LLM: claim extraction + pre-scoring 6 chiều | US-02, US-03 | Cần SDK LLM tốt; nhiều thời gian chờ API (I/O-bound) |
| Validate điểm số regex `^(0(\.\d{1,2})?|1...)$` | BR-7.1 | Cần validation layer mạnh |
| Validate output LLM đúng schema 6 chiều | VR-LLM-001..004 | Structured validation |
| RBAC 3 role enforce cả UI lẫn API | docs AC mục 1 | Cần dependency injection cho auth |
| Background job (parse→claim→score) | AS-004, DR-011 | Cần tích hợp được job queue |

**Yếu tố quyết định lớn nhất:** PDF parsing + LLM + claim extraction — cả 3 đều có
hệ sinh thái mạnh nhất ở **Python**. Đây là điểm neo cho mọi lựa chọn phía sau.

---

## 2. Các phương án đã cân nhắc

### 2.1. Vì sao là Python (không phải Node.js/Go/Java)?

| Tiêu chí | Python | Node.js | Go |
|---|---|---|---|
| PDF parsing | ✅ pdfplumber, PyMuPDF (rất mạnh) | ⚠️ pdf.js (yếu hơn, thiên client) | ⚠️ ít lựa chọn chín |
| LLM SDK (Anthropic/OpenAI) | ✅ chín nhất, có sớm nhất | ✅ tốt | ⚠️ thường qua HTTP thuần |
| Claim extraction / NLP | ✅ hệ sinh thái lớn | ⚠️ hạn chế | ❌ yếu |
| Structured validation | ✅ Pydantic | ⚠️ zod (ok) | ✅ struct tag |
| Async I/O (chờ LLM) | ✅ asyncio | ✅ native | ✅ goroutine |
| Tốc độ thuần | ⚠️ chậm hơn | trung bình | ✅ nhanh |

**Kết luận:** Nghiệp vụ cốt lõi (PDF + LLM + NLP) nằm ở Python. Nếu chọn Node/Go thì
phải hoặc viết parser yếu hơn, hoặc tách 1 service Python riêng — phá vỡ "build hẹp"
của MVP 4 tuần. Tốc độ thuần không phải vấn đề vì hệ thống **I/O-bound** (phần lớn thời
gian chờ LLM API, không phải tính toán CPU). → **Chọn Python.**

### 2.2. Framework Python nào? FastAPI vs Django vs Flask

| Tiêu chí | **FastAPI** | Django + DRF | Flask |
|---|---|---|---|
| Mô hình async | ✅ async-native | ⚠️ async chưa tự nhiên (cần workaround cho LLM) | ⚠️ không async-native |
| Validation | ✅ Pydantic built-in (khớp BR-7.1, VR-LLM) | ⚠️ serializer riêng | ❌ tự lắp |
| Auto OpenAPI/docs | ✅ tự sinh `/docs` → contract cho FE & Test | ⚠️ qua package thêm | ❌ tự lắp |
| Dependency injection (RBAC) | ✅ `Depends()` gọn | ✅ permission classes | ❌ tự lắp |
| ORM/migration | linh hoạt (SQLAlchemy + Alembic) | ✅ ORM + migration sẵn | tự chọn |
| Admin panel sẵn | ❌ | ✅ (tiện xem audit log) | ❌ |
| Độ nặng / tốc độ khởi động | ✅ nhẹ | ❌ nặng | ✅ nhẹ |
| Hợp job chờ LLM (async) | ✅ rất hợp | ⚠️ thường cần Celery tách | ⚠️ |
| Đường cong học | ✅ thấp | trung bình | ✅ thấp |

---

## 3. Phân tích ưu/nhược chi tiết

### FastAPI (ĐÃ CHỌN)

**Ưu điểm:**
- **Async-native** — nghiệp vụ chờ LLM API rất nhiều (pre-score từng claim). FastAPI
  async cho phép 1 worker xử lý nhiều request/job đồng thời mà không tốn thread/process.
  Đây là điểm khớp mạnh nhất với bài toán.
- **Pydantic built-in** — validate điểm 0.00–1.00 (BR-7.1), validate output LLM đúng
  schema 6 chiều (VR-LLM) bằng cùng một công cụ, ngay tại boundary.
- **OpenAPI tự sinh** — có sẵn `/docs`, và FE generate được type TypeScript từ
  `/openapi.json` (xem [02](02-frontend-framework.md)). Test/QA cũng có contract rõ.
- **`Depends()` cho RBAC** — gắn `require_role(...)` / `require_project_role(...)` vào
  endpoint gọn gàng, enforce nhất quán cả API (docs AC mục 1).
- **Cùng async với ARQ worker** → share code (LLMProvider, SQLAlchemy async session)
  giữa API và worker, không viết 2 lần.
- Nhẹ, khởi động nhanh, cộng đồng lớn, học nhanh.

**Nhược điểm (và cách bù):**
- **Không có admin panel sẵn** (Django có) — bất tiện khi muốn xem nhanh dữ liệu/audit
  log. *Bù:* tự làm trang Audit Log trong app (đã có trong scope, AC mục 10); dev có
  thể dùng client DB (DBeaver) hoặc Supabase dashboard ở staging.
- **Phải tự lắp ORM + migration** (Django có sẵn) — *Bù:* SQLAlchemy 2.0 + Alembic là
  combo chuẩn, đã scaffold sẵn, autogenerate migration chạy tốt (đã verify 16 bảng).
- **Async dễ gây lỗi** nếu lập trình viên chưa quen (quên `await`, block event loop) —
  *Bù:* convention rõ trong code, review kỹ ở chỗ gọi I/O.

### Django + DRF (KHÔNG CHỌN)

**Ưu:** batteries-included (ORM, admin, auth, permission sẵn), admin panel tiện xem
audit log, cộng đồng cực lớn.
**Nhược (lý do loại):**
- **Async chưa tự nhiên** — với nghiệp vụ chờ LLM, Django thường phải prefork nhiều
  process hoặc tách Celery; nặng và không tận dụng được bản chất I/O-bound.
- **Nặng, nhiều phần không dùng tới** — MVP 4 tuần không cần phần lớn tính năng của
  Django; chi phí học/vận hành cao hơn lợi ích.
- Validation/serializer riêng, không gọn bằng Pydantic cho việc validate score/LLM schema.

### Flask (KHÔNG CHỌN)

**Ưu:** nhẹ nhất, linh hoạt, ai cũng biết.
**Nhược (lý do loại):**
- **Không async-native** — bất lợi rõ cho I/O-bound.
- **Phải tự lắp ráp gần như mọi thứ** (validation, OpenAPI, DI, structure) — tốn thời
  gian scaffolding mà MVP 4 tuần không có. FastAPI cho sẵn những thứ này.

---

## 3b. Chi phí · Rủi ro · Phương án dự phòng

**Chi phí:** FastAPI/Python miễn phí (open-source). Chi phí thực là **thời gian dev** —
FastAPI giảm chi phí này nhờ cho sẵn validation/OpenAPI/DI (ít phải tự lắp). Không phí
license, không vendor lock-in ngôn ngữ.

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Lập trình viên chưa quen async → bug (quên await, block event loop) | Trung bình | Convention rõ + review chỗ gọi I/O; test |
| Thiếu admin panel sẵn (so Django) | Thấp | Tự làm Audit Log UI (đã trong scope); dùng DBeaver/Supabase dashboard |
| Phải tự lắp ORM/migration | Thấp | SQLAlchemy 2.0 + Alembic là combo chuẩn, đã verify |
| Hiệu năng CPU-bound kém (Python chậm) | Thấp | Hệ thống I/O-bound (chờ LLM), không phải CPU-bound |

**Phương án dự phòng:** nếu sau cần phần CPU-heavy (vd parse PDF rất nặng), có thể tách
một service/worker riêng tối ưu, hoặc dùng thư viện C-binding (PyMuPDF). Không cần đổi
framework. Nếu thực sự phải đổi, API contract đã chuẩn hóa qua OpenAPI nên FE ít ảnh hưởng.

## 4. Quyết định & lý do cô đọng

> **Chọn Python + FastAPI** vì: (1) nghiệp vụ cốt lõi PDF + LLM + NLP neo vào Python;
> (2) hệ thống I/O-bound (chờ LLM) → async-native của FastAPI là khớp nhất; (3) Pydantic
> + OpenAPI + `Depends()` cho sẵn validation, contract và RBAC — đúng thứ MVP cần mà
> không phải tự lắp; (4) cùng async với ARQ worker → share code.
>
> Django bị loại vì nặng + async không tự nhiên cho job chờ LLM. Flask bị loại vì phải
> tự lắp quá nhiều trong 4 tuần.

## 5. Hệ quả

- Backend + worker + parser cùng Python → một codebase, share `LLMProvider`, session DB.
- Dùng SQLAlchemy 2.0 (async) + Alembic cho ORM/migration (bù phần Django có sẵn).
- Quản dependency bằng **uv** (nhanh, lock reproducible).
- Rủi ro async → cần convention + review ở chỗ gọi I/O.

## 6. Tham chiếu
- ADR: [0001-tech-stack.md](../../adr/0001-tech-stack.md)
- Liên quan: [05 — Worker/Queue](05-worker-queue.md) (ARQ cùng async), [03 — Database](03-database.md)
