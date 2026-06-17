# VSF AI Annotation Platform — AC & Business Rules (MVP)

**Owner:** Quang  
**Phiên bản:** 1.2 (PDF-native)  
**Ngày:** 09/06/2026  
**Baseline:** `VSF_AI_Annotation_Platform_Scope_Breakdown.md` v1.2 · `docs/03_ba/dan/03_Validation_Rules.md` · `docs/03_ba/dan/02_Import_Export_Schema.md`

Tài liệu gốc cho Dev viết validation và QA thiết kế test cases.

---

## 1. Project Setup

### AC
1. **AC-1.1:** Admin tạo project: Tên (bắt buộc), Mô tả (optional), Modality = `text` (khóa cứng).
2. **AC-1.2:** Admin cấu hình LLM: Endpoint, API Key, Model Name, Prompt Template (2 bước: claim extraction + pre-scoring).
3. **AC-1.3:** Admin gán Annotator/QA từ danh sách user seed (**không** User Management UI đầy đủ).
4. **AC-1.4:** Danh sách project: Tên, Ngày tạo, Số nhân sự, Trạng thái LLM (Đầy đủ / Lỗi).

### BR
- **BR-1.1:** `modality_type` Enum `('text','audio','image')`; MVP UI khóa `text`.
- **BR-1.2:** API Key mã hóa at-rest; UI chỉ hiển thị masked sau khi lưu.
- **BR-1.3:** Prompt template validate biến bắt buộc theo từng bước LLM (claim: `{{claim_text}}`, `{{source_context}}`; pre-score tương tự).

---

## 2. Import PDF Bundle (Nhập dữ liệu)

### AC
1. **AC-2.1:** Upload nhiều file PDF; gán `file_role`: `answer_pdf` (1), `source_ref_pdf` (1), `source_content_pdf` (0..N, optional). `bundle_name` bắt buộc.
2. **AC-2.2:** Parse preview: metadata answer, source list (`source_order`, `source_title`, `source_tier`), warnings (vd. `SOURCE_URL_MISSING`).
3. **AC-2.3:** Admin Confirm Import → tạo `batch`, `pdf_bundle`, `parent_task`; trigger worker parse/normalize.
4. **AC-2.4:** Lỗi validate/PDF hỏng/`ocr_required` → block import, message rõ từng file.

### BR
- **BR-2.1 (Bundle constraints):** VR-UP-001..008 — đủ file role, PDF hợp lệ, max size, không trùng role bắt buộc.
- **BR-2.2 (OCR gate):** PDF scan/image → `source_parse_status = ocr_required` → **block import** (OQ-PDF-004). MVP không có OCR pipeline.
- **BR-2.3 (Text extraction):** Parse answer → `answer_text_raw`, `answer_text_normalized`. Rỗng → VR-PARSE-001/002 fail.
- **BR-2.4 (Source URL):** `source_url` optional; thiếu → warning, **không block** (VR-SRC-006, OQ-PDF-003).
- **BR-2.5 (Audit):** `import` — `user_id`, `bundle_id`/`batch_id`, số file, timestamp.

### BR - Quy tắc nghiệp vụ:
- **BR-2.1 (Schema Constraints):**
  - **PDF Bundle:** Bắt buộc có đúng 1 `answer_pdf`, đúng 1 `source_ref_pdf`, và ít nhất 1 `source_content_pdf`.
  - **File Role:** File role chỉ được thuộc `answer_pdf`, `source_ref_pdf`, `source_content_pdf`.
- **BR-2.2 (Null/Empty Validation):** `answer_text_normalized` sau parse không được rỗng. Nếu không parse được answer text, bundle bị block.
- **BR-2.3 (Audit Log):** Hệ thống bắt buộc phải ghi log sự kiện `import` bao gồm: `user_id` (Admin), `timestamp`, `action_type: import`, `target_object: BatchID/BundleID`, danh sách file PDF và số claim/task sinh ra nếu có.

---

## 3. Parse, Normalize & Claim Extraction

<<<<<<< HEAD
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

## 4. Source Verification (PDF-native)

<<<<<<< HEAD
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

## 5. LLM Pre-scoring (bước 2)

### AC
1. **AC-5.1:** Sau claim extraction + mapping, gọi LLM **bước 2** qua `LLMProvider` (OQ-003).
2. **AC-5.2:** Pre-score 6 chiều hiển thị "AI Draft" trên workspace.
3. **AC-5.3:** Lỗi API/schema → `pre_scoring_failed`; Admin retry.

### BR
- **BR-5.1:** Provider working MVP: **Gemini 2.5 Flash** (OQ-002); Mock khi chưa có key.
- **BR-5.2:** `llm_pre_score` **bất biến** sau khi lưu — không API sửa/xóa.

---

## 6. Annotation Workspace

<<<<<<< HEAD
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
=======
### AC
1. **AC-6.1:** Hiển thị: claim editable, source text extract, pre-score, rubric 6 chiều.
2. **AC-6.2:** Composite Score tính real-time.
3. **AC-6.3:** Submit → validation pass → `submitted` → QA queue **100%**.

