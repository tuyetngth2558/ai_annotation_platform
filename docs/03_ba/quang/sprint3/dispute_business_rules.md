# Dispute Management — Business Rules

**Owner:** Quang  
**Trạng thái:** Draft for Review  
**Phạm vi:** Dispute Management Module (Sprint 3)  
**Tài liệu tham chiếu:** `docs/PROJECT_STATE.md` · `docs/03_ba/tuyet/05_Sprint3_Screen_Flow_Extensions.md` · `docs/03_ba/tuyet/06_Sprint3_Screen_Specification.md`

---

## 1. Mục tiêu và Định nghĩa

Module Dispute Management cung cấp cơ chế giải quyết bất đồng ý kiến gán nhãn giữa QA Specialist và Annotator, giúp tối ưu hóa chất lượng dữ liệu và làm rõ các hướng dẫn gán nhãn (guidelines) chưa rõ ràng.

### Thuật ngữ chính:
*   **Dispute (Tranh chấp):** Trạng thái phát sinh khi QA Specialist không đồng ý với kết quả gán nhãn của Annotator sau khi đã thực hiện quy trình chỉnh sửa tối thiểu theo quy định.
*   **Dispute Record (Bản ghi tranh chấp):** Thực thể lưu trữ thông tin tranh chấp bao gồm lý do, mô tả, thông tin tác nhân liên quan và lịch sử xử lý. Bản ghi này có tính **bất biến (immutable)** sau khi tạo.
*   **Admin Override (Ghi đè của Admin):** Quyền đặc biệt của Admin để tạo dispute cho một task bất kỳ mà không cần tuân theo các điều kiện thông thường.

---

## 2. Quy tắc nghiệp vụ (Business Rules - BR)

### BR-DIS-01: Điều kiện kích hoạt Dispute (Gate Logic)
Để QA Specialist có thể kích hoạt (escalate) Dispute trên giao diện, task phải thỏa mãn tất cả các điều kiện sau:
1.  **QA đã Return task ít nhất một (1) lần:** Task đã từng chuyển từ trạng thái `Submitted` sang `Returned`.
2.  **Annotator đã thực hiện Resubmit:** Trạng thái hiện tại của task là `Submitted` (lần 2 trở đi) sau khi Annotator đã sửa đổi và nộp lại.
3.  **Lần review tiếp theo của QA:** QA đang thực hiện đánh giá lại task đó và tiếp tục không đồng ý với kết quả gán nhãn.
*   *Lưu ý:* Nếu không thỏa mãn các điều kiện trên, nút "Escalate Dispute" trên giao diện QA Review Workspace sẽ bị **khóa (disabled)** và hiển thị tooltip giải thích lý do (ví dụ: *"Cần thực hiện Return task và đợi Annotator nộp lại trước khi escalate dispute"*).

### BR-DIS-02: Quyền đặc quyền Admin (Admin Override)
*   Admin có quyền tạo Dispute cho bất kỳ task nào ở trạng thái `Submitted`, `Returned` hoặc `Assigned` mà không cần tuân thủ **BR-DIS-01**.
*   Khi thực hiện Override, Admin bắt buộc phải nhập lý do override (`override_reason`, tối thiểu 10 ký tự). Hành động này phải ghi lại vào **Audit Log**.

### BR-DIS-03: Tính bất biến của Dispute Record (Safeguard)
*   Sau khi một Dispute Record được tạo (`status = Disputed`), thông tin chi tiết bao gồm `task_id`, `qa_id`, `reason_code`, `description`, `created_at` là **bất biến (immutable)**.
*   Không một vai trò nào (kể cả Admin) được quyền chỉnh sửa (Update) hoặc xóa (Delete) bản ghi Dispute đã tạo. Chỉ cho phép cập nhật trạng thái giải quyết (`status`, `resolved_by`, `resolved_at`, `resolution_note`) trong quá trình giải quyết.

### BR-DIS-04: Thời hạn xử lý (SLA) & Tự động gắn cờ Overdue
*   Thời hạn SLA để giải quyết một Dispute là **5 ngày làm việc** kể từ ngày tạo Dispute.
*   Nếu quá 5 ngày làm việc mà Dispute chưa được chuyển sang trạng thái `Resolved`, hệ thống sẽ:
    1.  Tự động cập nhật thuộc tính hiển thị thành **Overdue** (gắn cờ đỏ).
    2.  Gửi thông báo loại `dispute_overdue` đến Admin.
    3.  Highlight dòng dispute này trên giao diện Dispute Queue của Admin.

