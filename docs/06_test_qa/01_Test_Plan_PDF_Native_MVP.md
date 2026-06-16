# Test Plan MVP — VSF AI Annotation Platform

**Owner:** QA Team
**Phiên bản:** v1.2
**Ngày:** 10/06/2026
**Phạm vi:** MVP PDF-native cho Vivipedia text annotation
**Scope baseline:** `docs/03_ba/00_Scope_Assignment_MVP.md`

---

## 1. Mục tiêu kiểm thử

Đảm bảo MVP chạy ổn định end-to-end theo luồng:

```text
PDF Bundle Upload
-> PDF Parsing / Text Extraction
-> Internal Normalization
-> Claim Extraction
-> LLM Pre-scoring
-> Annotator Review
-> QA Review
-> Export CSV
```

Test plan này thay thế hướng test cũ theo CSV/JSON import. MVP hiện tại chỉ xem PDF bundle là input chính; CSV claim-level là output chính; JSON chỉ còn là artifact nội bộ/debug nếu cần.

Mục tiêu nghiệm thu chính:

- Admin tạo project, cấu hình LLM và import PDF Bundle hợp lệ.
- Hệ thống parse PDF, lưu raw text, normalized text, metadata/source list và tạo Parent Task.
- Hệ thống tạo Claim Task, source mapping và LLM pre-score từ dữ liệu đã normalized.
- Annotator chỉ thấy task được giao, review claim/source, nhập điểm và submit.
- QA review task `Submitted`, chỉ được `Approve` hoặc `Return`.
- Export chỉ xuất claim `Approved` ra CSV claim-level, trace được về PDF gốc.
- Audit log ghi nhận các action nghiệp vụ chính.

---

## 2. Cần làm gì trong task này

Task hôm nay tập trung vào hoàn thiện Test Plan và bổ sung test cases cho các luồng chính của MVP PDF-native.

| Việc cần làm | Cụ thể cần có | File chính |
|---|---|---|
| Hoàn thiện Test Plan | Scope test theo PDF-native, test strategy, test data, entry/exit criteria, risk | `01_Test_Plan_PDF_Native_MVP.md` |
| Bổ sung test cases luồng chính | Happy path, parse warning, QA Return/Resubmit, export approved-only, RBAC/audit smoke | `03_E2E_Test_Scenarios.md` |
| Mapping AC -> Test Cases | Mỗi AC/BR chính map sang nhóm test case cụ thể, dễ biết cần test gì | `02_AC_to_Test_Cases_Mapping.md` |

Functional Checklist và API/UI Sanity là checklist hỗ trợ để không bỏ sót validation, storage, config, audit và UI/API sanity khi chạy test.

---

## 3. Tài liệu đầu vào

| Tài liệu | Mục đích sử dụng |
|---|---|
| `docs/03_ba/tuyet/01_Information_Architecture.md` | Scope màn hình, role, module |
| `docs/03_ba/tuyet/02_Screen_Flow.md` | Luồng điều hướng và trạng thái |
| `docs/03_ba/tuyet/03_Screen_Specification.md` | Field, action, validation UI |
| `docs/03_ba/tuyet/04_Open_Questions_Assumptions_Dependencies.md` | Quyết định đã chốt và câu hỏi mở |
| `docs/03_ba/00_Scope_Assignment_MVP.md` | Scope baseline PDF-native chốt ngày 2026-06-08 |
| `docs/03_ba/dan/02_Import_Export_Schema.md` | Schema import PDF Bundle và export CSV |
| `docs/03_ba/dan/03_Validation_Rules.md` | Validation rules |
| `docs/03_ba/dan/04_Edge_Cases.md` | Edge cases ưu tiên test |
| `docs/03_ba/quang/VSF_AI_Annotation_Platform_AC_and_Business_Rules.md` | AC/BR nghiệp vụ theo PDF-native update |

---

## 4. Phạm vi kiểm thử

### 4.1. In scope

