# Screen Flow — VSF AI Annotation Platform MVP

**Owner:** Nguyễn Thị Tuyết  
**Trạng thái:** Ready for cross-review  

---

## 1. Mục đích

Tài liệu này mô tả luồng điều hướng giữa các màn hình trong MVP cho từng vai trò, đồng thời chốt rõ:

- flow nào nằm trong phạm vi build
- flow nào chỉ cần hiển thị hoặc reserve cho phase sau
- hành vi cụ thể khi người dùng submit, return, approve, export

Tài liệu này là input trực tiếp cho:

- wireframe/prototype
- screen specification
- phân tách task build cho dev
- test scenario cho QA

---

## 2. Nguyên tắc flow của MVP

1. MVP chỉ có **1 modality là text**
2. QA trong MVP chỉ có **Approve** và **Return**
3. **Dispute không build**
4. **Save Draft riêng không build**
5. **Skip riêng không build**
6. Có **auto-save** trong lúc annotator đang làm
7. Export chỉ lấy task ở trạng thái **Approved**

> **Lý do loại bỏ Save Draft và Skip:** hai hành vi này làm tăng thêm state và validation logic nhưng không phải phần cốt lõi để chứng minh MVP end-to-end.

---

## 3. Luồng tổng thể end-to-end

```text
ADMIN
Login
  → Dashboard
  → Tạo Project
  → Import PDF Bundle
  → Hệ thống parse PDF + normalize
  → Hệ thống chạy Claim Extraction
  → Hệ thống chạy Source Mapping
  → Hệ thống chạy LLM Pre-scoring
  → Phân công Annotator / QA

ANNOTATOR
Login
  → My Tasks
  → Chọn Claim Task
  → Annotation Workspace
  → Submit
  → Task vào QA Queue

QA
Login
  → QA Queue
  → Chọn Claim Task
  → QA Review Workspace
  → Approve hoặc Return

ADMIN / QA
  → Export CSV các task Approved
```

---

## 4. Luồng theo vai trò

### 4.1. Luồng ADMIN

```text
Login
→ Dashboard
→ Project Setup
→ Import PDF Bundle
→ Theo dõi tiến độ cơ bản tại Project Detail
→ Export CSV
→ Audit Log
```

### 4.2. Luồng ANNOTATOR

```text
Login
→ Dashboard / My Tasks
→ Chọn task được giao
→ Annotation Workspace
→ Submit
→ Nếu bị QA Return thì mở lại task
→ Sửa theo comment
→ Resubmit
```

### 4.3. Luồng QA

```text
Login
→ Dashboard / QA Queue
→ Chọn task
→ QA Review Workspace
→ Approve hoặc Return
```

---

## 5. Flow màn hình #1 — Project Setup và Import PDF Bundle

### 5.1. Luồng chính

```text
[ADMIN] Chọn "Tạo dự án mới"
  → Bước 1: Nhập thông tin project
  → Bước 2: Cấu hình LLM
  → Bước 3: Upload PDF Bundle (Answer + Source Ref + Source Content)
  → Bước 4: Gán file role và validate bundle
  → Bước 5: Preview metadata/parse result
  → Bước 6: Xác nhận import
  → Hệ thống parse PDF → claim extraction → source mapping → pre-scoring nền
  → Bước 7: Phân công Annotator và QA
  → Hoàn tất, quay về Project Detail
```

### 5.2. Flow chi tiết

```text
Project Setup
  → Nhập tên project
  → Chọn modality type = Text (fixed trong MVP)
  → Nhập deadline (optional)
  → Nhập endpoint + API key + prompt template
  → Next

Import PDF Bundle
  → Upload nhiều file PDF (hoặc upload theo batch manifest)
  → Gán file_role: answer_pdf / source_ref_pdf / source_content_pdf
  → Validate bundle (PDF hợp lệ, không trùng role bắt buộc; `source_content_pdf` là optional — ≥0)
  → Preview parse: article_code, title, source list, parse warnings
  → Confirm Import

System Background Processing
  → Parse PDF files
  → Normalize answer/source text
  → Tạo Parent Task
  → Extract Source References
  → Tách Claim Task
  → Map citation `[n]` ↔ source_order
  → Gọi LLM pre-scoring

Assignment
  → Chọn Annotator
  → Chọn QA
  → Confirm
```

### 5.3. Trường hợp lỗi

| Tình huống | Kết quả |
|---|---|
| File không phải PDF hoặc PDF corrupt | Hiển thị lỗi, không cho import |
| Bundle thiếu `answer_pdf` hoặc `source_ref_pdf` | Block import, báo thiếu file role |
| Bundle không có `source_content_pdf` | Không block (optional); nếu thiếu hoàn toàn → warning annotator dùng `source_ref_pdf` metadata + URL |
| Không parse được answer text | Bundle invalid, báo `Cannot extract answer text` |
| Không parse được source list | Block hoặc flag bundle invalid |
| `source_url` không parse được từ PDF | Cho import, `source_url = null`, hiển thị warning |
| Claim không map được source | Claim task vào `Source Mapping Required` |
| PDF scan/image (OCR required) | Flag `ocr_required`; MVP có thể reject nếu chưa hỗ trợ OCR |
| LLM pre-scoring lỗi | Task vào `Pre-scoring Failed`, Admin thấy trạng thái lỗi |

### 5.4. Kết quả cuối flow

- Project được tạo
- Batch được lưu với `import_type = pdf_bundle`
- PDF Bundle và file references được lưu
- Parent Task được tạo sau parse
- Claim Task được tạo sau extraction
- Task sẵn sàng vào queue annotator sau khi pre-scoring xong

