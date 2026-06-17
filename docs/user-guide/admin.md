# Hướng dẫn — Admin

Admin quản lý dự án, dữ liệu và nhân sự. Đăng nhập: `admin@vsf.local` / `admin-demo-2026`.

> 🚧 = chức năng đang là skeleton (chưa lập trình). Mô tả theo thiết kế (AC / Screen Spec).

---

## Tổng quan quyền Admin

Admin toàn quyền: tạo/cấu hình dự án, import dataset, gán nhân sự, export kết quả, xem
audit log. (Annotator/QA chỉ thấy phần được giao.)

Menu (sidebar): **Tổng quan · Dự án · Nhập PDF Bundle · Xuất dữ liệu · Nhật ký hệ thống**.

---

## 1. Tạo dự án 🚧

`Dự án → Tạo mới`. Form gồm (AC-1.1, AC-1.2):
- **Tên dự án** (bắt buộc, 3–100 ký tự)
- **Mô tả** (tùy chọn)
- **Modality**: khóa cứng `Text` trong MVP (BR-1.1)
- **Deadline** (tùy chọn)
- **Cấu hình LLM**: API Endpoint, API Key, Model Name, Prompt Template
  - API Key được **mã hóa khi lưu**, hiển thị dạng `••••••••` (BR-1.2)
  - Prompt **bắt buộc chứa** `{{claim_text}}` và `{{source_context}}` (BR-1.3)

---

## 2. Import PDF Bundle 🚧

`Nhập PDF Bundle`. Đây là **đầu vào chính** của MVP (không phải CSV/JSON).

**Mỗi bundle (1 bài) cần:**
| Loại file | Số lượng | Mô tả |
|---|---|---|
| `answer_pdf` | 1 | PDF câu trả lời gốc |
| `source_ref_pdf` | 1 | PDF danh sách nguồn (thứ tự, tiêu đề, tier) |
| `source_content_pdf` | ≥1 | PDF nội dung nguồn để đối chiếu |

**Luồng:** kéo-thả file → gán vai trò (`file_role`) cho từng file → hệ thống **validate**
(đủ file, PDF hợp lệ, không trùng vai trò) → **xem trước parse** (metadata, danh sách
nguồn, cảnh báo) → **Confirm Import**.

Sau Confirm: hệ thống chạy nền **parse → tách claim → chấm điểm gợi ý (pre-score)**, rồi
task vào hàng đợi annotator. (Lỗi LLM → trạng thái `Pre-scoring Failed`, có nút **Retry**.)

---

## 3. Gán nhân sự 🚧

Trong project: chọn **Annotator** (≥1) và **QA Specialist** để giao việc (AC-1.3). Annotator
chỉ thấy task được giao cho mình (không thấy của người khác).

---

## 4. Export CSV 🚧

`Xuất dữ liệu`. Chỉ Admin export được (AC-9.1).
- Chọn Project / Batch / Status (mặc định **Approved**) / Format (CSV claim-level).
- File: `export_claims_batch_[BatchID]_[YYYYMMDD_HHMMSS].csv`.
- **Chỉ xuất claim đã Approved** (BR-9.1). Mỗi dòng = 1 claim, trace về `bundle_id` + tên
  file PDF gốc.

---

## 5. Nhật ký hệ thống (Audit Log) 🚧

`Nhật ký hệ thống` — chỉ Admin xem (AC-10.2). Ghi mọi thao tác chính: import, claim edit,
submit, approve, return, export. Bản ghi **không sửa/xóa được** (INSERT-only, BR-10.1).

---

## Đã chạy được hiện tại ✅
- Đăng nhập với tài khoản Admin → vào Dashboard.
- Điều hướng giữa các trang (Dự án / Import / Export / Audit) — hiển thị skeleton + ghi chú TODO.
- Đổi ngôn ngữ VI/EN, giao diện sáng/tối, đăng xuất.

## Tham chiếu
- AC & Business Rules: [docs/03_ba/quang/...](../03_ba/quang/VSF_AI_Annotation_Platform_AC_and_Business_Rules.md)
- Screen Spec: [docs/03_ba/tuyet/03_Screen_Specification.md](../03_ba/tuyet/03_Screen_Specification.md)
- Import schema: [docs/03_ba/dan/02_Import_Export_Schema.md](../03_ba/dan/02_Import_Export_Schema.md)