| Module | Nội dung kiểm thử |
|---|---|
| Auth / RBAC | Login, role-based navigation, quyền Admin/Annotator/QA |
| Project Setup | Tạo project, validate field, cấu hình LLM, assignment |
| PDF Bundle Import | Upload PDF, gán file role, validate, preview parse, confirm import |
| PDF Parsing / Text Extraction | Parse raw text từ Answer PDF, Source Reference PDF, Source Content PDF; ghi parse status/warning |
| Internal Normalization | Chuẩn hóa metadata, `answer_text_normalized`, source list và trace về PDF bundle |
| Background Pipeline | Create parent task, claim extraction, source mapping, pre-scoring |
| Annotation Workspace | Claim edit, source status, score validation, justification, auto-save, submit/resubmit |
| QA Review | Queue, diff score, history, approve, return |
| Export | Export CSV approved-only, encoding/quoting, required columns |
| Audit Log | Log import, claim edit, submit, approve, return, export |
| Error/Empty/Loading states | Các trạng thái tối thiểu theo screen spec |

### 4.2. Out of scope

- Mobile app/responsive mobile acceptance.
- Audio/image annotation workspace.
- Dispute workflow.
- Policy Center.
- Notification in-app/email.
- Analytics nâng cao.
- XLSX/JSON/bulk ZIP export.
- MFA, watermark, allowlist, immutable WORM audit.
- QA direct correction.
- Save Draft button riêng và Skip task.

---

## 5. Test strategy

| Loại test | Mục tiêu | Người thực hiện |
|---|---|---|
| Smoke Test | Xác nhận build/deploy mở được, login được, màn chính không crash | QA |
| Functional Test | Kiểm tra từng chức năng theo AC/BR | QA |
| Integration Test | Kiểm tra dữ liệu đi qua các module đúng trạng thái | QA + Dev |
| E2E Test | Kiểm thử luồng hoàn chỉnh từ import đến export | QA |
| API Sanity | Kiểm tra API chính trả status/schema đúng | QA + Dev |
| UI Sanity | Kiểm tra màn hình chính, navigation, form, action | QA |
| Regression Test | Chạy lại checklist sau fix bug hoặc release candidate | QA |
| UAT Support | Chuẩn bị kịch bản nghiệm thu cho mentor/stakeholder | QA + BA |

---

## 6. Test environment

| Hạng mục | Yêu cầu |
|---|---|
| Environment | Staging hoặc dev ổn định cho QA |
| Browser | Chrome latest, Edge latest |
| Test accounts | Admin, Annotator, QA |
| Test data | PDF Bundle hợp lệ, PDF thiếu file role, PDF corrupt/invalid, source content parsed/unparsed |
| LLM config | 1 provider cố định cho MVP hoặc mock provider có schema tương đương |
| Export viewer | Tool mở CSV UTF-8, kiểm tra delimiter/quote/newline |

---

## 7. Entry criteria

- BA scope PDF-native đã được xác nhận.
- Staging/dev environment deploy được.
- Có test account cho 3 role.
- Có ít nhất 1 PDF Bundle hợp lệ và 1 bộ invalid data.
- Có expected parse result tối thiểu cho metadata, normalized answer text và source list.
- API chính hoặc mock API đã sẵn sàng cho import/pipeline/review/export.
- Dev cung cấp release note ngắn cho build cần test.

---

## 8. Exit criteria

- 100% test scenario Critical/High đã executed.
- Không còn bug Critical/Open.
- Bug High còn mở phải có workaround hoặc được PO/BA chấp nhận.
- E2E happy path pass ít nhất 1 lần trên staging.
- PDF parsing/normalization pass tối thiểu với dữ liệu thật dùng cho UAT.
- Export CSV pass required columns, approved-only filter, UTF-8 và trace PDF.
- Sanity API/UI pass trước UAT.

---

## 9. Roles and responsibility

| Vai trò | Trách nhiệm |
|---|---|
| QA Lead | Quản lý test plan, test coverage, exit criteria |
| QA Tester | Execute test case, log bug, verify fix |
| BA/Data | Giải thích AC/BR, xác nhận expected result, schema PDF-native và export fields |
| Dev | Fix bug, hỗ trợ log/API/debug |
| DevOps | Đảm bảo environment, config, deployment, log |
| PO/Mentor | Chốt scope, chấp nhận residual risk |

