# Hướng dẫn — Annotator (Người gán nhãn)

Annotator review từng claim và chấm điểm. Đăng nhập: `annotator@vsf.local` /
`annotator-demo-2026`.

> 🚧 = chức năng đang là skeleton (chưa lập trình). Mô tả theo thiết kế (AC / Screen Spec).

---

## Bạn làm gì

Với mỗi **claim** (mệnh đề được tách từ câu trả lời): đọc claim + nguồn, **chấm 6 chiều
điểm**, xác nhận trạng thái nguồn, rồi **Submit** cho QA duyệt. Bạn **chỉ thấy task được
giao cho mình** (OQ-008).

---

## 1. Danh sách công việc (My Tasks) 🚧

`Công việc của tôi` — danh sách claim được giao. Mở 1 claim để vào màn gán nhãn.

---

## 2. Màn gán nhãn (Annotation Workspace) 🚧

Bố cục 3 cột (Screen Spec màn 2):

**Cột trái — Ngữ cảnh câu trả lời:**
- Metadata bài (mã bài, tiêu đề, danh mục, tier, confidence)
- Toàn văn câu trả lời (read-only), highlight đoạn liên quan claim
- Citation markers `[1]`, `[2]`...

**Cột giữa — Claim & Chấm điểm:**
- Nội dung claim (có thể **sửa** nếu tách chưa chuẩn → lưu thành bản final, ghi audit)
- **Bảng 6 chiều**: mỗi chiều hiển thị **điểm gợi ý AI (pre-score)** + ô nhập điểm của bạn
  - Điểm: 0.00–1.00, tối đa 2 chữ số thập phân
  - Bạn **giữ nguyên** hoặc **sửa** (override) điểm gợi ý
  - **Lệch pre-score ≥ ±0.20** ở chiều nào → **bắt buộc nhập lý do** (≥15 ký tự) cho chiều đó (BR-7.3)
- **Composite Score** = trung bình đều 6 chiều, cập nhật real-time

**Cột phải — Nguồn (Source Viewer):**
- Danh sách nguồn: thứ tự, tiêu đề, tier, URL (nếu có), nội dung trích từ PDF
- **Xác nhận trạng thái mỗi nguồn**: truy cập được / một phần / không liên quan / **không
  truy cập được**
  - Nếu "không truy cập được" → **bắt buộc ghi chú** (VR-ANN-004)
  - Nếu nguồn inaccessible → điểm **SC tự động = 0.00** và ô SC bị khóa (BR-4.1)

---

## 3. Auto-save & Submit 🚧

- **Tự động lưu nháp** mỗi 30 giây (và khi rời ô nhập) — không cần bấm Save (BR-6.1).
- **Submit** chỉ bật khi: đủ 6 chiều điểm hợp lệ + đã xác nhận trạng thái nguồn + đã nhập
  lý do nếu lệch ngưỡng + claim text không rỗng (BR-6.2).
- Submit xong → task chuyển sang QA, bạn sang claim tiếp theo.

---

## 4. Task bị trả lại (Returned) 🚧

Nếu QA **Return** task: bạn thấy banner đỏ + loại lỗi + comment của QA. Sửa theo phản hồi
rồi **Resubmit**.

---

## Đã chạy được hiện tại ✅
- Đăng nhập Annotator → vào trang "Công việc của tôi" (skeleton).
- Điều hướng, đổi ngôn ngữ/giao diện, đăng xuất.

## Tham chiếu
- AC mục 6/7: [docs/03_ba/quang/...](../03_ba/quang/VSF_AI_Annotation_Platform_AC_and_Business_Rules.md)
- Validation (VR-ANN): [docs/03_ba/dan/03_Validation_Rules.md](../03_ba/dan/03_Validation_Rules.md)
- Screen Spec màn 2: [docs/03_ba/tuyet/03_Screen_Specification.md](../03_ba/tuyet/03_Screen_Specification.md)
