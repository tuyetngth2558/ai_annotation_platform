# Hướng dẫn sử dụng — theo vai trò nghiệp vụ

Tài liệu hướng dẫn **người dùng cuối** của VSF AI Annotation Platform, theo 3 vai trò.

> ⚠️ **Trạng thái hiện tại:** ứng dụng đang ở giai đoạn **scaffold** — đăng nhập và điều
> hướng theo vai trò đã chạy, nhưng **các thao tác nghiệp vụ chưa được lập trình** (màn
> hình là skeleton, API trả "chưa triển khai"). Tài liệu này mô tả **luồng nghiệp vụ
> mong muốn theo thiết kế** (Screen Spec / AC) — phần nào *chưa chạy* được đánh dấu
> 🚧 **(skeleton)**. Khi dev hoàn thiện feature, gỡ dần nhãn này.

---

## 3 vai trò

| Vai trò | Làm gì | Hướng dẫn |
|---|---|---|
| **Admin** | Tạo dự án, cấu hình LLM, import PDF, gán nhân sự, export, xem audit | [admin.md](admin.md) |
| **Annotator** | Review claim, chấm 6 chiều, xác nhận nguồn, submit | [annotator.md](annotator.md) |
| **QA Specialist** | Duyệt (Approve) / trả lại (Return) kết quả annotator | [qa.md](qa.md) |

## Pipeline tổng thể

```
Admin: Import PDF Bundle
   ↓ (hệ thống tự động)
Parse PDF → Tách claim → LLM chấm điểm gợi ý (pre-score)
   ↓
Annotator: Review từng claim, chấm 6 chiều, submit
   ↓
QA: Approve (duyệt) hoặc Return (trả lại kèm lý do)
   ↓
Admin: Export CSV (chỉ claim đã Approved)
```

## Đăng nhập (demo)

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@vsf.local` | `admin-demo-2026` |
| Annotator | `annotator@vsf.local` | `annotator-demo-2026` |
| QA | `qa@vsf.local` | `qa-demo-2026` |

Mở http://localhost:5173 → đăng nhập → hệ thống tự đưa đến trang theo vai trò.
Đổi **ngôn ngữ (VI/EN)** và **giao diện sáng/tối** ở góc trên phải.

## 6 chiều đánh giá (Vivipedia)
| Mã | Tên | Ý nghĩa |
|---|---|---|
| SF | Source Faithfulness | Độ trung thành với nguồn |
| SC | Source Coverage | Độ bao phủ của nguồn |
| NH | Non-hallucination | Mức độ không bịa đặt |
| SQ | Source Quality | Chất lượng nguồn |
| REL | Relevance | Mức độ liên quan |
| COMP | Completeness | Độ đầy đủ |

Điểm mỗi chiều: **0.00–1.00** (2 chữ số thập phân). **Composite = trung bình đều 6 chiều.**
