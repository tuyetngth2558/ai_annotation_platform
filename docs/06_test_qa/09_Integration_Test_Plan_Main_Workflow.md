# Integration Test Plan — Main Workflow PDF-native MVP

**Owner:** QA Team  
**Phiên bản:** v1.0  
**Ngày:** 15/06/2026  
**Scope baseline:** `docs/03_ba/00_Scope_Assignment_MVP.md`

---

## 1. Mục tiêu

Kiểm tra các module chính đã tích hợp đúng với nhau theo workflow MVP:

```text
Auth/RBAC
-> Project Setup
-> PDF Bundle Upload
-> PDF Parsing / Text Extraction
-> Internal Normalization
-> Claim Extraction
-> Source Mapping
-> LLM Pre-scoring
-> Annotator Review
-> QA Review
-> Export CSV
-> Audit/Log
```

Integration test tập trung kiểm tra **data contract, state transition, API/UI handoff và traceability giữa module**, không chỉ kiểm từng màn riêng lẻ.

---

## 2. In scope

| Module/Integration point | Nội dung cần kiểm |
|---|---|
| Auth -> Role access | User login đúng role và chỉ gọi/xem được module được phép |
| Project -> Import | Project config/assignment dùng được khi import bundle |
| Upload -> Storage | File PDF lưu đúng metadata, file role, bundle reference |
| Upload -> Parser | Bundle hợp lệ trigger parse; bundle lỗi bị block |
| Parser -> Normalization | Raw text, metadata, source list chuyển thành dữ liệu nội bộ |
| Normalization -> Claim Extraction | `answer_text_normalized` tạo được claim task đúng parent/bundle |
| Claim -> Source Mapping | Citation/source order map đúng hoặc vào trạng thái cần xử lý |
| Pipeline -> LLM | Payload gửi LLM/mock đúng schema; response tạo pre-score |
| Pre-score -> Annotation | Annotator nhìn thấy baseline/pre-score và source context |
| Annotation -> QA | Submit hợp lệ chuyển task sang QA Queue |
| QA -> Annotation | Return chuyển task về annotator kèm error/comment |
| QA -> Export | Approved task xuất được CSV claim-level |
| Workflow -> Audit/Log | Action chính có audit/log đủ trace |

---

## 3. Out of scope

- Load/performance test dài hạn.
- Security penetration test.
- Multi-project scaling nâng cao.
- Audio/image workflow.
- OCR đầy đủ cho scan/image PDF phức tạp.
- Dispute workflow, notification, analytics nâng cao.

---

## 4. Test data

| Data set | Mục đích |
|---|---|
| Valid PDF Bundle | Kiểm full happy integration flow |
| PDF Bundle thiếu từng file role | Kiểm upload validation không trigger parser |
| PDF Bundle có source URL missing | Kiểm warning không block pipeline |
| PDF không parse được answer text | Kiểm parse fail dừng đúng state |
| Source content unparsed/ocr_required | Kiểm source status/note và trace |
| LLM mock success | Kiểm pre-score success |
| LLM mock timeout/invalid schema | Kiểm pre-score failed |
| Approved + Returned + Submitted tasks | Kiểm export approved-only |

---

## 5. Entry criteria

- Staging/dev environment deploy được.
- DB migration đã chạy và schema workflow có sẵn.
- Storage path/volume cho PDF đã cấu hình.
- Có tài khoản Admin, Annotator, QA.
- Có ít nhất 1 valid PDF Bundle và 1 invalid bundle.
- LLM provider hoặc mock provider đã sẵn sàng.
- Dev cung cấp endpoint/API hoặc UI flow đủ để kiểm trạng thái pipeline.

---

## 6. Integration scenarios

