# VSF AI Annotation Platform - AC & Business Rules Specification (MVP)

Tài liệu này đặc tả chi tiết **Tiêu chí nghiệm thu (Acceptance Criteria - AC)** và **Quy tắc nghiệp vụ (Business Rules - BR)** cho các tính năng thuộc nhóm Must-Have trong phạm vi MVP 4 tuần. Đây là tài liệu gốc để lập trình viên viết code/validation và đội ngũ kiểm thử thiết kế bộ test cases.

Tài liệu được xây dựng dựa trên ranh giới phạm vi của [VSF_AI_Annotation_Platform_Scope_Breakdown.md](file:///d:/BA/VSF_AI_Annotation_Platform_Scope_Breakdown.md).

---

## 1. Project Setup (Cấu hình dự án)

### AC - Tiêu chí nghiệm thu:
1. **AC-1.1:** Admin có thể tạo dự án mới thông qua form bao gồm: Tên dự án (bắt buộc), Mô tả (không bắt buộc), và Modality (mặc định là `text` và không cho sửa đổi).
2. **AC-1.2:** Admin cấu hình được LLM connection cho dự án gồm: API Endpoint (URL), API Key, Model Name, và Prompt Template.
3. **AC-1.3:** Admin có thể gán danh sách Annotators và QA Specialists vào dự án bằng cách chọn từ danh sách tài khoản hiện có.
4. **AC-1.4:** Danh sách dự án hiển thị tổng quan các thông tin: Tên, Ngày tạo, Số lượng nhân sự gán vào, và Trạng thái cấu hình LLM (Đầy đủ / Lỗi cấu hình).

### BR - Quy tắc nghiệp vụ:
- **BR-1.1 (Modality Constraint):** Trong cơ sở dữ liệu, cột `modality_type` phải sử dụng kiểu dữ liệu `Enum ('text', 'audio', 'image')`. Tuy nhiên, giao diện tạo dự án của MVP bắt buộc phải khóa cứng giá trị này là `text`.
- **BR-1.2 (LLM Configuration Security):** API Key của LLM phải được mã hóa khi lưu trữ trong cơ sở dữ liệu (encryption-at-rest) và không được hiển thị dưới dạng bản rõ (plain text) trên giao diện sau khi đã lưu (chỉ hiển thị dạng che dấu kiểu `••••••••`).
- **BR-1.3 (Prompt Template Variables):** Mẫu prompt cấu hình bắt buộc phải chứa các biến đặt trong dấu ngoặc nhọn song song: `{{claim_text}}` và `{{source_context}}`. Hệ thống phải thực hiện validate kiểm tra sự tồn tại của hai biến này trước khi cho phép lưu cấu hình.

---

## 2. Import PDF Bundle (Nhập dữ liệu)

### AC - Tiêu chí nghiệm thu:
1. **AC-2.1:** Giao diện cho phép Admin đăng tải nhiều file PDF và gán file role cho từng file trong một PDF bundle.
2. **AC-2.2:** Hệ thống hiển thị parse preview gồm metadata bài, source list, source content mapping và parse warnings để Admin đối chiếu trước khi import.
3. **AC-2.3:** Nếu bundle hợp lệ, khi Admin bấm xác nhận, hệ thống sẽ xử lý ngầm (background job), tạo Batch ID/PDF Bundle/Parent Task và hiển thị trạng thái import.
4. **AC-2.4:** Nếu PDF bundle bị lỗi validation/parse blocking, hệ thống phải dừng tiến trình và hiển thị chi tiết file/bundle bị lỗi cùng lý do (ví dụ: *"Thiếu source_ref_pdf"* hoặc *"Cannot extract answer text"*).

### BR - Quy tắc nghiệp vụ:
- **BR-2.1 (Schema Constraints):**
  - **PDF Bundle:** Bắt buộc có đúng 1 `answer_pdf`, đúng 1 `source_ref_pdf`, và ít nhất 1 `source_content_pdf`.
  - **File Role:** File role chỉ được thuộc `answer_pdf`, `source_ref_pdf`, `source_content_pdf`.
- **BR-2.2 (Null/Empty Validation):** `answer_text_normalized` sau parse không được rỗng. Nếu không parse được answer text, bundle bị block.
- **BR-2.3 (Audit Log):** Hệ thống bắt buộc phải ghi log sự kiện `import` bao gồm: `user_id` (Admin), `timestamp`, `action_type: import`, `target_object: BatchID/BundleID`, danh sách file PDF và số claim/task sinh ra nếu có.

---

## 3. Claim Extraction (Tự động tách Claim)

### AC - Tiêu chí nghiệm thu:
1. **AC-3.1:** Hệ thống tự động phân tích và tách `answer_text_normalized` thành các claim đơn lẻ có nghĩa ngay sau khi PDF bundle được import và parse thành công.
2. **AC-3.2:** Mỗi claim được lưu thành một bản ghi `Claim Task` độc lập liên kết với câu trả lời gốc (`parent_task_id`).
3. **AC-3.3:** Annotator khi mở task có thể chỉnh sửa trực tiếp nội dung văn bản của claim (`claim_text`) trong ô nhập liệu (Text Area) và lưu lại thay đổi.

### BR - Quy tắc nghiệp vụ:
- **BR-3.1 (Claim Ordering):** Mỗi `Claim Task` sinh ra từ `answer_text_normalized` phải được gắn một chỉ số thứ tự liên tiếp `claim_order` bắt buộc (bắt đầu từ 1). Thứ tự này dùng để hiển thị các claim theo đúng trình tự xuất hiện của chúng trong câu trả lời gốc.
- **BR-3.2 (Source Check on Import):** 
  - Nếu claim không map được source candidate từ citation marker/source order, hệ thống tự động gán trạng thái `Claim Task` là `Source Mapping Required`.
  - Task ở trạng thái này sẽ không được nạp vào hàng đợi công việc của Annotator cho đến khi Admin/BA thực hiện ánh xạ/bổ sung source mapping.

---

## 4. Source Mapping & Validation (Xác thực nguồn)

### AC - Tiêu chí nghiệm thu:
1. **AC-4.1:** Màn hình làm việc hiển thị danh sách source được liên kết với claim hiện tại gồm source order/title/tier, source text extract, source file ref và URL nếu parse được.
2. **AC-4.2:** Với mỗi source, Annotator bắt buộc phải chọn trạng thái phù hợp: `source_text_parsed`, `inaccessible`, `unparsed`, `ocr_required`, `partially_supported`, hoặc `irrelevant`.
3. **AC-4.3:** Nếu Annotator đổi trạng thái nguồn thành `inaccessible`, `unparsed` hoặc `ocr_required`, hệ thống bắt buộc Annotator phải điền lý do chi tiết vào ô nhập liệu bên cạnh source đó.

### BR - Quy tắc nghiệp vụ:
- **BR-4.1 (Source Validation Lock):** 
  - Nếu **bất kỳ** source nào của claim bị đánh dấu là `inaccessible`, `unparsed` hoặc `ocr_required`:
    - Điểm số của chiều đánh giá `SC` (Source Coverage) tự động gán bằng `0.00`.
    - Ô nhập điểm của chiều `SC` trên giao diện sẽ bị khóa (read-only) và không cho phép Annotator sửa đổi thủ công.
  - Nếu tất cả các nguồn của claim đều ở trạng thái khác (`source_text_parsed`, `partially_supported`, `irrelevant`), ô nhập điểm `SC` sẽ được mở khóa để đánh giá bình thường.

---

## 5. LLM Pre-scoring (Tính điểm gợi ý từ AI)

### AC - Tiêu chí nghiệm thu:
1. **AC-5.1:** Hệ thống gửi request API đến LLM provider đã cấu hình để tính toán điểm số cho 6 chiều Vivipedia.
2. **AC-5.2:** Điểm số nhận về từ LLM phải được hiển thị trên giao diện của Annotator dưới dạng nhãn gợi ý ("AI Draft") bên cạnh ô nhập điểm tương ứng.
3. **AC-5.3:** Nếu gọi API LLM thất bại, hệ thống chuyển trạng thái task sang `Pre-scoring Failed` và hiển thị mã lỗi (ví dụ: HTTP 500, Timeout) trên bảng quản lý của Admin.

### BR - Quy tắc nghiệp vụ:
- **BR-5.1 (Immutable Baseline):** Bản ghi kết quả trả về từ LLM (`llm_pre_score` bao gồm điểm của 6 chiều) là dữ liệu **bất biến** (Read-Only). Không có bất kỳ API nào (kể cả quyền Admin) được phép sửa đổi hoặc xóa bản ghi này sau khi đã lưu, nhằm phục vụ mục đích đo lường chênh lệch (diff score) và cải tiến prompt sau này.

---

## 6. Annotation Workspace (Màn hình gán nhãn)

### AC - Tiêu chí nghiệm thu:
1. **AC-6.1:** Màn hình gán nhãn hiển thị đầy đủ ngữ cảnh: nội dung câu trả lời gốc đã parse (`answer_text_normalized` - read-only), claim text đang đánh giá (editable), và danh sách nguồn.
2. **AC-6.2:** Annotator nhập điểm số cho các chiều, hệ thống tự động tính toán và hiển thị điểm tổng hợp trung bình (`Composite Score`) theo thời gian thực.
3. **AC-6.3:** Khi bấm "Submit", hệ thống kiểm tra toàn bộ dữ liệu nhập vào: nếu hợp lệ sẽ gửi task đi và chuyển sang task tiếp theo trong hàng đợi.

### BR - Quy tắc nghiệp vụ:
- **BR-6.1 (Auto-save Throttle):** 
  - Hệ thống tự động thực hiện hành động lưu nháp dữ liệu gán nhãn (Auto-save) lên cơ sở dữ liệu với tần suất **30 giây một lần** hoặc **ngay khi Annotator chuyển con trỏ ra ngoài ô nhập liệu (blur event)** của bất kỳ trường điểm số hoặc text nào.
  - Tiến trình Auto-save không được gây đơ hoặc giật lag giao diện (phải chạy bất đồng bộ).
- **BR-6.2 (Submit Validation):** Nút "Submit" chỉ được kích hoạt (enabled) khi thỏa mãn tất cả các điều kiện sau:
  1. Toàn bộ source liên quan đã được xác nhận trạng thái.
  2. Toàn bộ 6 chiều điểm số đã được điền đầy đủ giá trị hợp lệ (trừ chiều SC bị khóa).
  3. Văn bản của claim (`claim_text`) không bị để trống hoặc chỉ có dấu cách.
  4. Đã nhập lý do giải trình nếu điểm số vượt ngưỡng chênh lệch quy định.

---

## 7. Structured Evaluation (Bộ tiêu chí Vivipedia)

### AC - Tiêu chí nghiệm thu:
1. **AC-7.1:** Giao diện hiển thị đúng 6 chiều tiêu chí: SF, SC, HR, SQ, REL, COMP.
2. **AC-7.2:** Các ô nhập điểm chỉ chấp nhận giá trị số thập phân trong khoảng từ `0.00` đến `1.00`.
3. **AC-7.3:** Hệ thống hiển thị điểm tổng hợp `Composite Score` bằng số thập phân (lấy 2 chữ số sau dấu phẩy).

### BR - Quy tắc nghiệp vụ:
- **BR-7.1 (Input Validation Regex):** Điểm số nhập vào frontend và backend phải được validate theo biểu thức chính quy (Regex): `^(0(\.\d{1,2})?|1(\.0{1,2})?)$`. Bất kỳ giá trị nào ngoài khoảng $[0.00, 1.00]$ hoặc có nhiều hơn 2 chữ số thập phân (ví dụ: `0.785`) đều bị từ chối và báo lỗi.
- **BR-7.2 (Composite Score Formula):** Điểm Composite Score được tính bằng trung bình cộng không trọng số của cả 6 chiều:
  $$\text{Composite Score} = \text{Round}\left(\frac{SF + SC + HR + SQ + REL + COMP}{6}, 2\right)$$
  *(Trong đó hàm `Round` thực hiện làm tròn số đến 2 chữ số thập phân gần nhất).*
- **BR-7.3 (Justification Trigger):**
  - Ngưỡng chênh lệch bắt buộc giải trình được cấu hình cố định trong MVP là **$\ge \pm 0.20$**.
  - Công thức kiểm tra: Với mỗi chiều $i$, nếu $|\text{Điểm Annotator}_i - \text{Điểm AI Pre-score}_i| \ge 0.20$, hệ thống bắt buộc Annotator phải nhập văn bản giải thích vào trường `justification_note` của chiều đó.
  - Trường `justification_note` bắt buộc phải có độ dài từ **15 ký tự trở lên** (không tính khoảng trắng ở đầu và cuối chuỗi).

---

## 8. QA Review (Quy trình kiểm duyệt)

### AC - Tiêu chí nghiệm thu:
1. **AC-8.1:** Màn hình QA Review hiển thị song song điểm của Annotator và điểm AI Pre-score, đồng thời làm nổi bật (ví dụ: đổi màu nền đỏ/vàng) các chiều điểm có chênh lệch $\ge 0.20$.
2. **AC-8.2:** QA Specialist bấm "Approve" để duyệt task, hệ thống đổi trạng thái task sang `Approved` và khóa không cho phép sửa đổi nữa.
3. **AC-8.3:** QA Specialist bấm "Return" để trả lại task, hệ thống hiển thị modal yêu cầu chọn loại lỗi và viết lý do trả về. Sau khi xác nhận, task quay về hàng đợi của Annotator kèm thông tin phản hồi từ QA.

### BR - Quy tắc nghiệp vụ:
- **BR-8.1 (QA Action Constraints):**
  - QA Specialist trong MVP **không** có quyền chỉnh sửa trực tiếp điểm số hay claim text trên giao diện. QA chỉ có quyền phê duyệt hoặc trả lại yêu cầu sửa đổi.
- **BR-8.2 (Return Validation):**
  - Khi thực hiện action `Return`, hệ thống bắt buộc QA phải chọn 1 trong các mã phân loại lỗi trong Enum: `['wrong_score', 'missing_notes', 'incorrect_source_status', 'bad_claim_text']`.
  - Ô comment lý do trả về (`qa_comment`) bắt buộc phải điền tối thiểu **10 ký tự**.
- **BR-8.3 (Task History Logging):** Mỗi hành động Approve hoặc Return phải tạo ra một bản ghi trong bảng `task_history` ghi nhận: `task_id`, `actor_id`, `from_state` (Submitted), `to_state` (Approved hoặc Returned), `error_category` (nếu Return), `comment` (nếu Return) và `timestamp`.

---

## 9. Export (Xuất dữ liệu)

### AC - Tiêu chí nghiệm thu:
1. **AC-9.1:** Chỉ người dùng có quyền Admin mới nhìn thấy và bấm được nút "Export CSV".
2. **AC-9.2:** Tệp tin tải xuống có định dạng `.csv`, được đặt tên theo định dạng `export_claims_batch_[BatchID]_[YYYYMMDD_HHMMSS].csv`.
3. **AC-9.3:** File CSV chứa đầy đủ dữ liệu ở cấp độ claim-level của tất cả các task đã được duyệt (`Approved`).

### BR - Quy tắc nghiệp vụ:
- **BR-9.1 (Export State Filtering):** Query xuất dữ liệu bắt buộc phải lọc nghiêm ngặt theo điều kiện `status = 'Approved'`. Tuyệt đối không xuất các task ở trạng thái nháp (`Assigned`), đang đợi duyệt (`Submitted`) hoặc bị trả về (`Returned`).
- **BR-9.2 (CSV Formatting):** Nội dung text trong các trường như `claim_text_original`, `claim_text_final`, `mapped_source_titles` và note khi xuất ra CSV phải được bao quanh bởi dấu ngoặc kép đôi `"` và thực hiện escape các ký tự đặc biệt (ví dụ: dấu phẩy `,`, dấu xuống dòng `\n`, dấu ngoặc kép `"`) để tránh phá vỡ cấu trúc file CSV.
- **BR-9.3 (Audit Log):** Ghi nhận hành động export vào Audit Log: `user_id` (Admin), `timestamp`, `action_type: export`, `target_object: ProjectID/BatchID`, `exported_row_count`.

---

## 10. Audit Log (Nhật ký hệ thống)

### AC - Tiêu chí nghiệm thu:
1. **AC-10.1:** Hệ thống tự động ghi lại nhật ký cho mọi hành động nghiệp vụ chính mà không gây ảnh hưởng đến tốc độ phản hồi của API.
2. **AC-10.2:** Chỉ Admin mới có quyền truy cập màn hình xem danh sách Audit Log.

### BR - Quy tắc nghiệp vụ:
- **BR-10.1 (Immutable Log):** Bảng cơ sở dữ liệu `audit_log` chỉ hỗ trợ thao tác `INSERT`. Hệ thống **không cung cấp** bất kỳ API nào có quyền `UPDATE` hoặc `DELETE` trên bảng này (kể cả tài khoản Admin hệ thống) để đảm bảo tính minh bạch và bảo mật.
- **BR-10.2 (Log Fields Spec):** Mỗi dòng log bắt buộc phải ghi nhận đầy đủ các thông tin:
  - `log_id` (UUIDv4)
  - `user_id` (ID người thực hiện)
  - `user_role` (Vai trò lúc thực hiện: Admin, Annotator, QA)
  - `action_type` (Phân loại: `import`, `claim_edit`, `submit`, `approve`, `return`, `export`)
  - `target_object_id` (ID của Batch, Task hoặc File liên quan)
  - `description` (Mô tả tóm tắt hành động nghiệp vụ)
  - `client_ip` (Địa chỉ IP của client gửi request)
  - `created_at` (Thời gian ghi log)