---

## 10. Priority and severity

### Priority

| Priority | Ý nghĩa |
|---|---|
| P0 | Block UAT/release, phải xử lý ngay |
| P1 | Ảnh hưởng luồng chính, cần xử lý trong sprint |
| P2 | Ảnh hưởng chức năng phụ hoặc có workaround |
| P3 | Minor/cosmetic, xử lý khi có thời gian |

### Severity

| Severity | Ý nghĩa |
|---|---|
| Critical | Mất dữ liệu, crash hệ thống, sai quyền, không chạy được E2E |
| High | Sai nghiệp vụ chính, sai validation, sai export |
| Medium | Lỗi một phần workflow, UI/API bất tiện nhưng có workaround |
| Low | Lỗi hiển thị nhỏ, typo, polish |

---

## 11. Key risks

| Risk | Impact | Mitigation |
|---|---|---|
| Tài liệu cũ còn ghi CSV/JSON import | Test sai scope | Lấy `00_Scope_Assignment_MVP.md` và PDF-native docs của Đan làm baseline |
| LLM provider/schema response chưa rõ khi test | Block pre-scoring test | Dùng mock provider/schema contract để test trước |
| PDF scan/image chưa có OCR | Parse fail | Test reject/flag `ocr_required` theo quyết định MVP |
| Source URL optional | Source verification dễ hiểu nhầm | Test theo `source_text_extract` là chính |
| Naming `NH` vs `HR` đã chốt dùng `HR` | Sai schema export/API nếu tài liệu cũ còn `NH` | Test theo schema PDF-native và rubric `SF/SC/HR/SQ/REL/COMP` |
| Export quyền Admin/QA còn lệch tài liệu | Sai RBAC | Chốt với BA/PO trước UAT |

---

## 12. Deliverables

- Test Plan MVP.
- E2E Test Scenarios.
- Integration Test Plan cho main workflow.
- Main Flow E2E Test Cases.
- PDF Parsing & Normalization Test Cases.
- Validation Test Cases map với Validation Rules.
- Bug Log Template.
- Functional Test Checklist.
- API/UI Sanity Test Checklist.
- Test Execution Report khi chạy test.
- UAT Checklist/Sign-off note cho demo/mentor review.

---

## 13. Ticket alignment

| Ticket | Nội dung test plan liên quan | Artifact chính |
|---|---|---|
| Test Plan - PDF-native MVP | Test strategy, scope, entry/exit criteria, risk | `01_Test_Plan_PDF_Native_MVP.md` |
| Test Cases - E2E Workflow PDF | Happy path, QA Return/Resubmit, Export CSV | `03_E2E_Test_Scenarios.md` |
| Integration Test Plan - Main Workflow | Data/state handoff giữa Auth, Project, Import, Parse, Normalize, Claim, LLM, Annotation, QA, Export | `09_Integration_Test_Plan_Main_Workflow.md` |
| Validation Test Cases | Upload validation, parse fail, source issue, score, QA return comment | `05_Functional_Test_Checklist.md`, `02_AC_to_Test_Cases_Mapping.md` |
| PDF Parsing & Normalization Test Cases | Raw text, normalized text, metadata, source list, traceability | `05_Functional_Test_Checklist.md`, `03_E2E_Test_Scenarios.md` |
| Regression Checklist | Re-run luồng chính sau bug fix | `08_Regression_Checklist.md` |
| UAT Checklist | Mentor/stakeholder review theo scope MVP và ký nhận nội bộ | `10_UAT_Checklist_Signoff.md` |
| Functional Test Execution | Chạy test, ghi bug, báo cáo kết quả | `07_Test_Execution_Report_Template.md`, `04_Bug_Log_Template.md` |
| API/UI Sanity Test | Build/staging sanity, route/API/action chính | `06_API_UI_Sanity_Checklist.md` |
| Workflow Export Verification | CSV approved-only, UTF-8, quoting, PDF trace | `03_E2E_Test_Scenarios.md`, `05_Functional_Test_Checklist.md` |
| Bug Log Triage | Phân loại bug blocking/defer trước demo | `04_Bug_Log_Template.md` |

