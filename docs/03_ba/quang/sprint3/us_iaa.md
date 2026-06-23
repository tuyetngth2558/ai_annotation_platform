# User Stories & AC — Inter-Annotator Agreement (IAA)

**Owner:** Quang  
**Trạng thái:** Draft for Review  
**Phạm vi:** Inter-Annotator Agreement Module (Sprint 3)  
**Tài liệu tham chiếu:** `docs/03_ba/tuyet/06_Sprint3_Screen_Specification.md` §8 & §8b

---

## 1. Danh sách User Stories

### US-IAA-01: Cấu hình tỷ lệ gán trùng (Overlap Config) và nhân sự (Admin)
*   **Mô tả:**
    *   **As an** Admin,
    *   **I want to** cấu hình tỷ lệ task gán trùng và lựa chọn cặp Annotator thực hiện gán trùng trong cấu hình dự án,
    *   **So that** hệ thống có thể tự động phân phối các task gán trùng nhằm đo lường độ đồng thuận gán nhãn.
*   **Tiêu chí nghiệm thu (Acceptance Criteria):**
    1.  **Giao diện Cấu hình:** Admin truy cập `Project Detail -> Config -> IAA Settings` để cấu hình các thông số:
        *   Tỷ lệ gán trùng (`overlap_percent`): Ô nhập số, chấp nhận khoảng giá trị từ `5%` đến `30%` (mặc định là `10%`).
        *   Cặp gán nhãn trùng (`overlap_annotator_ids`): Chọn chính xác hai (2) tài khoản người dùng có vai trò `Annotator` trong dự án. Hai annotator được chọn phải khác nhau.
        *   Phương pháp tính (`iaa_metric`): Mặc định hiển thị dưới dạng Read-only là `Krippendorff's Alpha`.
    2.  **Cơ chế gán trùng tự động (System Assignment):** Khi Admin import một Batch mới:
        *   Hệ thống tự động lấy ngẫu nhiên một lượng parent tasks tương ứng với tỷ lệ `overlap_percent` cấu hình của dự án (làm tròn lên số nguyên gần nhất).
        *   Các task được chọn gán trùng này sẽ được phân phối đồng thời vào danh sách công việc của cả 2 annotator đã cấu hình (`overlap_annotator_ids`).
        *   *Ví dụ:* Batch có 100 tasks, `overlap_percent` = 10%. Hệ thống sẽ chọn ngẫu nhiên 10 tasks để gán cho cả Annotator A và Annotator B cùng làm độc lập. 90 tasks còn lại gán đơn lẻ cho các annotator bình thường.

---

