# Screen Specification — VSF AI Annotation Platform MVP

**Owner:** Tuyết  
**Phiên bản:** 2.1  
**Ngày:** 06/06/2026  
**Trạng thái:** Ready for cross-review  

> Tài liệu này đặc tả chi tiết các màn hình chính trong MVP.  
> Mỗi màn gồm: mục đích, components, fields, actions, validations, states, data dependencies.

---

## 1. Quy ước chung

### 1.1. Màn hình nằm trong phạm vi build

1. `Project Setup / Import PDF Bundle`
2. `Annotation Workspace`
3. `QA Review Workspace`
4. `Export`

### 1.2. Thuật ngữ dùng trong spec

- `Task` trong màn hình MVP = `Claim Task`
- `PDF Bundle` = một bài input gồm Answer PDF + Source Reference PDF + Source Content PDF
- `Parent Task` = đơn vị nghiệp vụ gốc sau parse PDF (tương ứng một bài)
- `Answer Context` = câu trả lời LLM gốc được extract từ Answer PDF
- `Pre-score` = điểm do LLM gợi ý
- `Final score` = điểm được chấp nhận cuối cùng sau QA approve

### 1.3. Quyết định khóa scope cho spec

- không có `Skip`
- không có `Save Draft` riêng
- không có `Dispute`
- không có `QA direct correction` trong build MVP

---

## 2. Màn hình 1 — Project Setup / Import PDF Bundle

**URL:** `/projects/new` và `/projects/:id/import`  
**Vai trò:** ADMIN  
**Mục đích:** Tạo project mới và upload PDF bundle để bắt đầu pipeline parse → claim extraction → annotation.

### 2.1. Project Setup Form

#### Fields

| Field | Loại | Bắt buộc | Validation | Ghi chú |
|---|---|---|---|---|
| Tên dự án | Text input | Có | 3-100 ký tự | |
| Mô tả | Textarea | Không | Tối đa 500 ký tự | |
| Modality type | Dropdown | Có | MVP chỉ có `Text` | Các modality khác disable |
| Deadline | Date picker | Không | `>=` ngày hiện tại | |
| LLM Endpoint URL | Text input | Có | URL hợp lệ `https://` | |
| API Key | Password input | Có | Không để trống | Mask giá trị |
| Prompt template | Textarea | Có | Tối thiểu 10 ký tự | Có thể dùng template mặc định |

#### Actions

| Action | Điều kiện | Kết quả |
|---|---|---|
| Tiếp tục | Các field bắt buộc hợp lệ | Sang bước Import PDF Bundle |
| Hủy | Luôn có | Confirm dialog rồi quay về Dashboard |

#### States

| State | Mô tả |
|---|---|
| Default | Form trống |
| Filling | Đang nhập |
| Error | Có field invalid |
| Ready | Cho phép bấm `Tiếp tục` |

#### Data dependencies

| Dữ liệu | Nguồn |
|---|---|
| User role hiện tại | Auth session |
| Danh sách LLM config mặc định | Config hệ thống hoặc seed data |

---

### 2.2. Import PDF Bundle

#### Components

| Component | Mô tả |
|---|---|
| Upload zone | Drag & drop hoặc chọn nhiều file PDF |
| Bundle builder | Nhóm file thành bundle, gán `file_role` |
| File role selector | `answer_pdf` / `source_ref_pdf` / `source_content_pdf` |
| Bundle validator | Kiểm tra đủ file role, PDF hợp lệ, không trùng role |
| Parse preview panel | Hiển thị metadata parse, source list, warnings |
| Error panel | Danh sách lỗi validate/parse |
| Confirm Import button | Chỉ enable khi bundle hợp lệ |

#### PDF Bundle schema (theo `docs/03_ba/dan/02_Import_Export_Schema.md`)

Mỗi bundle bắt buộc có:

| file_role | Số lượng | Mô tả |
|---|---:|---|
| `answer_pdf` | 1 | PDF câu trả lời nguyên bản từ portal |
| `source_ref_pdf` | 1 | PDF danh sách nguồn (order, title, tier) |
| `source_content_pdf` | 0..N (optional) | PDF nội dung nguồn để đối chiếu (nếu có thì là evidence chính) |

Tùy chọn hỗ trợ upload batch qua manifest CSV (`sample_pdf_bundle_manifest.csv`).

#### Fields bundle-level

| Field | Loại | Bắt buộc | Ghi chú |
|---|---|---|---|
| `bundle_name` | Text | Có | Tên bundle, ví dụ `ODA Article 001` |
| `article_code_hint` | Text | Không | Gợi ý mã bài nếu admin biết trước |