# Test Plan MVP — VSF AI Annotation Platform

**Owner:** QA Team
**Phiên bản:** v1.2
**Ngày:** 10/06/2026
**Phạm vi:** MVP PDF-native cho Vivipedia text annotation
**Scope baseline:** `docs/03_ba/00_Scope_Assignment_MVP.md`

---

## 1. Mục tiêu kiểm thử

Đảm bảo MVP chạy ổn định end-to-end theo luồng:

```text
PDF Bundle Upload
-> PDF Parsing / Text Extraction
-> Internal Normalization
-> Claim Extraction
-> LLM Pre-scoring
-> Annotator Review
-> QA Review
-> Export CSV
```

Test plan này thay thế hướng test cũ theo CSV/JSON import. MVP hiện tại chỉ xem PDF bundle là input chính; CSV claim-level là output chính; JSON chỉ còn là artifact nội bộ/debug nếu cần.

Mục tiêu nghiệm thu chính:

- Admin tạo project, cấu hình LLM và import PDF Bundle hợp lệ.
- Hệ thống parse PDF, lưu raw text, normalized text, metadata/source list và tạo Parent Task.
- Hệ thống tạo Claim Task, source mapping và LLM pre-score từ dữ liệu đã normalized.
- Annotator chỉ thấy task được giao, review claim/source, nhập điểm và submit.
- QA review task `Submitted`, chỉ được `Approve` hoặc `Return`.
- Export chỉ xuất claim `Approved` ra CSV claim-level, trace được về PDF gốc.
- Audit log ghi nhận các action nghiệp vụ chính.

---

## 2. Cần làm gì trong task này

Task hôm nay tập trung vào hoàn thiện Test Plan và bổ sung test cases cho các luồng chính của MVP PDF-native.

| Việc cần làm | Cụ thể cần có | File chính |
|---|---|---|
| Hoàn thiện Test Plan | Scope test theo PDF-native, test strategy, test data, entry/exit criteria, risk | `01_Test_Plan_PDF_Native_MVP.md` |
| Bổ sung test cases luồng chính | Happy path, parse warning, QA Return/Resubmit, export approved-only, RBAC/audit smoke | `03_E2E_Test_Scenarios.md` |
| Mapping AC -> Test Cases | Mỗi AC/BR chính map sang nhóm test case cụ thể, dễ biết cần test gì | `02_AC_to_Test_Cases_Mapping.md` |

Functional Checklist và API/UI Sanity là checklist hỗ trợ để không bỏ sót validation, storage, config, audit và UI/API sanity khi chạy test.

---

## 3. Tài liệu đầu vào

| Tài liệu | Mục đích sử dụng |
|---|---|
| `docs/03_ba/tuyet/01_Information_Architecture.md` | Scope màn hình, role, module |
| `docs/03_ba/tuyet/02_Screen_Flow.md` | Luồng điều hướng và trạng thái |
| `docs/03_ba/tuyet/03_Screen_Specification.md` | Field, action, validation UI |
| `docs/03_ba/tuyet/04_Open_Questions_Assumptions_Dependencies.md` | Quyết định đã chốt và câu hỏi mở |
| `docs/03_ba/00_Scope_Assignment_MVP.md` | Scope baseline PDF-native chốt ngày 2026-06-08 |
| `docs/03_ba/dan/02_Import_Export_Schema.md` | Schema import PDF Bundle và export CSV |
| `docs/03_ba/dan/03_Validation_Rules.md` | Validation rules |
| `docs/03_ba/dan/04_Edge_Cases.md` | Edge cases ưu tiên test |
| `docs/03_ba/quang/VSF_AI_Annotation_Platform_AC_and_Business_Rules.md` | AC/BR nghiệp vụ theo PDF-native update |

---

## 4. Phạm vi kiểm thử

### 4.1. In scope