### US-IAA-02: Tự động tính điểm IAA khi cặp Annotator hoàn thành (System)
*   **Mô tả:**
    *   **As the** System,
    *   **I want to** tự động tính toán điểm số IAA (Krippendorff's Alpha) ngay khi cả hai Annotator gán trùng nộp bài và QA duyệt xong các task gán trùng,
    *   **So that** điểm số đồng thuận luôn phản ánh dữ liệu mới nhất.
*   **Tiêu chí nghiệm thu (Acceptance Criteria):**
    1.  **Trigger tính toán:** Điểm số IAA của cặp annotator chỉ được tính hoặc tính lại khi:
        *   Cả hai Annotator A và B đã `Submit` task gán trùng đó.
        *   QA đã thực hiện `Approve` cả hai bản gán nhãn đó (để đảm bảo dữ liệu gán nhãn là dữ liệu sạch cuối cùng).
    2.  **Phương thức tính toán (Krippendorff's Alpha):**
        *   Điểm IAA được tính chi tiết cho từng chiều đánh giá trong số 6 chiều (SF, SC, NH, SQ, REL, COMP) và điểm tổng hợp (Composite).
        *   Mảng đầu vào để tính toán là điểm số của hai annotator trên tập các task gán trùng chung đã hoàn thành.
        *   Giá trị Krippendorff's Alpha đầu ra phải nằm trong khoảng từ `-1.00` đến `1.00` (làm tròn 2 chữ số thập phân).
    3.  **Lưu trữ DB:** Kết quả tính toán được lưu trữ vào bảng `iaa_scores` bao gồm: `project_id`, `annotator_a_id`, `annotator_b_id`, `dimension_scores` (JSON chứa điểm 6 chiều), `composite_score`, `iaa_metric_used = "krippendorff_alpha"`, và `computed_at`.

---

### US-IAA-03: Xem báo cáo phân tích độ đồng thuận (Admin & QA)
*   **Mô tả:**
    *   **As an** Admin hoặc QA Specialist,
    *   **I want to** xem bảng tổng hợp điểm IAA của các cặp Annotator,
    *   **So that** tôi đánh giá được độ tin cậy của dữ liệu gán nhãn trong dự án.
*   **Tiêu chí nghiệm thu (Acceptance Criteria):**
    1.  **Màn hình IAA Report (`/projects/:id/iaa`):**
        *   Hiển thị danh sách các cặp annotator đang thực hiện task trùng và điểm số tương ứng.
        *   Cột thông tin bao gồm: Cặp Annotator (ví dụ: `Ann A ↔ Ann B`), điểm của 6 chiều gán nhãn, điểm composite tổng hợp, và cột trạng thái phân loại.
        *   Hỗ trợ bộ lọc nhanh theo **Batch** (Dropdown) để xem IAA của từng đợt import dữ liệu.
    2.  **Mã hóa màu sắc (Color Coding & Thresholds):** Điểm số composite hiển thị phải được phân loại tự động bằng màu sắc:
        *   `Composite Score >= 0.75`: Trạng thái **Tốt** - hiển thị icon vòng tròn xanh lá 🟢.
        *   `0.60 <= Composite Score < 0.75`: Trạng thái **Cần giám sát** - hiển thị icon vòng tròn vàng 🟡.
        *   `Composite Score < 0.60`: Trạng thái **Yếu (Cảnh báo)** - hiển thị icon vòng tròn đỏ 🔴.
    3.  **Empty State:** Nếu chưa có task gán trùng nào hoàn thành (Approved), màn hình hiển thị: *"Chưa có dữ liệu gán trùng hoàn tất để tính toán điểm đồng thuận"*.

---

### US-IAA-04: Xử lý cảnh báo chất lượng thấp (System & Admin)
*   **Mô tả:**
    *   **As an** Admin,
    *   **I want the system to** tự động gắn cờ cảnh báo các annotator có độ đồng thuận quá thấp,
    *   **So that** tôi có thể thực hiện các hành động can thiệp như đào tạo lại hoặc tăng kiểm duyệt.
*   **Tiêu chí nghiệm thu (Acceptance Criteria):**
    1.  **Gắn cờ Annotator:** Khi điểm composite của một cặp annotator rơi xuống mức cảnh báo yếu (`< 0.60`):
        *   Hệ thống tự động gắn badge **"Cần Review"** kế bên tên cặp annotator đó trên bảng báo cáo IAA.
        *   Hàng của cặp annotator đó được highlight nền đỏ nhạt để tăng sự chú ý.
    2.  **Đề xuất hành động (Action Prompts):** Hệ thống hiển thị box đề xuất hành động cho Admin:
        *   *“Độ đồng thuận thấp (< 0.60). Đề xuất: Tăng tỷ lệ QA Review (Sampling) đối với các Annotator này hoặc tổ chức đào tạo lại hướng dẫn gán nhãn (Retrain).”*

---

## 2. Quy tắc nghiệp vụ bổ sung (Business Rules)

*   **BR-IAA-01:** Chỉ hiển thị và tính toán điểm cho cặp annotator có ít nhất **1 task gán trùng chung** đã được duyệt hoàn toàn (Approved).
*   **BR-IAA-02 (Tính bất biến của kết quả):** Điểm IAA hiển thị trên UI là kết quả read-only. Người dùng không được phép sửa đổi thủ công điểm số IAA.

---

*Tài liệu nội bộ VSF — User Stories IAA — Owner: Quang*
