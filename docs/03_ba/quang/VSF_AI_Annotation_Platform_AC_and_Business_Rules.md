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

## 2. Import PDF Bundle

### AC
1. **AC-2.1:** Upload nhiều file PDF; gán `file_role`: `answer_pdf` (1), `source_ref_pdf` (1), `source_content_pdf` (≥1). `bundle_name` bắt buộc.
2. **AC-2.2:** Parse preview: metadata answer, source list (`source_order`, `source_title`, `source_tier`), warnings (vd. `SOURCE_URL_MISSING`).
3. **AC-2.3:** Admin Confirm Import → tạo `batch`, `pdf_bundle`, `parent_task`; trigger worker parse/normalize.
4. **AC-2.4:** Lỗi validate/PDF hỏng/`ocr_required` → block import, message rõ từng file.

### BR
- **BR-2.1 (Bundle constraints):** VR-UP-001..008 — đủ file role, PDF hợp lệ, max size, không trùng role bắt buộc.
- **BR-2.2 (OCR gate):** PDF scan/image → `source_parse_status = ocr_required` → **block import** (OQ-PDF-004). MVP không có OCR pipeline.
- **BR-2.3 (Text extraction):** Parse answer → `answer_text_raw`, `answer_text_normalized`. Rỗng → VR-PARSE-001/002 fail.
- **BR-2.4 (Source URL):** `source_url` optional; thiếu → warning, **không block** (VR-SRC-006, OQ-PDF-003).
- **BR-2.5 (Audit):** `import` — `user_id`, `bundle_id`/`batch_id`, số file, timestamp.

**Không dùng trong MVP:** ZIP là input chính; CSV/JSON user-facing import.

---

## 3. Parse, Normalize & Claim Extraction

### AC
1. **AC-3.1:** Sau import, worker parse 3 loại PDF; normalize internal representation.
2. **AC-3.2:** LLM **bước 1** tách claim từ `answer_text_normalized`.
3. **AC-3.3:** Mỗi claim → `Claim Task` với `claim_order` từ 1; liên kết `bundle_id`, `parent_task_id`.
4. **AC-3.4:** Annotator sửa `claim_text_final`; giữ `claim_text_original`; audit edit (VR-ANN-005).

### BR
- **BR-3.1:** `claim_order` liên tiếp trong parent task.
- **BR-3.2:** Claim không map source → `source_mapping_required` (VR-MAP-003); **không** block vì thiếu URL.
- **BR-3.3:** Citation `[n]` map `source_order = n` khi có thể (VR-MAP-001 warning).

---

## 4. Source Verification (PDF-native)

### AC
1. **AC-4.1:** Workspace hiển thị per source: `source_order`, `source_title`, `source_tier`, `source_text_extract`, optional `source_url` link.
2. **AC-4.2:** Annotator chọn `source_access_status`: `source_text_parsed` | `inaccessible` | `unknown`.
3. **AC-4.3:** `inaccessible` → bắt buộc `source_note` (VR-ANN-004).

### BR
- **BR-4.1 (SC lock):** Bất kỳ source `inaccessible` → `SC = 0.00` (locked, read-only).
- **BR-4.2:** Không bắt buộc mở URL ngoài để submit; ưu tiên `source_text_extract` từ PDF.
- **BR-4.3:** `source_parse_status = unparsed` → warning; annotator ghi note nếu cần.

**Đã bỏ:** 4 trạng thái URL-centric (`Accessible` / `Partially supported` / `Irrelevant`).

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

### AC
1. **AC-6.1:** Hiển thị: claim editable, source text extract, pre-score, rubric 6 chiều.
2. **AC-6.2:** Composite Score tính real-time.
3. **AC-6.3:** Submit → validation pass → `submitted` → QA queue **100%**.

### BR
- **BR-6.1 (Auto-save):** 30 giây hoặc blur; async, không block UI (DEC-UX-01).
- **BR-6.2 (Submit):** Enabled khi: đủ 6 scores hợp lệ; mỗi source có `source_access_status`; `claim_text_final` non-empty; justification nếu delta ≥ ±0.20; `source_note` nếu inaccessible.

---

## 7. Structured Evaluation (Vivipedia 6 chiều)

### AC
1. **AC-7.1:** SF, SC, NH (UI label), SQ, REL, COMP — export DB dùng `hr` cho NH.
2. **AC-7.2:** Giá trị `0.00`–`1.00`, tối đa 2 chữ số thập phân.
3. **AC-7.3:** Composite = trung bình 6 chiều, round 2 decimals.

### BR
- **BR-7.1:** Regex `^(0(\.\d{1,2})?|1(\.0{1,2})?)$` (VR-ANN-002, VR-ANN-003).
- **BR-7.2:** $\text{Composite} = \text{Round}((SF+SC+NH+SQ+REL+COMP)/6, 2)$.
- **BR-7.3 (Justification — OQ-004):** Nếu $|\text{ann}_i - \text{pre}_i| \ge 0.20$ → `justification_note` **non-empty** (sau trim) cho chiều đó.

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

### BR
- **BR-9.1:** Query strict `status = approved`.
- **BR-9.2:** Escape CSV chuẩn (quote, newline, comma).
- **BR-9.3:** Audit `export` — user, project, row count.

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