| Module | Nội dung kiểm thử |
|---|---|
| Auth / RBAC | Login, role-based navigation, quyền Admin/Annotator/QA |
| Project Setup | Tạo project, validate field, cấu hình LLM, assignment |
| PDF Bundle Import | Upload PDF, gán file role, validate, preview parse, confirm import |
| PDF Parsing / Text Extraction | Parse raw text từ Answer PDF, Source Reference PDF, Source Content PDF; ghi parse status/warning |
| Internal Normalization | Chuẩn hóa metadata, `answer_text_normalized`, source list và trace về PDF bundle |
| Background Pipeline | Create parent task, claim extraction, source mapping, pre-scoring |
| Annotation Workspace | Claim edit, source status, score validation, justification, auto-save, submit/resubmit |
| QA Review | Queue, diff score, history, approve, return |
| Export | Export CSV approved-only, encoding/quoting, required columns |
| Audit Log | Log import, claim edit, submit, approve, return, export |
| Error/Empty/Loading states | Các trạng thái tối thiểu theo screen spec |

### 4.2. Out of scope

- Mobile app/responsive mobile acceptance.
- Audio/image annotation workspace.
- Dispute workflow.
- Policy Center.
- Notification in-app/email.
- Analytics nâng cao.
- XLSX/JSON/bulk ZIP export.
- MFA, watermark, allowlist, immutable WORM audit.
- QA direct correction.
- Save Draft button riêng và Skip task.

---

## 5. Test strategy

| Loại test | Mục tiêu | Người thực hiện |
|---|---|---|
| Smoke Test | Xác nhận build/deploy mở được, login được, màn chính không crash | QA |
| Functional Test | Kiểm tra từng chức năng theo AC/BR | QA |
| Integration Test | Kiểm tra dữ liệu đi qua các module đúng trạng thái | QA + Dev |
| E2E Test | Kiểm thử luồng hoàn chỉnh từ import đến export | QA |
| API Sanity | Kiểm tra API chính trả status/schema đúng | QA + Dev |
| UI Sanity | Kiểm tra màn hình chính, navigation, form, action | QA |
| Regression Test | Chạy lại checklist sau fix bug hoặc release candidate | QA |
| UAT Support | Chuẩn bị kịch bản nghiệm thu cho mentor/stakeholder | QA + BA |

---

## 6. Test environment

| Hạng mục | Yêu cầu |
|---|---|
| Environment | Staging hoặc dev ổn định cho QA |
| Browser | Chrome latest, Edge latest |
| Test accounts | Admin, Annotator, QA |
| Test data | PDF Bundle hợp lệ, PDF thiếu file role, PDF corrupt/invalid, source content parsed/unparsed |
| LLM config | 1 provider cố định cho MVP hoặc mock provider có schema tương đương |
| Export viewer | Tool mở CSV UTF-8, kiểm tra delimiter/quote/newline |

---

## 7. Entry criteria

- BA scope PDF-native đã được xác nhận.
- Staging/dev environment deploy được.
- Có test account cho 3 role.
- Có ít nhất 1 PDF Bundle hợp lệ và 1 bộ invalid data.
- Có expected parse result tối thiểu cho metadata, normalized answer text và source list.
- API chính hoặc mock API đã sẵn sàng cho import/pipeline/review/export.
- Dev cung cấp release note ngắn cho build cần test.

---

## 8. Exit criteria

- 100% test scenario Critical/High đã executed.
- Không còn bug Critical/Open.
- Bug High còn mở phải có workaround hoặc được PO/BA chấp nhận.
- E2E happy path pass ít nhất 1 lần trên staging.
- PDF parsing/normalization pass tối thiểu với dữ liệu thật dùng cho UAT.
- Export CSV pass required columns, approved-only filter, UTF-8 và trace PDF.
- Sanity API/UI pass trước UAT.

---

## 9. Roles and responsibility

| Vai trò | Trách nhiệm |
|---|---|
| QA Lead | Quản lý test plan, test coverage, exit criteria |
| QA Tester | Execute test case, log bug, verify fix |
| BA/Data | Giải thích AC/BR, xác nhận expected result, schema PDF-native và export fields |
| Dev | Fix bug, hỗ trợ log/API/debug |
| DevOps | Đảm bảo environment, config, deployment, log |
| PO/Mentor | Chốt scope, chấp nhận residual risk |