---

## 6. Flow màn hình #2 — Annotation Workspace

### 6.1. Luồng chính

```text
[ANNOTATOR] Vào My Tasks
  → Chọn 1 task
  → Mở Annotation Workspace
  → Xem answer context (từ Answer PDF)
  → Xem metadata bài (article_code, title, category)
  → Xem claim text + citation markers
  → Review LLM pre-scores
  → Kiểm tra source (order/title/tier, source text từ PDF)
  → Chỉnh điểm nếu cần
  → Nhập lý do nếu lệch ngưỡng
  → Submit
  → Task vào QA Queue
```

### 6.2. Cấu trúc flow trong workspace

```text
Mở task
  → Task chuyển sang "In Annotation"
  → Timer bắt đầu
  → Auto-save hoạt động định kỳ

Annotator thao tác
  → Có thể sửa claim text
  → Có thể giữ nguyên hoặc override điểm
  → Có thể chọn trạng thái nguồn
  → Có thể ghi chú

Submit
  → Validate đủ 6 dimension
  → Validate source status tối thiểu
  → Validate lý do thay đổi nếu lệch ngưỡng
  → Nếu pass thì chuyển "Submitted"
  → Task vào QA Queue
```

### 6.3. Luồng khi task bị return

```text
Task ở trạng thái "Returned"
  → Annotator thấy task trong My Tasks
  → Mở lại workspace
  → Xem banner return + QA comment
  → Chỉnh sửa
  → Resubmit
  → Quay lại QA Queue
```

### 6.4. Những gì KHÔNG có trong MVP

- không có nút `Skip`
- không có `Save Draft` riêng
- không có offline sync
- không có dispute escalation từ annotator

> **MVP note:** Auto-save là hành vi hỗ trợ trong khi làm việc, không phải một trạng thái nghiệp vụ riêng.

---

## 7. Flow màn hình #3 — QA Review Workspace

### 7.1. Luồng chính

```text
[QA] Vào QA Queue
  → Chọn 1 task
  → Mở QA Review Workspace
  → Xem claim, source, annotator output, LLM baseline diff
  → Approve hoặc Return
```

### 7.2. Flow chi tiết

```text
Mở task QA
  → Xem thông tin task
  → Xem lịch sử submit / return
  → Xem diff giữa LLM và Annotator

Nếu Approve
  → Task chuyển "Approved"
  → Eligible for Export

Nếu Return
  → QA bắt buộc chọn loại lỗi
  → QA bắt buộc nhập comment
  → Task chuyển "Returned"
  → Task quay lại queue của annotator
```

### 7.3. Hành vi bị loại khỏi MVP

- không có dispute
- không có sampling engine UI nâng cao
- không có QA sửa trực tiếp điểm trong MVP build scope

> **Quyết định khóa scope:** để giảm rủi ro build, MVP giữ QA chỉ với hai action chính là `Approve` và `Return`.  
> Nếu team sau đó muốn bật `QA direct correction`, cần chốt lại scope và state machine riêng.

---

## 8. Flow màn hình #4 — Export

### 8.1. Luồng chính

```text
[ADMIN/QA] Vào Export
  → Chọn project
  → Chọn batch (optional)
  → Chọn trạng thái = Approved
  → Chọn format = CSV claim-level
  → Create Export Job
  → Tải file CSV
```

### 8.2. Rule export

- mặc định chỉ export task `Approved`
- không export task `Returned`, `In Annotation`, `Submitted`
- format duy nhất trong MVP là `CSV claim-level`
- tất cả export phải được log vào audit log

---

## 9. Mapping trạng thái nghiệp vụ với flow

| Trạng thái | Ai kích hoạt | Ý nghĩa |
|---|---|---|
| Uploaded | System | PDF bundle vừa upload |
| Parsing | System | Đang parse PDF |
| Parse Failed | System | Không parse được answer/source bắt buộc |
| Parsed | System | Parse xong, có normalized data |
| Claim Extracted | System | Đã tách claim |
| Source Mapping Required | System | Claim chưa map được source |
| Pre-scoring Running | System | Đang gọi LLM |
| Pre-scoring Failed | System | LLM lỗi |
| Ready for Annotation | System | Sẵn sàng cho annotator |
| In Annotation | Annotator | Đang xử lý |
| Submitted | Annotator | Đã submit cho QA |
| Returned | QA | QA trả lại |
| Approved | QA | Đủ điều kiện export |
| Exported | System | Đã nằm trong export job |

---

## 10. Mapping flow với màn hình chính

| Màn hình | Vai trò | Mục đích |
|---|---|---|
| Project Setup / Import PDF Bundle | ADMIN | tạo project, upload PDF bundle, khởi động parse + pipeline |
| Annotation Workspace | ANN | review claim và submit |
| QA Review Workspace | QA | review output annotator |
| Export | ADMIN, QA | xuất CSV claim-level |

---

## 11. Sprint 3 — Mở rộng (Notification, Dispute, Export Consolidated)

> MVP Sprint 1–2 **không** gồm dispute, notification center, export XLSX consolidated.  
> Luồng và screen spec Sprint 3 xem:

- [`01_Information_Architecture.md`](01_Information_Architecture.md) v3.0
- [`05_Sprint3_Screen_Flow_Extensions.md`](05_Sprint3_Screen_Flow_Extensions.md)
- [`06_Sprint3_Screen_Specification.md`](06_Sprint3_Screen_Specification.md)

**Delta QA Workspace Sprint 3:** thêm action `Escalate Dispute` sau return lần 2 (giữ Approve / Return).

