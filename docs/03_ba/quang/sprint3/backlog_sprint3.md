# Product Backlog — Sprint 3 Extensions

**Owner:** Quang  
**Trạng thái:** Ready for Sprint Planning  
**Phạm vi:** Phân bổ công việc & Ước lượng cho 4 Module Sprint 3

---

## 1. Bảng phân bổ Backlog chi tiết

Bảng dưới đây đặc tả các User Stories cần triển khai trong Sprint 3, phân chia theo vai trò phát triển (Backend - BE, Frontend - FE, Test - QA) và mức độ ưu tiên:

| Mã Story | Phân hệ | Tên User Story | Trọng số (Story Point) | Ưu tiên (Priority) | Dev chính | Test chính |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **US-NOT-01** | Notification | Xem unread badge header & danh sách thông báo | 3 SP | High | Khải | Nhung |
| **US-NOT-02** | Notification | Tự động tạo thông báo từ sự kiện hệ thống (10 events) | 3 SP | High | Khải | Nhung |
| **US-NOT-03** | Notification | Đánh dấu đã đọc (đơn/loạt) & chuyển hướng deep link | 2 SP | Medium | Khải | Nhung |
| **US-IAA-01** | IAA | Giao diện cấu hình & cơ chế gán trùng thủ công | 2 SP | Medium | Tuấn Anh | Hưng |
| **US-IAA-02** | IAA | Tự động tính điểm IAA (Krippendorff's Alpha) khi duyệt xong | 5 SP | High | Tuấn Anh | Hưng |
| **US-IAA-03** | IAA | Giao diện báo cáo phân tích IAA (Color coding) | 3 SP | Medium | Tuấn Anh | Hưng |
| **US-IAA-04** | IAA | Cơ chế cảnh báo chất lượng thấp (Flag annotator < 0.60) | 1 SP | Low | Tuấn Anh | Hưng |
| **US-DIS-01** | Dispute | Gate logic & nút Escalate Dispute trên QA Workspace | 3 SP | High | Tuấn Anh | Nhung |
| **US-DIS-02** | Dispute | Đặc quyền Admin Override tạo dispute kèm ghi lý do | 2 SP | Medium | Tuấn Anh | Nhung |
| **US-DIS-03** | Dispute | Giao diện hàng đợi Dispute Queue & theo dõi SLA 5 ngày | 3 SP | High | Tuấn Anh | Nhung |
| **US-DIS-04** | Dispute | Quyết định giải quyết Dispute của Admin (Approve/Returned) | 3 SP | High | Tuấn Anh | Nhung |
| **US-CONEXP-01**| Export | Bộ lọc và giao diện yêu cầu xuất báo cáo tổng hợp | 2 SP | High | Tuấn Anh | Hưng |
| **US-CONEXP-02**| Export | Cơ chế Async Job xử lý Excel lớn & màn hình theo dõi tải file| 3 SP | High | Tuấn Anh | Hưng |
| **US-CONEXP-03**| Export | Trích xuất dữ liệu đa sheet (6 sheets) trong file XLSX | 5 SP | High | Tuấn Anh | Hưng |

---

## 2. Kế hoạch triển khai Sprint 3 (2 tuần)

### 📅 Tuần 1: Nền tảng database & Logic lõi Backend
*   **BA Team:** Hoàn thiện đặc tả schema (Đan), BPMN & Business rules (Quang), Wireframe (Tuyết).
*   **Dev Team:**
    *   Tạo migrations bổ sung các bảng: `notifications`, `disputes`, `iaa_scores`.
    *   Implement backend logic cho Notification module (Khải) và Dispute workflow (Tuấn Anh).
    *   Viết API Spec cho các endpoint chính: `/api/v1/notifications`, `/api/v1/disputes`.
*   **Test Team:** Thiết kế test cases cho Notification và Dispute, chuẩn bị dữ liệu test (Nhung + Hưng).

### 📅 Tuần 2: Xử lý logic phức tạp & Hoàn thiện Frontend
*   **BA Team:** Rà soát biên bản AC, nghiệm thu tài liệu spec, kiểm tra edge cases.
*   **Dev Team:**
    *   Cài đặt thuật toán tính Krippendorff's Alpha cho IAA (Tuấn Anh).
    *   Xây dựng worker xuất file Excel XLSX nhiều sheet không block main thread (Tuấn Anh).
    *   Hoàn thiện toàn bộ các trang frontend (Notifications, Disputes, Export consolidated, IAA Settings/Reports) (Khải + Tuấn Anh).
*   **Test Team:** Thực hiện test liên thông (Integration test), verify định dạng file Excel và độ chính xác của điểm IAA, chạy thử luồng Dispute E2E.

---

## 3. Definition of Ready (DoR) cho các Story

Trước khi chuyển các Story trên sang trạng thái **In Progress** để code trong Sprint 4, các điều kiện sau phải được đáp ứng:
1.  **UI/UX:** Giao diện của tính năng phải có wireframe hoặc mock-up được phê duyệt.
2.  **API Contract:** Tài liệu API Spec (Swagger/Redoc) cho các endpoint mới phải được thông qua.
3.  **Data Schema:** Schema database bổ sung phải được BA Đan và DBA/Tech Lead review.
4.  **Acceptance Criteria (AC):** Các tiêu chí nghiệm thu phải rõ ràng, không mâu thuẫn và được Test Team đồng ý.

---

*Tài liệu nội bộ VSF — Product Backlog Sprint 3 — Owner: Quang*