---

## 10. Priority and severity

### Priority

| Priority | Ý nghĩa |
|---|---|
| P0 | Block UAT/release, phải xử lý ngay |
| P1 | Ảnh hưởng luồng chính, cần xử lý trong sprint |
| P2 | Ảnh hưởng chức năng phụ hoặc có workaround |
| P3 | Minor/cosmetic, xử lý khi có thời gian |

### Severity

| Severity | Ý nghĩa |
|---|---|
| Critical | Mất dữ liệu, crash hệ thống, sai quyền, không chạy được E2E |
| High | Sai nghiệp vụ chính, sai validation, sai export |
| Medium | Lỗi một phần workflow, UI/API bất tiện nhưng có workaround |
| Low | Lỗi hiển thị nhỏ, typo, polish |

---

## 11. Key risks

| Risk | Impact | Mitigation |
|---|---|---|
| Tài liệu cũ còn ghi CSV/JSON import | Test sai scope | Lấy `00_Scope_Assignment_MVP.md` và PDF-native docs của Đan làm baseline |
| LLM provider/schema response chưa rõ khi test | Block pre-scoring test | Dùng mock provider/schema contract để test trước |
| PDF scan/image chưa có OCR | Parse fail | Test reject/flag `ocr_required` theo quyết định MVP |
| Source URL optional | Source verification dễ hiểu nhầm | Test theo `source_text_extract` là chính |
| Naming `NH` vs `HR` đã chốt dùng `HR` | Sai schema export/API nếu tài liệu cũ còn `NH` | Test theo schema PDF-native và rubric `SF/SC/HR/SQ/REL/COMP` |
| Export quyền Admin/QA còn lệch tài liệu | Sai RBAC | Chốt với BA/PO trước UAT |

---

## 12. Deliverables

- Test Plan MVP.
- E2E Test Scenarios.
- Main Flow E2E Test Cases.
- PDF Parsing & Normalization Test Cases.
- Validation Test Cases map với Validation Rules.
- Bug Log Template.
- Functional Test Checklist.
- API/UI Sanity Test Checklist.
- Test Execution Report khi chạy test.
- UAT Checklist/Sign-off note nếu được yêu cầu ở tuần 4.

---

## 13. Ticket alignment

| Ticket | Nội dung test plan liên quan | Artifact chính |
|---|---|---|
| Test Plan - PDF-native MVP | Test strategy, scope, entry/exit criteria, risk | `01_Test_Plan_PDF_Native_MVP.md` |
| Test Cases - E2E Workflow PDF | Happy path, QA Return/Resubmit, Export CSV | `03_E2E_Test_Scenarios.md` |
| Validation Test Cases | Upload validation, parse fail, source issue, score, QA return comment | `05_Functional_Test_Checklist.md`, `02_AC_to_Test_Cases_Mapping.md` |
| PDF Parsing & Normalization Test Cases | Raw text, normalized text, metadata, source list, traceability | `05_Functional_Test_Checklist.md`, `03_E2E_Test_Scenarios.md` |
| Regression Checklist | Re-run luồng chính sau bug fix | `05_Functional_Test_Checklist.md` |
| UAT Checklist | Mentor/stakeholder review theo scope MVP | UAT checklist/sign-off note |
| Functional Test Execution | Chạy test, ghi bug, báo cáo kết quả | `07_Test_Execution_Report_Template.md`, `04_Bug_Log_Template.md` |
| API/UI Sanity Test | Build/staging sanity, route/API/action chính | `06_API_UI_Sanity_Checklist.md` |
| Workflow Export Verification | CSV approved-only, UTF-8, quoting, PDF trace | `03_E2E_Test_Scenarios.md`, `05_Functional_Test_Checklist.md` |
| Bug Log Triage | Phân loại bug blocking/defer trước demo | `04_Bug_Log_Template.md` |
