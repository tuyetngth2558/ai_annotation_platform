# User Stories & AC — Export Consolidated Report

**Owner:** Quang  
**Trạng thái:** Draft for Review  
**Phạm vi:** Export Consolidated Report Module (Sprint 3)  
**Tài liệu tham chiếu:** `docs/03_ba/tuyet/06_Sprint3_Screen_Specification.md` §6 & §7 · `docs/03_ba/dan/02_Import_Export_Schema.md`

---

## 1. Danh sách User Stories

### US-CONEXP-01: Lọc dữ liệu và yêu cầu xuất báo cáo tổng hợp (Admin & QA)
*   **Mô tả:**
    *   **As an** Admin hoặc QA Specialist,
    *   **I want to** chọn dự án, đợt dữ liệu (batch) và khoảng thời gian để yêu cầu xuất báo cáo tổng hợp dạng Excel (XLSX) đa sheet,
    *   **So that** tôi có đầy đủ dữ liệu hoàn chỉnh phục vụ cho việc kiểm tra chất lượng và huấn luyện mô hình ở các bước tiếp theo.
*   **Tiêu chí nghiệm thu (Acceptance Criteria):**
    1.  **Giao diện xuất báo cáo (`/export/consolidated`):**
        *   Cho phép chọn Dự án (`project_id` - bắt buộc).
        *   Cho phép chọn Batch (`batch_id` - không bắt buộc, mặc định "Tất cả").
        *   Cho phép chọn khoảng thời gian duyệt (`date_from` và `date_to` - không bắt buộc, dùng để lọc các task có `approved_at` trong khoảng này).
    2.  **Xem trước quy mô (Preview Count):** Khi thay đổi bộ lọc, giao diện tự động tính toán hiển thị số lượng bản ghi ước tính sẽ xuất (ví dụ: *"Ước tính: ~120 claims thuộc 15 parent tasks"*).
    3.  **Validate trước khi submit:**
        *   Nếu không chọn dự án, nút "Tạo báo cáo" sẽ bị khóa (disabled).
        *   Nếu số lượng bản ghi ước tính bằng 0, hệ thống ngăn chặn hành động submit và hiển thị cảnh báo đỏ: *"Không tìm thấy bản ghi Approved nào thỏa mãn bộ lọc đã chọn"*.
    4.  **Tạo Job ngầm (Async Job Trigger):** Khi click "Tạo báo cáo", hệ thống gửi yêu cầu dạng async job tới background queue và chuyển hướng người dùng tới trang theo dõi tiến độ `/export/jobs/{job_id}`.

---

### US-CONEXP-02: Theo dõi tiến trình tạo file và tải về (All Users)
*   **Mô tả:**
    *   **As a** người dùng yêu cầu export,
    *   **I want to** theo dõi tiến trình xử lý tạo file XLSX dung lượng lớn và tải xuống khi hoàn thành,
    *   **So that** tôi không bị treo trình duyệt trong thời gian hệ thống truy vấn và tạo file Excel.
*   **Tiêu chí nghiệm thu (Acceptance Criteria):**
    1.  **Màn hình Trạng thái Job (`/export/jobs/:id`):** Hiển thị chi tiết trạng thái của tiến trình xuất dữ liệu theo các phase:
        *   `queued` (Đang chờ): Đang xếp hàng đợi xử lý. Hiển thị loading spinner.
        *   `processing` (Đang xử lý): Đang truy vấn DB và xây dựng workbook. Hiển thị progress bar.
        *   `ready` (Sẵn sàng): Đã tạo file thành công. Hiển thị nút **Tải XLSX** (primary).
        *   `failed` (Thất bại): Gặp lỗi hệ thống. Hiển thị mô tả lỗi và nút **Thử lại (Retry)**.
    2.  **Thông báo hoàn tất:** Nếu người dùng rời khỏi trang trong khi file đang xử lý, khi job chuyển sang trạng thái `ready` hoặc `failed`, hệ thống tự động gửi thông báo loại `export_ready` đến Notification Center của user đó.
    3.  **Tải file:** Nút **Tải XLSX** kích hoạt việc download file trực tiếp từ storage (MinIO/S3 hoặc Local). Định dạng lưu trữ an toàn, không lộ đường dẫn vật lý trên server.
    4.  **Audit Log:** Khi người dùng bắt đầu tải file xuống, hệ thống ghi nhận hành động: `export` (User ID, Project ID, Số lượng bản ghi, Định dạng file = XLSX, Timestamp).

---

### US-CONEXP-03: Đặc tả cấu trúc file báo cáo tổng hợp XLSX (System)
*   **Mô tả:**
    *   **As the** System,
    *   **I want to** cấu trúc file Excel xuất ra bao gồm chính xác 6 sheet dữ liệu chuẩn hóa,
    *   **So that** các bên liên quan và hệ thống downstream có thể đọc dữ liệu một cách nhất quán.
*   **Tiêu chí nghiệm thu (Acceptance Criteria):**
    1.  **Định dạng file:** File xuất ra phải là định dạng **Excel (.xlsx)** nhị phân tiêu chuẩn, hỗ trợ hiển thị đầy đủ ký tự tiếng Việt có dấu.
    2.  **Cấu trúc 6 Sheets:** File Excel xuất ra bắt buộc phải chứa đúng 6 sheet sau:

#### Sheet 1: Summary (Tổng quan)
*   **Mục đích:** Báo cáo nhanh thông số dự án.
*   **Cột dữ liệu:** Tên dự án, Đợt dữ liệu xuất, Phiên bản Rubric, Tổng số file PDF, Tổng số Claim, Số lượng Approved, Số lượng Disputed, Ngày xuất báo cáo, Người tạo xuất.

#### Sheet 2: Claim Level (Annotation)
*   **Mục đích:** Dữ liệu gán nhãn chi tiết của từng Claim (chỉ bao gồm 4 tiêu chí claim-level theo đúng quy định).
*   **Cột dữ liệu:**
    *   `claim_id`, `parent_task_id`, `pdf_filename`
    *   `claim_text_original`, `claim_text_final`
    *   `source_urls` (Danh sách URL ngăn cách bởi dấu phẩy)
    *   `source_statuses` (Trạng thái nguồn tương ứng)
    *   Điểm số của Annotator: `ann_sf`, `ann_sc`, `ann_hr` (lưu trữ DB là `hr`, UI hiển thị là NH), `ann_sq`
    *   Điểm số gợi ý của AI: `ai_sf`, `ai_sc`, `ai_hr`, `ai_sq`
    *   Điểm số chênh lệch (Delta): `delta_sf`, `delta_sc`, `delta_hr`, `delta_sq`
    *   Lý do giải trình của Annotator: `ann_justifications` (JSON hoặc Text ghép)
    *   Trạng thái kiểm duyệt: `qa_status` (Approved / Disputed)
    *   Mã người gán nhãn (`annotator_id`), Mã QA (`qa_id`).

#### Sheet 3: Answer Level (Article Evaluation)
*   **Mục đích:** Đánh giá cấp bài viết/parent task và lưu trữ các tiêu chí article-level (`REL/COMP`).
*   **Cột dữ liệu:**
    *   `parent_task_id`, `pdf_filename` (Tên bài viết), `article_url`
    *   `total_claims` (Tổng số claim của bài)
    *   `rel` (Điểm số Relevance), `rel_band` (Good, Borderline, v.v.), `rel_note` (Nhận xét Relevance)
    *   `comp` (Điểm số Completeness), `comp_band`, `comp_note` (Nhận xét Completeness)
    *   `note` (Ghi chú chung của bài viết)
    *   `avg_composite_score` (Điểm composite trung bình cộng của toàn bộ claims thuộc bài)
    *   `quality_band` (Xếp hạng chất lượng):
        *   `HIGH` nếu điểm composite trung bình $\ge 0.80$
        *   `MEDIUM` nếu $0.60 \le \text{điểm composite trung bình} < 0.80$
        *   `LOW` nếu điểm composite trung bình $< 0.60$
    *   `final_recommendation` (Khuyến nghị cuối):
        *   `ACCEPTED` nếu `quality_band` là `HIGH`
        *   `NEEDS_REVISION` nếu `quality_band` là `MEDIUM`
        *   `REJECTED` nếu `quality_band` là `LOW`
    *   `annotator_id` (Mã người gán nhãn bài), `evaluated_at` (Ngày đánh giá).

#### Sheet 4: QA Review Log (Nhật ký QA)
*   **Mục đích:** Lịch sử phê duyệt và trả về của QA.
*   **Cột dữ liệu:** `log_id`, `task_id`, `qa_id`, `action` (Approve / Return), `error_category` (nếu return), `qa_comment`, `timestamp`.

#### Sheet 5: Dispute Log (Nhật ký Tranh chấp)
*   **Mục đích:** Thống kê các tranh chấp phát sinh trong đợt dữ liệu.
*   **Cột dữ liệu:** `dispute_id`, `task_id`, `qa_id`, `reason_code`, `description`, `resolved_by`, `resolution_type`, `resolution_note`, `status`, `created_at`, `resolved_at`.

#### Sheet 6: IAA Report (Báo cáo đồng thuận)
*   **Mục đích:** Ghi nhận độ đồng thuận IAA của các cặp annotator.
*   **Cột dữ liệu:** `annotator_pair` (Ann A ↔ Ann B), `metric_used` (Krippendorff's Alpha), `task_count` (số task overlap đã làm chung), `score_sf`, `score_sc`, `score_nh`, `score_sq`, `score_rel`, `score_comp`, `composite_score`, `status_band` (Tốt / Cần giám sát / Yếu).

---

## 2. Quy tắc nghiệp vụ phân quyền (Business Rules)

*   **BR-CONEXP-01 (Phân quyền xuất file):**
    *   **Admin:** Có quyền xuất báo cáo tổng hợp cho mọi dự án trên hệ thống.
    *   **QA Specialist:** Chỉ được phép xuất báo cáo đối với các dự án mà họ được gán làm thành viên. Truy cập dự án khác sẽ trả về lỗi `403 Forbidden`.
    *   **Annotator:** Tuyệt đối không có quyền truy cập màn hình hoặc gọi API xuất báo cáo.

---

*Tài liệu nội bộ VSF — User Stories Export Consolidated — Owner: Quang*
