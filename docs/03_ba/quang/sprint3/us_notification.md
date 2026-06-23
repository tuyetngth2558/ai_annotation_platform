# User Stories & AC — Notification Module

**Owner:** Quang  
**Trạng thái:** Draft for Review  
**Phạm vi:** Notification System (Sprint 3)  
**Tài liệu tham chiếu:** `docs/03_ba/tuyet/06_Sprint3_Screen_Specification.md` §2

---

## 1. Danh sách User Stories

### US-NOT-01: Xem danh sách thông báo và số lượng chưa đọc (All Users)
*   **Mô tả:**
    *   **As a** thành viên dự án (Admin, Annotator, QA),
    *   **I want to** nhìn thấy số lượng thông báo chưa đọc hiển thị trên thanh header và có thể xem danh sách thông báo chi tiết,
    *   **So that** tôi không bỏ lỡ các cập nhật quan trọng liên quan đến công việc của mình.
*   **Tiêu chí nghiệm thu (Acceptance Criteria):**
    1.  **Header Badge:** Icon hình quả chuông hiển thị ở góc phải Header luôn đi kèm badge hiển thị số lượng thông báo chưa đọc (`unread_count`). Badge ẩn đi nếu `unread_count = 0`. Nếu lớn hơn 99, hiển thị `99+`.
    2.  **Thông báo thời gian thực (Polling):** Hệ thống định kỳ gọi API `GET /api/v1/notifications/unread-count` mỗi **10 giây (Polling 10s)** để cập nhật số lượng badge.
    3.  **Toast Notification:** Khi số lượng thông báo chưa đọc tăng lên trong phiên làm việc, hệ thống hiển thị một pop-up toast ngắn (biến mất sau 3 giây) với nội dung: *"Bạn có thông báo mới"*.
    4.  **Màn hình Notification Center (`/notifications`):**
        *   Hiển thị danh sách toàn bộ thông báo phân trang (mặc định 20 thông báo/trang).
        *   Hỗ trợ 2 tab bộ lọc: **Tất cả (All)** và **Chưa đọc (Unread)**.
        *   Mỗi dòng thông báo hiển thị: Trạng thái (Chưa đọc/Đã đọc), Tiêu đề (Title), Nội dung tóm tắt (Body), Thời gian (Relative time như "2 phút trước", "1 ngày trước").
    5.  **Empty State:** Hiển thị hình minh họa trống và dòng chữ hướng dẫn khi không có thông báo nào thỏa mãn bộ lọc.

---

### US-NOT-02: Tự động kích hoạt thông báo từ các sự kiện hệ thống (System)
*   **Mô tả:**
    *   **As the** System,
    *   **I want to** tự động tạo bản ghi thông báo trong cơ sở dữ liệu khi có các sự kiện nghiệp vụ xảy ra,
    *   **So that** hệ thống phân phối thông tin đến đúng đối tượng người dùng liên quan.
*   **Tiêu chí nghiệm thu (Acceptance Criteria):**
    1.  Hệ thống bắt buộc phải tự động tạo thông báo với đúng `user_id` người nhận và định dạng nội dung tương ứng với 10 sự kiện sau:

| Mã sự kiện | Người nhận | Tiêu đề (Title) | Nội dung tóm tắt (Body) | Deep Link |
| :--- | :--- | :--- | :--- | :--- |
| `task_assigned` | Annotator được gán | `Task {claim_id} được giao cho bạn` | Dự án: {project_name} | `/tasks/{task_id}` |
| `task_returned` | Annotator thực hiện | `QA đã return task {claim_id}` | Lý do: {error_type} | `/tasks/{task_id}` |
| `dispute_created` | Admin + QA tạo | `Dispute mới: {dispute_id}` | Task: {claim_id} · QA: {qa_name} | `/disputes/{dispute_id}` |
| `dispute_resolved` | Admin + QA + Annotator | `Dispute {dispute_id} đã được xử lý` | Kết quả: {resolution_type} | `/disputes/{dispute_id}` |
| `export_ready` | Người tạo yêu cầu | `Báo cáo export sẵn sàng tải` | Dự án: {project_name} | `/export/jobs/{job_id}` |
| `sla_warning` | Annotator + Admin | `Task {claim_id} sắp quá hạn SLA` | Còn {hours}h để hoàn thành | `/tasks/{task_id}` |
| `dispute_overdue` | Admin | `⚠ Dispute {dispute_id} quá SLA` | Quá {days} ngày làm việc | `/disputes/{dispute_id}` |
| `guideline_published` | Tất cả Annotators | `Guideline dự án {project_name} vừa cập nhật` | Phiên bản mới yêu cầu xác nhận đã đọc | `/projects/{project_id}` |
| `llm_job_done` | Admin | `LLM pre-scoring hoàn tất — {batch_id}` | {task_count} task sẵn sàng cho annotator | `/projects/{project_id}` |
| `llm_job_failed` | Admin | `⚠ LLM pre-scoring thất bại — {batch_id}` | Kiểm tra cấu hình LLM hoặc retry | `/projects/{project_id}` |

    2.  **Bảo mật phân phối:** Đảm bảo tính riêng tư của thông báo:
        *   Annotator/QA tuyệt đối không nhận được thông báo của Admin (ví dụ: `llm_job_failed`, `dispute_overdue`).
        *   Thông báo `task_assigned` chỉ gửi duy nhất tới Annotator được phân công.

---

### US-NOT-03: Đánh dấu đã đọc và chuyển hướng nhanh (All Users)
*   **Mô tả:**
    *   **As a** thành viên dự án,
    *   **I want to** click vào một thông báo để đánh dấu là đã đọc và chuyển đến trang công việc tương ứng ngay lập tức,
    *   **So that** tôi có thể xử lý công việc một cách nhanh chóng nhất.
*   **Tiêu chí nghiệm thu (Acceptance Criteria):**
    1.  **Mark as Read (Đơn lẻ):** Khi click vào một dòng thông báo chưa đọc trong danh sách `/notifications`:
        *   Hệ thống gọi API `PATCH /api/v1/notifications/{id}/read` để cập nhật trạng thái `is_read = true`.
        *   UI cập nhật ngay lập tức: Icon unread chấm tròn xanh/đỏ biến mất, text chuyển sang font thường (thay vì in đậm).
        *   Số lượng badge trên header giảm đi 1.
    2.  **Deep Linking:** Ngay sau khi mark read thành công, hệ thống tự động chuyển hướng người dùng (navigation) tới URL được định nghĩa trong thuộc tính `deep_link` của thông báo đó.
    3.  **Mark All as Read (Hàng loạt):** Giao diện `/notifications` cung cấp nút "Đánh dấu tất cả đã đọc" (Mark all as read):
        *   Chỉ khả dụng khi có ít nhất một thông báo chưa đọc.
        *   Bấm nút sẽ gọi API `POST /api/v1/notifications/mark-all-read`.
        *   Tất cả thông báo hiển thị trên trang chuyển sang trạng thái đã đọc, badge unread trên header reset về `0`.

---

## 2. Quy tắc thiết kế database gợi ý (BA Handoff cho Dev)

Bảng `notifications` cần lưu trữ các thông tin tối thiểu sau:
*   `id` (Primary Key - UUID hoặc BigInt tự tăng).
*   `user_id` (Foreign Key link tới bảng `users` - Người nhận thông báo).
*   `event_type` (Enum hoặc Varchar đại diện cho 10 loại event ở trên).
*   `title` (Nội dung tiêu đề).
*   `body` (Nội dung chi tiết ngắn).
*   `deep_link` (Đường dẫn chuyển hướng).
*   `is_read` (Boolean, default `false`).
*   `created_at` (Timestamp, mặc định thời gian hiện tại).

---

*Tài liệu nội bộ VSF — User Stories Notification — Owner: Quang*