#### Validation rules

| Rule | Hành vi | Ref |
|---|---|---|
| File không phải PDF hoặc corrupt | Block import | VR-UP-004 |
| Thiếu `answer_pdf` hoặc `source_ref_pdf` | Block import | VR-UP-001, VR-UP-002 |
| Không có `source_content_pdf` | Không block (optional); warning nếu batch không có file source content nào | removed (was VR-UP-003) |
| Trùng file role bắt buộc trong 1 bundle | Block import | VR-UP-001, VR-UP-002 |
| `bundle_name` rỗng | Block import | VR-UP-006 |
| File vượt max size | Block import | VR-UP-005 |
| Không parse được answer text | Bundle invalid | VR-PARSE-001 |
| `source_url` không parse được | Warning, cho import | VR-SRC-006 |
| Không parse được source list | Block hoặc bundle invalid | VR-SRC-001 |

#### Parse preview (sau validate upload)

| Element hiển thị | Nguồn |
|---|---|
| `article_code`, `title`, `category`, `tier` | Metadata từ Answer PDF |
| `confidence_score`, `created_date` | Metadata từ Answer PDF (nếu parse được) |
| Source list preview | `source_order`, `source_title`, `source_tier` từ Source Ref PDF |
| Parse warnings | Ví dụ `SOURCE_URL_MISSING`, noise còn lại |
| Linked source content files | Mapping file PDF nguồn |

#### Actions

| Action | Điều kiện | Kết quả |
|---|---|---|
| Chọn file PDF | Luôn có | Tải file lên bộ nhớ tạm |
| Gán file role | Sau upload | Cập nhật bundle builder |
| Validate bundle | Tự động sau gán role | Hiển thị pass/fail |
| Preview parse | Bundle hợp lệ | Gọi parse preview (hoặc parse nhẹ) |
| Xác nhận Import | Bundle + parse preview OK | Tạo batch, PDF bundle, parent task, trigger pipeline nền |

#### States

| State | Mô tả |
|---|---|
| Uploading | Đang tải file PDF |
| Assigning Roles | Admin đang gán file_role |
| Validating | Đang kiểm tra bundle rules |
| Validation Failed | Hiển thị lỗi |
| Parsing Preview | Đang parse preview |
| Validation Passed | Hiển thị preview + enable import |
| Importing | Đang lưu bundle và tạo parent task |
| Background Processing | Parse đầy đủ → claim extraction → source mapping → pre-scoring |
| Done | Redirect về Project Detail |

#### Data dependencies

| Dữ liệu | Nguồn |
|---|---|
| PDF bundle schema | `docs/03_ba/dan/02_Import_Export_Schema.md` |
| Validation rules | `docs/03_ba/dan/03_Validation_Rules.md` |
| Sample manifest | `docs/03_ba/dan/sample_pdf_bundle_manifest.csv` |
| LLM pre-scoring config | Project Setup step trước |

---

### 2.3. Assignment

#### Fields

| Field | Loại | Bắt buộc | Ghi chú |
|---|---|---|---|
| Chọn Annotator | Multi-select | Có, tối thiểu 1 | Tên + email |
| Chọn QA Specialist | Single select | Có | |

#### Actions

| Action | Kết quả |
|---|---|
| Hoàn tất | Tạo assignment, quay về Project Detail |
| Quay lại | Trở về bước Import PDF Bundle, giữ dữ liệu |

---

## 3. Màn hình 2 — Annotation Workspace

**URL:** `/tasks/:task_id/annotate`  
**Vai trò:** ANNOTATOR  
**Mục đích:** Review claim, xác nhận/sửa điểm, xác nhận nguồn, submit cho QA.

### 3.1. Header

| Element | Mô tả |
|---|---|
| Breadcrumb | Project > Batch > Parent Task > Claim |
| Claim counter | Ví dụ `Claim 3 / 12` |
| Timer | Bắt đầu khi mở task |
| Previous / Next | Điều hướng claim trong cùng parent item |
| Status badge | `In Annotation` hoặc `Returned` |

### 3.2. Panel trái — Answer Context

| Element | Mô tả |
|---|---|
| Article metadata | `article_code`, title, category, tier, confidence score |
| PDF trace link | Tên file Answer PDF gốc (`answer_pdf_filename`) |
| Full answer text | `answer_text_normalized` từ parse, scrollable |
| Section headings | Tóm tắt, phân tích, hồ sơ, lưu ý... nếu parser detect được |
| Highlight claim | Highlight đoạn liên quan claim đang review |
| Citation markers | Hiển thị `[1]`, `[2]` trong answer nếu có |

