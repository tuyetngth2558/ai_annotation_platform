# Test Plan MVP — VSF AI Annotation Platform

**Owner:** QA Team  
**Phiên bản:** v1.0  
**Ngày:** 06/06/2026  
**Phạm vi:** MVP PDF-native cho Vivipedia text annotation

---

## 1. Mục tiêu kiểm thử

Đảm bảo MVP chạy ổn định end-to-end theo luồng:

```text
PDF Bundle Upload
-> PDF Parsing / Normalization
-> Claim Extraction
-> Source Mapping
-> LLM Pre-scoring
-> Annotator Review
-> QA Review
-> Export CSV
```

Mục tiêu nghiệm thu chính:

- Admin tạo project, cấu hình LLM và import PDF Bundle hợp lệ.
- Hệ thống parse PDF, tạo Parent Task, Claim Task, source mapping và pre-score.
- Annotator chỉ thấy task được giao, review claim/source, nhập điểm và submit.
- QA review task `Submitted`, chỉ được `Approve` hoặc `Return`.
- Export chỉ xuất claim `Approved` ra CSV claim-level, trace được về PDF gốc.
- Audit log ghi nhận các action nghiệp vụ chính.

---

## 2. Tài liệu đầu vào

| Tài liệu | Mục đích sử dụng |
|---|---|
| `docs/03_ba/tuyet/01_Information_Architecture.md` | Scope màn hình, role, module |
| `docs/03_ba/tuyet/02_Screen_Flow.md` | Luồng điều hướng và trạng thái |
| `docs/03_ba/tuyet/03_Screen_Specification.md` | Field, action, validation UI |
| `docs/03_ba/tuyet/04_Open_Questions_Assumptions_Dependencies.md` | Quyết định đã chốt và câu hỏi mở |
| `docs/03_ba/dan/02_Import_Export_Schema.md` | Schema import PDF Bundle và export CSV |
| `docs/03_ba/dan/03_Validation_Rules.md` | Validation rules |
| `docs/03_ba/dan/04_Edge_Cases.md` | Edge cases ưu tiên test |
| `docs/03_ba/quang/VSF_AI_Annotation_Platform_AC_and_Business_Rules.md` | AC/BR nghiệp vụ, cần đối chiếu với PDF-native update |

---

## 3. Phạm vi kiểm thử

### 3.1. In scope

| Module | Nội dung kiểm thử |
|---|---|
| Auth / RBAC | Login, role-based navigation, quyền Admin/Annotator/QA |
| Project Setup | Tạo project, validate field, cấu hình LLM, assignment |
| PDF Bundle Import | Upload PDF, gán file role, validate, preview parse, confirm import |
| Background Pipeline | Parse, normalize, create task, claim extraction, source mapping, pre-scoring |
| Annotation Workspace | Claim edit, source status, score validation, justification, auto-save, submit/resubmit |
| QA Review | Queue, diff score, history, approve, return |
| Export | Export CSV approved-only, encoding/quoting, required columns |
| Audit Log | Log import, claim edit, submit, approve, return, export |
| Error/Empty/Loading states | Các trạng thái tối thiểu theo screen spec |

### 3.2. Out of scope

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

## 4. Test strategy

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

## 5. Test environment

| Hạng mục | Yêu cầu |
|---|---|
| Environment | Staging hoặc dev ổn định cho QA |
| Browser | Chrome latest, Edge latest |
| Test accounts | Admin, Annotator, QA |
| Test data | PDF Bundle hợp lệ, PDF thiếu file role, PDF corrupt/invalid, source content parsed/unparsed |
| LLM config | 1 provider cố định cho MVP hoặc mock provider có schema tương đương |
| Export viewer | Tool mở CSV UTF-8, kiểm tra delimiter/quote/newline |

---

## 6. Entry criteria

- BA scope PDF-native đã được xác nhận.
- Staging/dev environment deploy được.
- Có test account cho 3 role.
- Có ít nhất 1 PDF Bundle hợp lệ và 1 bộ invalid data.
- API chính hoặc mock API đã sẵn sàng cho import/pipeline/review/export.
- Dev cung cấp release note ngắn cho build cần test.

---

## 7. Exit criteria

- 100% test scenario Critical/High đã executed.
- Không còn bug Critical/Open.
- Bug High còn mở phải có workaround hoặc được PO/BA chấp nhận.
- E2E happy path pass ít nhất 1 lần trên staging.
- Export CSV pass required columns, approved-only filter, UTF-8 và trace PDF.
- Sanity API/UI pass trước UAT.

---

## 8. Roles and responsibility

| Vai trò | Trách nhiệm |
|---|---|
| QA Lead | Quản lý test plan, test coverage, exit criteria |
| QA Tester | Execute test case, log bug, verify fix |
| BA | Giải thích AC/BR, xác nhận expected result |
| Dev | Fix bug, hỗ trợ log/API/debug |
| DevOps | Đảm bảo environment, config, deployment, log |
| PO/Mentor | Chốt scope, chấp nhận residual risk |

---

## 9. Priority and severity

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

## 10. Key risks

| Risk | Impact | Mitigation |
|---|---|---|
| Tài liệu cũ còn ghi CSV/JSON import | Test sai scope | Lấy PDF-native v0.4/v2.0 làm baseline |
| LLM provider chưa chốt | Block pre-scoring test | Dùng mock provider/schema contract để test trước |
| PDF scan/image chưa có OCR | Parse fail | Test reject/flag `ocr_required` theo quyết định MVP |
| Source URL optional | Source verification dễ hiểu nhầm | Test theo `source_text_extract` là chính |
| Naming `NH` vs `HR` chưa thống nhất | Sai schema export/API | Raise open issue, test theo schema đã chốt cuối |
| Export quyền Admin/QA còn lệch tài liệu | Sai RBAC | Chốt với BA/PO trước UAT |

---

## 11. Deliverables

- Test Plan MVP.
- E2E Test Scenarios.
- Bug Log Template.
- Functional Test Checklist.
- API/UI Sanity Test Checklist.
- Test Execution Report khi chạy test.
- UAT Checklist/Sign-off note nếu được yêu cầu ở tuần 4.