### BR-DIS-05: Ngưỡng kiểm soát chất lượng (Quality Gate Safeguard)
*   **Dispute Rate (Tỷ lệ tranh chấp):** Được tính bằng công thức:
    $$\text{Dispute Rate} = \frac{\text{Tổng số task có Dispute trong dự án}}{\text{Tổng số task đã submit của dự án}} \times 100\%$$
*   **Cảnh báo Quality Gate:** Nếu Dispute Rate của dự án vượt quá **5.0%**, hệ thống sẽ:
    *   Hiển thị cảnh báo màu đỏ nổi bật trên Dashboard của Admin và QA.
    *   Cung cấp tính năng cho phép Admin tạm dừng dự án (`Pause Project`) để xem xét lại Guideline.

### BR-DIS-06: Quyết định giải quyết Dispute (MVP Resolution)
Trong phạm vi MVP (Sprint 3/4), chỉ có **Admin** thực hiện resolve dispute. Admin bắt buộc chọn một trong hai hướng giải quyết và nhập lý do giải quyết (`resolution_note` tối thiểu 10 ký tự):
1.  **Approved (Chấp nhận):** Chấp nhận kết quả hiện tại của Annotator hoặc QA. Task chuyển sang trạng thái `Approved` (sẵn sàng export).
2.  **Re-annotation Required (Yêu cầu gán nhãn lại):** Chuyển task về trạng thái `Returned` để Annotator gán nhãn lại từ đầu. Task quay lại hàng đợi của Annotator.

---

## 3. Quản lý trạng thái Dispute (State Matrix)

| Trạng thái | Mô tả | Điều kiện chuyển (Trigger) | Tác nhân |
| :--- | :--- | :--- | :--- |
| **Disputed** | Dispute vừa được tạo, đang chờ xử lý. | QA bấm gửi Dispute hoặc Admin thực hiện Override. | QA Specialist / Admin |
| **Dispute In Review** | Admin đang mở xem chi tiết Dispute hoặc bắt đầu xử lý. | Admin truy cập chi tiết Dispute lần đầu tiên. | Admin / System |
| **Dispute Resolved — Approved** | Dispute đã giải quyết bằng cách duyệt kết quả gán nhãn. | Admin bấm Resolve và chọn "Approve current output". | Admin |
| **Dispute Resolved — Re-annotation** | Dispute đã giải quyết bằng cách yêu cầu gán nhãn lại. | Admin bấm Resolve và chọn "Re-annotation required". | Admin |
| **Dispute Overdue** | Dispute vượt quá SLA 5 ngày làm việc mà chưa được resolve. | System cronjob chạy kiểm tra hàng ngày (hoặc lúc load queue). | System |

---

## 4. Biên dịch mã lý do Dispute (Dispute Reason Codes)

Khi tạo Dispute, QA Specialist bắt buộc phải chọn một mã lý do (`reason_code`):

| Mã lý do | Nhãn hiển thị | Mô tả nghiệp vụ |
| :--- | :--- | :--- |
| `GUIDELINE_UNCLEAR` | Guideline không rõ ràng | Hướng dẫn hiện tại của dự án chưa bao phủ trường hợp của claim này, hoặc có sự mâu thuẫn. |
| `SCORE_DISAGREEMENT` | Bất đồng điểm số | Annotator và QA không thống nhất được điểm số dù đã giải trình qua return. |
| `EXTRACTION_ERROR` | Lỗi extraction / mapping | Văn bản claim trích xuất từ PDF bị lỗi hoặc mapping nguồn sai lệch nghiêm trọng. |
| `REPEATED_ERROR` | Pattern lỗi lặp lại | Annotator lặp lại cùng một lỗi hệ thống trên nhiều claim liên tiếp. |
| `OTHER` | Khác | Lý do khác (bắt buộc nhập mô tả chi tiết). |

---

*Tài liệu nội bộ VSF — Module Dispute Management — Owner: Quang*