### 3.3. Panel giữa — Claim & Scoring

#### Claim section

| Element | Mô tả |
|---|---|
| Claim text | Hiển thị `claim_text_original` |
| Section name | Section chứa claim (nếu extraction detect được) |
| Citation markers | `[n]` gắn với claim |
| Mapped source orders | Danh sách `source_order` candidate |
| Edit icon | Cho phép sửa claim |
| Save edited claim | Lưu thành `claim_text_final`, ghi audit log |
| AI Draft badge | Luôn hiển thị trên claim/pre-score |

#### Scoring table

| Dimension | Pre-score | Annotator input | Validation |
|---|---|---|---|
| SF | Hiển thị | Number input | 0.00-1.00, tối đa 2 chữ số thập phân |
| SC | Hiển thị | Number input | Như trên |
| NH | Hiển thị | Number input | Như trên |
| SQ | Hiển thị | Number input | Như trên |
| REL | Hiển thị | Number input | Như trên |
| COMP | Hiển thị | Number input | Như trên |

> **Rule:** Pre-score được pre-fill. Annotator có thể giữ nguyên hoặc override.

#### Composite score

| Element | Mô tả |
|---|---|
| Công thức | Trung bình đều 6 dimension |
| Hiển thị | Read-only |
| Màu sắc | Xanh / Cam / Đỏ theo band |

#### Reason and notes

| Field | Bắt buộc khi nào | Ghi chú |
|---|---|---|
| Lý do thay đổi | Khi bất kỳ dimension lệch pre-score quá ngưỡng đã chốt | Placeholder giải thích ngắn |
| Ghi chú annotator | Không bắt buộc | Dùng cho context bổ sung |

### 3.4. Panel phải — Source Viewer & Reference

#### Source list (từ PDF parse)

| Element | Mô tả |
|---|---|
| Source order | Số thứ tự nguồn `[1]`, `[2]`... |
| Source title | Tiêu đề từ Source Reference PDF |
| Source tier | Tier 1 / Tier 3 / unknown |
| Source URL | Hiển thị nếu parse được; nếu null hiển thị badge `URL not in PDF` |
| Source text extract | Nội dung từ Source Content PDF, scrollable |
| Source file ref | Tên file PDF nguồn liên quan |
| Parse status badge | `parsed` / `unparsed` / `ocr_required` |

#### Source status options (`source_access_status`)

| Option | Tác động |
|---|---|
| `source_text_parsed` | Nguồn đã có text từ PDF, annotator đối chiếu được |
| Truy cập được - hỗ trợ rõ | Không có auto rule |
| Truy cập được - hỗ trợ một phần | Gợi ý SC thấp hơn |
| Truy cập được - không hỗ trợ | Gợi ý SC rất thấp hoặc 0 |
| `inaccessible` / Không truy cập được | Note bắt buộc (VR-ANN-004) |
| Không liên quan | Gợi ý SC rất thấp |
| `unknown` | Mặc định khi chưa xác nhận |

#### Reference tabs

| Tab | Nội dung |
|---|---|
| Rubric | Anchor điểm |
| Guideline | Hướng dẫn |
| Examples | Ví dụ tốt/xấu |

### 3.5. Action bar

| Button | Điều kiện enable | Hành vi |
|---|---|---|
| Submit | Đủ 6 dimension + đủ điều kiện source status + đủ reason nếu cần | Chuyển task sang `Submitted` |

> **Auto-save:** chạy nền mỗi 30 giây. Không có nút Save Draft riêng trong MVP.

### 3.6. Submit validation

| Điều kiện lỗi | Thông báo |
|---|---|
| Thiếu dimension | Yêu cầu điền đủ |
| Chưa xác nhận source status tối thiểu | Yêu cầu chọn trạng thái nguồn |
| Source unparsed/inaccessible mà thiếu note | Yêu cầu điền note (VR-ANN-004) |
| Thiếu lý do thay đổi khi vượt ngưỡng | Yêu cầu điền reason |

### 3.7. Returned state

| Element | Mô tả |
|---|---|
| Banner đỏ | Thông báo task bị return |
| QA comment box | Hiển thị loại lỗi + comment của QA |
| Submit button | Đổi nhãn thành `Resubmit` |

### 3.8. Data dependencies