| ID | Integration scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| INT-001 | Auth/RBAC gates main workflow | Login Admin, Annotator, QA; thử mở module trái quyền bằng menu và direct URL | Mỗi role chỉ truy cập đúng module; API trái quyền trả 401/403 | P0 |
| INT-002 | Project setup feeds import workflow | Admin tạo project, cấu hình LLM, gán Annotator/QA, mở import trong project đó | Import dùng đúng project/config/assignment; không mất context project | P0 |
| INT-003 | PDF upload writes storage metadata | Upload valid PDF bundle đủ role | File lưu với `bundle_id`, filename, file_role, storage ref; không duplicate sai role | P0 |
| INT-004 | Upload validation blocks parser | Upload bundle thiếu `answer_pdf`, `source_ref_pdf`, `source_content_pdf` hoặc non-PDF | Validation fail; không tạo batch/parent task; parser không chạy | P0 |
| INT-005 | Upload confirm triggers parser and creates import state | Confirm valid bundle | Batch/bundle chuyển trạng thái import/parse đúng; log import được ghi | P0 |
| INT-006 | Parser output feeds normalization | Parse valid answer/source PDFs | Raw text, normalized answer text, metadata, source list, source parse status được lưu | P0 |
| INT-007 | Parse warning continues workflow | Source URL missing nhưng source title/order/text có đủ | Warning hiển thị; pipeline vẫn tạo normalized data và claim task | P1 |
| INT-008 | Parse fail stops downstream workflow | Answer text không extract được | Bundle/task vào trạng thái parse failed/invalid; không tạo claim ready cho annotator | P0 |
| INT-009 | Normalization feeds claim extraction | Dùng `answer_text_normalized` hợp lệ | Claim task được tạo, có `parent_task_id`, `claim_order`, `bundle_id` trace | P0 |
| INT-010 | Claim extraction feeds source mapping | Claim có citation marker/source order | Source mapping đúng source order/title/file ref; nếu không map được thì vào `Source Mapping Required` | P1 |
| INT-011 | Source mapping and claim context feed LLM pre-scoring | Pipeline gọi LLM/mock với claim/source context | Pre-score đủ 6 dimension; baseline immutable/read-only | P0 |
| INT-012 | LLM failure does not break whole system | LLM timeout hoặc response sai schema | Task vào `Pre-scoring Failed`; lỗi có log; không tạo dữ liệu pre-score sai | P1 |
| INT-013 | Pre-score and source context feed annotation workspace | Annotator mở task ready | Workspace hiển thị claim, source context, PDF trace, pre-score và source status | P0 |
| INT-014 | Annotation submit feeds QA queue | Annotator nhập đủ score/note và submit | Task chuyển `Submitted`; QA Queue thấy task; history/audit có submit | P0 |
| INT-015 | QA return feeds annotator queue | QA return với error type/comment | Task chuyển `Returned`; Annotator thấy comment và resubmit được | P0 |
| INT-016 | QA approve feeds export | QA approve task submitted | Task chuyển `Approved`; export job lấy được claim approved | P0 |
| INT-017 | Export preserves traceability | Export CSV sau khi có approved claim | CSV có required columns, source refs, PDF filenames/bundle ID; chỉ xuất Approved | P0 |
| INT-018 | Audit/log follows full workflow | Thực hiện import, parse, submit, return/approve, export | Audit/log có actor, action, object ID, timestamp, status/error nếu có | P1 |

---

## 7. Data/state checkpoints

| Checkpoint | Cần xác nhận |
|---|---|
| Sau upload | Có bundle/file records, file role đúng, storage ref đúng |
| Sau parse | Có raw text, parse status, warnings/errors |
| Sau normalization | Có normalized answer text, metadata, source list |
| Sau claim extraction | Có claim task, parent task, claim order |
| Sau source mapping | Có mapped source refs hoặc state `Source Mapping Required` |
| Sau LLM pre-score | Có 6 scores, provider/mock status, immutable baseline |
| Sau annotator submit | Task state `Submitted`, QA queue nhận task |
| Sau QA return | Task state `Returned`, annotator thấy feedback |
| Sau QA approve | Task state `Approved`, export eligible |
| Sau export | CSV đúng schema, approved-only, trace PDF |
| Sau mỗi action chính | Audit/log đủ thông tin và không lộ secret |

---

## 8. Exit criteria

- `INT-001`, `INT-003`, `INT-004`, `INT-006`, `INT-009`, `INT-011`, `INT-014`, `INT-016`, `INT-017` pass.
- Không còn bug Critical/P0 ở workflow chính.
- Bug High/P1 còn mở phải có workaround được BA/PO chấp nhận.
- Full workflow chạy được ít nhất 1 lần trên staging với valid PDF Bundle.
- Export CSV trace được về PDF bundle gốc.

---

## 9. Related QA artifacts

| Artifact | Dùng để làm gì |
|---|---|
| `01_Test_Plan_PDF_Native_MVP.md` | Strategy tổng thể |
| `02_AC_to_Test_Cases_Mapping.md` | Trace AC/BR sang test coverage |
| `03_E2E_Test_Scenarios.md` | E2E user journey |
| `05_Functional_Test_Checklist.md` | Checklist từng module |
| `06_API_UI_Sanity_Checklist.md` | Sanity API/UI sau deploy |
| `08_Regression_Checklist.md` | Regression sau fix bug/deploy |
