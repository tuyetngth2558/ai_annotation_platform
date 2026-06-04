# Screen Specification — VSF AI Annotation Platform MVP

**Owner:** Tuyết  
**Phiên bản:** 2.0  
**Ngày:** 03/06/2026  
**Trạng thái:** Ready for cross-review  

> Tài liệu này đặc tả chi tiết các màn hình chính trong MVP.  
> Mỗi màn gồm: mục đích, components, fields, actions, validations, states, data dependencies.

---

## 1. Quy ước chung

### 1.1. Màn hình nằm trong phạm vi build

1. `Project Setup / Import Dataset`
2. `Annotation Workspace`
3. `QA Review Workspace`
4. `Export`

### 1.2. Thuật ngữ dùng trong spec

- `Task` trong màn hình MVP = `Claim Task`
- `Answer Context` = câu trả lời LLM gốc của work item
- `Pre-score` = điểm do LLM gợi ý
- `Final score` = điểm được chấp nhận cuối cùng sau QA approve

### 1.3. Quyết định khóa scope cho spec

- không có `Skip`
- không có `Save Draft` riêng
- không có `Dispute`
- không có `QA direct correction` trong build MVP

---

## 2. Màn hình 1 — Project Setup / Import Dataset

**URL:** `/projects/new` và `/projects/:id/import`  
**Vai trò:** ADMIN  
**Mục đích:** Tạo project mới và import dữ liệu để bắt đầu pipeline annotation.

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
| Tiếp tục | Các field bắt buộc hợp lệ | Sang bước Import |
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

### 2.2. Import Dataset

#### Components

| Component | Mô tả |
|---|---|
| Upload zone | Drag & drop hoặc chọn file |
| Format indicator | Hiển thị file `CSV` hoặc `JSON` |
| Schema validator | Tự chạy sau khi chọn file |
| Preview table | Hiển thị 5 dòng đầu |
| Error panel | Danh sách lỗi validate |
| Confirm Import button | Chỉ enable khi file hợp lệ |

#### Schema CSV tối thiểu

| Cột | Kiểu dữ liệu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `answer_id` | String | Có | ID đầu vào |
| `answer_text` | String | Có | Nội dung câu trả lời LLM |
| `source_urls` | String | Có | Separator do Đan chốt |
| `domain` | String | Không | Chủ đề |
| `question_text` | String | Không | Câu hỏi gốc |

#### Validation rules

| Rule | Hành vi |
|---|---|
| File không phải CSV/JSON | Hiển thị lỗi, không cho import |
| Thiếu cột bắt buộc | Hiển thị tên cột thiếu |
| `answer_text` rỗng | Hiển thị lỗi theo dòng |
| `source_urls` rỗng | Cảnh báo hoặc tạo trạng thái `Source Mapping Required` theo rule team chốt |
| File > 10MB | Chặn import |
| Duplicate `answer_id` | Báo lỗi trùng ID |

#### Actions

| Action | Điều kiện | Kết quả |
|---|---|---|
| Chọn file | Luôn có | Tải file lên bộ nhớ tạm |
| Validate | Tự động sau khi chọn file | Hiển thị pass/fail |
| Xác nhận Import | File hợp lệ | Tạo batch, work item, trigger pipeline nền |

#### States

| State | Mô tả |
|---|---|
| Uploading | Đang tải file |
| Validating | Đang kiểm tra schema |
| Validation Failed | Hiển thị lỗi |
| Validation Passed | Hiển thị preview + enable import |
| Importing | Đang tạo dữ liệu |
| Background Processing | Đang claim extraction + pre-scoring |
| Done | Redirect về Project Detail |

#### Data dependencies

| Dữ liệu | Nguồn |
|---|---|
| Import schema chuẩn | Đan owner |
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
| Quay lại | Trở về bước Import, giữ dữ liệu |

---

## 3. Màn hình 2 — Annotation Workspace

**URL:** `/tasks/:task_id/annotate`  
**Vai trò:** ANNOTATOR  
**Mục đích:** Review claim, xác nhận/sửa điểm, xác nhận nguồn, submit cho QA.

### 3.1. Header

| Element | Mô tả |
|---|---|
| Breadcrumb | Project > Batch > Task |
| Claim counter | Ví dụ `Claim 3 / 12` |
| Timer | Bắt đầu khi mở task |
| Previous / Next | Điều hướng claim trong cùng parent item |
| Status badge | `In Annotation` hoặc `Returned` |

### 3.2. Panel trái — Answer Context

| Element | Mô tả |
|---|---|
| Title | Câu trả lời gốc |
| Full answer text | Scrollable |
| Highlight claim | Highlight đoạn liên quan nếu có mapping |
| Domain badge | Hiển thị domain nếu có |

### 3.3. Panel giữa — Claim & Scoring

#### Claim section

| Element | Mô tả |
|---|---|
| Claim text | Hiển thị `claim_text_original` |
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

#### Source list

| Element | Mô tả |
|---|---|
| URL list | Mỗi URL một dòng |
| Domain label | Hiển thị domain |
| Open in app | Nếu site cho phép |
| Open new tab | Fallback |

#### Source status options

| Option | Tác động |
|---|---|
| Truy cập được - hỗ trợ rõ | Không có auto rule |
| Truy cập được - hỗ trợ một phần | Gợi ý SC thấp hơn |
| Truy cập được - không hỗ trợ | Gợi ý SC rất thấp hoặc 0 |
| Không truy cập được | Note bắt buộc |
| Không liên quan | Gợi ý SC rất thấp |

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
| Thiếu note khi nguồn không truy cập được nếu team giữ rule đó | Yêu cầu điền note |
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
| `answer_text`, `claim_text_original`, `claim_text_final` | Backend task detail API |
| pre-scores | LLM pre-scoring output |
| source urls | Import pipeline |
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
| Source list | URL + source status |
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
**Mục đích:** Export dữ liệu claim-level dưới dạng CSV.

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
| export schema | Đan owner |
| approved task list | Backend |
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

## 7. Điểm cần review chéo

- **Quang:** AC và business rules có khớp với spec không
- **Đan:** field/data dependencies có đủ cho backend model không
- **Trí:** spec có đủ để dựng wireframe/final UI không
- **Nhung/Hưng:** validation và states có đủ để viết test case không

---

*Nếu dev cần rút gọn thêm scope, ưu tiên giữ nguyên logic màn `Annotation Workspace` và `QA Review`, rồi tối giản ở `Dashboard`, `User Management`, `Audit Log UI`.*