| Dữ liệu | Nguồn |
|---|---|
| `article_code`, title, category, tier | PDF parse metadata |
| `answer_text_normalized` | PDF parse result |
| `claim_text_original`, `claim_text_final` | Claim extraction + annotator edit |
| citation markers, mapped source orders | Claim extraction + source mapping |
| pre-scores | LLM pre-scoring output |
| source list (order/title/tier/url/text) | PDF parse + source reference extraction |
| `bundle_id`, PDF filenames | PDF bundle import |
| rubric anchors | Seed config hoặc static config |
| guideline content | Static content hoặc DB |

---

## 4. Màn hình 3 — QA Review Workspace

**URL:** `/qa/:task_id/review`  
**Vai trò:** QA, ADMIN  
**Mục đích:** QA review kết quả annotator và quyết định approve hoặc return.

### 4.1. Header

| Element | Nội dung |
|---|---|
| Breadcrumb | QA Queue > Project > Claim |
| Annotator info | Tên annotator + submitted time |
| Return count | Số lần bị return |

### 4.2. Tabs

| Tab | Nội dung |
|---|---|
| Review | Màn hình diff chính |
| History | Lịch sử action |

### 4.3. Diff view

| Cột | Nội dung |
|---|---|
| LLM Baseline | Pre-scores immutable |
| Annotator Output | Điểm annotator đã submit |
| Delta | Chênh lệch |
| Highlight | Đổi màu khi có chênh lệch |

### 4.4. Claim & source section

| Element | Mô tả |
|---|---|
| Claim text | Bản cuối từ annotator nếu có sửa |
| Edited indicator | Badge nếu claim đã bị sửa |
| Source list | source order/title/tier, source text, URL (nếu có), source status |
| Annotator notes | Ghi chú của annotator |

### 4.5. QA actions

#### Approve

| Item | Mô tả |
|---|---|
| Button | `Approve` |
| Result | Task chuyển `Approved` |
| Validation | Không cần comment bắt buộc |

#### Return

| Item | Mô tả |
|---|---|
| Button | `Return` |
| Required fields | Error type + comment |
| Result | Task chuyển `Returned` |

#### Return error types

| Option |
|---|
| Factual Error |
| Guideline Violation |
| Source Mismatch |
| Incomplete |
| Other |

### 4.6. States

| State | Mô tả |
|---|---|
| Loading | Đang tải task review |
| Ready | Hiển thị đầy đủ diff view |
| Action Pending | Đã mở modal return |
| Approved | Show toast, quay về queue |
| Returned | Show toast, quay về queue |

### 4.7. Data dependencies

| Dữ liệu | Nguồn |
|---|---|
| annotator scores | Backend |
| LLM baseline | Backend |
| claim text final | Backend |
| task history | Audit log hoặc task history API |

---

## 5. Màn hình 4 — Export

**URL:** `/export/new`  
**Vai trò:** ADMIN, QA được cấp quyền  
**Mục đích:** Export dữ liệu claim-level dưới dạng CSV, có trace về PDF bundle gốc.

### 5.1. Fields

| Field | Loại | Bắt buộc | Ghi chú |
|---|---|---|---|
| Project | Dropdown | Có | |
| Batch | Dropdown | Không | |
| Status | Dropdown | Có | Mặc định `Approved` |
| Format | Dropdown | Có | MVP chỉ có `CSV claim-level` |

### 5.2. Actions

| Action | Kết quả |
|---|---|
| Create Export Job | Tạo export |
| Download | Tải file CSV |

### 5.3. Validation

| Rule | Hành vi |
|---|---|
| Chưa chọn project | Không cho tạo export |
| Chọn status khác Approved nếu team chặn | Disable hoặc báo lỗi |

### 5.4. States

| State | Mô tả |
|---|---|
| Default | Form trống |
| Processing | Đang tạo file |
| Done | Có nút download |
| Failed | Hiển thị lỗi |

### 5.5. Data dependencies

| Dữ liệu | Nguồn |
|---|---|
| export schema | `docs/03_ba/dan/02_Import_Export_Schema.md` §10 |
| approved task list | Backend |
| `bundle_id`, PDF filenames, `article_code` | PDF bundle import (bắt buộc trong export) |
| export history | Backend |

---

## 6. Empty, loading và error states tối thiểu

| Màn hình | Empty state | Loading state | Error state |
|---|---|---|---|
| Project List | Chưa có project | Đang tải | Không tải được danh sách |
| My Tasks | Chưa có task được giao | Đang tải | Không tải được task |
| QA Queue | Chưa có task cần review | Đang tải | Không tải được queue |
| Export History | Chưa có export job | Đang tải | Không tải được lịch sử export |

---


