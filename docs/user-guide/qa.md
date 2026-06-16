# Hướng dẫn — QA Specialist (Người kiểm duyệt)

QA duyệt kết quả của Annotator. Đăng nhập: `qa@vsf.local` / `qa-demo-2026`.

> 🚧 = chức năng đang là skeleton (chưa lập trình). Mô tả theo thiết kế (AC / Screen Spec).

---

## Bạn làm gì

Với mỗi task annotator đã submit: xem lại điểm, so sánh với điểm gợi ý AI, rồi quyết định
**Approve** (duyệt) hoặc **Return** (trả lại kèm lý do). **MVP chỉ có 2 hành động này** —
không sửa điểm trực tiếp, không có dispute (BR-8.1).

---

## 1. Hàng đợi QA (QA Queue) 🚧

`Hàng đợi QA` — danh sách task đã submit cần duyệt. Mở 1 task để review.

---

## 2. Màn duyệt (QA Review Workspace) 🚧

Screen Spec màn 3:

**Diff view — so sánh điểm:**
| Cột | Nội dung |
|---|---|
| LLM Baseline | Điểm gợi ý AI (pre-score, bất biến) |
| Annotator | Điểm annotator đã chấm |
| Delta | Chênh lệch |

→ Các chiều **chênh lệch ≥ 0.20** được **làm nổi bật** (đổi màu) để bạn chú ý (AC-8.1).

**Thông tin kèm theo:**
- Claim text (bản final nếu annotator đã sửa — có badge "đã sửa")
- Danh sách nguồn + trạng thái nguồn annotator xác nhận
- Ghi chú của annotator
- Lịch sử task (số lần submit/return)

---

## 3. Hành động: Approve / Return 🚧

**Approve (Duyệt):**
- Bấm `Approve` → task chuyển **Approved**, khóa không sửa nữa (AC-8.2).
- Không bắt buộc comment.
- Task Approved mới đủ điều kiện **Export**.

**Return (Trả lại):**
- Bấm `Return` → modal yêu cầu:
  - **Loại lỗi** (bắt buộc chọn 1): Factual Error / Guideline Violation / Source Mismatch
    / Incomplete / Other
  - **Comment** (bắt buộc, ≥10 ký tự — BR-8.2)
- Xác nhận → task quay về hàng đợi annotator kèm phản hồi (AC-8.3).

Mọi Approve/Return được ghi vào lịch sử + audit log (BR-8.3).

---

## Đã chạy được hiện tại ✅
- Đăng nhập QA → vào "Hàng đợi QA" (skeleton).
- Điều hướng, đổi ngôn ngữ/giao diện, đăng xuất.

## Lưu ý phạm vi MVP
- QA **không** sửa điểm/claim trực tiếp — chỉ Approve hoặc Return.
- **Không** có dispute workflow (DEC-003).
- MVP review **100% task** (chưa có sampling).

## Tham chiếu
- AC mục 8: [docs/03_ba/quang/...](../03_ba/quang/VSF_AI_Annotation_Platform_AC_and_Business_Rules.md)
- Validation (VR-QA): [docs/03_ba/dan/03_Validation_Rules.md](../03_ba/dan/03_Validation_Rules.md)
- Screen Spec màn 3: [docs/03_ba/tuyet/03_Screen_Specification.md](../03_ba/tuyet/03_Screen_Specification.md)