### BR
- **BR-6.1 (Auto-save):** 30 giây hoặc blur; async, không block UI (DEC-UX-01).
- **BR-6.2 (Submit):** Enabled khi: đủ 6 scores hợp lệ; mỗi source có `source_access_status`; `claim_text_final` non-empty; justification nếu delta ≥ ±0.20; `source_note` nếu inaccessible.
>>>>>>> origin/fe

---

## 7. Structured Evaluation (Vivipedia 6 chiều)

<<<<<<< HEAD
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
=======
### AC
1. **AC-7.1:** SF, SC, NH (UI label), SQ, REL, COMP — export DB dùng `hr` cho NH.
2. **AC-7.2:** Giá trị `0.00`–`1.00`, tối đa 2 chữ số thập phân.
3. **AC-7.3:** Composite = trung bình 6 chiều, round 2 decimals.

### BR
- **BR-7.1:** Regex `^(0(\.\d{1,2})?|1(\.0{1,2})?)$` (VR-ANN-002, VR-ANN-003).
- **BR-7.2:** $\text{Composite} = \text{Round}((SF+SC+NH+SQ+REL+COMP)/6, 2)$.
- **BR-7.3 (Justification — OQ-004):** Nếu $|\text{ann}_i - \text{pre}_i| \ge 0.20$ → `justification_note` **non-empty** (sau trim) cho chiều đó.
>>>>>>> origin/fe

---

## 8. QA Review

### AC
1. **AC-8.1:** QA queue = **100%** task `submitted` trong project được giao (OQ-007). Không sampling, không auto-approve.
2. **AC-8.2:** Diff view: annotator vs pre-score; highlight delta ≥ ±0.20; tab history.
3. **AC-8.3:** Approve → `approved` (VR-QA-001). Return → `error_category` + `qa_comment` ≥ 10 ký tự → `returned`.

### BR
- **BR-8.1:** QA **không** sửa điểm/claim (DEC-QA-01).
- **BR-8.2:** Return `error_category` ∈ `wrong_score` | `missing_notes` | `incorrect_source_status` | `bad_claim_text`.
- **BR-8.3:** Mỗi Approve/Return → `task_history` + audit log.
- **BR-8.4:** Không nút Dispute (OQ-005).

---

## 9. Export CSV

### AC
1. **AC-9.1:** **Admin** export mọi project; **QA** export chỉ project được giao (§6.5, OQ-009).
2. **AC-9.2:** Chỉ claims `approved` (VR-EXP-001).
3. **AC-9.3:** CSV UTF-8 theo `docs/03_ba/dan/02_Import_Export_Schema.md` §10 — gồm `bundle_id`, PDF filenames, `article_code`, mapped source fields, `pre_*`, `ann_*`, `composite_score`, QA fields.
4. **AC-9.4:** Tên file gợi ý: `export_claims_{project}_{YYYYMMDD_HHMMSS}.csv`.

<<<<<<< HEAD
### BR - Quy tắc nghiệp vụ:
- **BR-9.1 (Export State Filtering):** Query xuất dữ liệu bắt buộc phải lọc nghiêm ngặt theo điều kiện `status = 'Approved'`. Tuyệt đối không xuất các task ở trạng thái nháp (`Assigned`), đang đợi duyệt (`Submitted`) hoặc bị trả về (`Returned`).
- **BR-9.2 (CSV Formatting):** Nội dung text trong các trường như `claim_text_original`, `claim_text_final`, `mapped_source_titles` và note khi xuất ra CSV phải được bao quanh bởi dấu ngoặc kép đôi `"` và thực hiện escape các ký tự đặc biệt (ví dụ: dấu phẩy `,`, dấu xuống dòng `\n`, dấu ngoặc kép `"`) để tránh phá vỡ cấu trúc file CSV.
- **BR-9.3 (Audit Log):** Ghi nhận hành động export vào Audit Log: `user_id` (Admin), `timestamp`, `action_type: export`, `target_object: ProjectID/BatchID`, `exported_row_count`.
=======
### BR
- **BR-9.1:** Query strict `status = approved`.
- **BR-9.2:** Escape CSV chuẩn (quote, newline, comma).
- **BR-9.3:** Audit `export` — user, project, row count.
>>>>>>> origin/fe

---

## 10. Audit Log

### AC
1. **AC-10.1:** Ghi log async cho: `import`, `claim_edit`, `submit`, `approve`, `return`, `export`.
2. **AC-10.2:** Chỉ Admin xem Audit Log UI.

### BR
- **BR-10.1:** `audit_log` INSERT-only.
- **BR-10.2:** Fields: `log_id`, `user_id`, `user_role`, `action_type`, `target_object_id`, `description`, `client_ip`, `created_at`.

---

## 11. Tham chiếu validation (dan)

| Nhóm | Rule IDs chính |
|---|---|
| Upload | VR-UP-001..008 |
| Parse | VR-PARSE-001..007 |
| Source | VR-SRC-001..008 |
| Mapping | VR-MAP-001..005 |
| Annotator | VR-ANN-001..006 |
| QA | VR-QA-001..004 |
| Export | VR-EXP-001..006 |

Chi tiết message/error code: `docs/03_ba/dan/03_Validation_Rules.md`.
