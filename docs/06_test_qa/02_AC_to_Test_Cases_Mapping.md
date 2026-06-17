# Requirement Traceability Matrix — VSF AI Annotation Platform MVP

**Owner:** QA Team  
**Phiên bản:** v1.1
**Ngày:** 09/06/2026
**Scope baseline:** `docs/03_ba/00_Scope_Assignment_MVP.md`

---

## 1. Mục đích

Ma trận này dùng để chứng minh mỗi yêu cầu MVP quan trọng đều có coverage trong bộ test scenario, functional checklist và API/UI sanity checklist.

Nếu chỉ cần làm task “Mapping Acceptance Criteria -> Test Cases”, đọc nhanh phần **2. Mapping dễ đọc cho tester** trước. Các phần sau là traceability chi tiết để reviewer/mentor kiểm tra coverage.

Baseline áp dụng:

- MVP input chính: PDF Bundle Upload.
- MVP output chính: CSV claim-level.
- QA chỉ có Approve / Return.
- Không build Dispute, Skip, Save Draft button riêng, QA direct correction.

---

## 2. Mapping dễ đọc cho tester

Bảng này trả lời câu hỏi: “Đọc AC xong thì tester cần viết/test case gì?”.

| Nhóm AC | Tester cần test gì | Test case/checklist tương ứng | Kết quả mong đợi |
|---|---|---|---|
| Authentication | Login/logout/session, direct URL protection, role landing/menu | FT-AUTH-001..012, E2E-AUTH-001..006, REG-AUTH-001 | Auth đúng role, login sai bị block, session/direct URL an toàn |
| Main workflow integration | Kiểm data/state handoff từ Auth -> Project -> Import -> Parse -> Normalize -> Claim -> LLM -> Annotation -> QA -> Export | INT-001..018 | Module tích hợp đúng, state/data không bị đứt giữa các bước |
| Project setup | Tạo project Vivipedia text-only, nhập LLM config, gán Annotator/QA | FT-PRJ-001..009, E2E-001 | Project tạo được, modality là Text, LLM config hợp lệ, assignment đủ người |
| PDF bundle import | Upload Answer PDF, Source Reference PDF, Source Content PDF; gán file role | FT-IMP-001..009, E2E-IMP-001..005 | Bundle hợp lệ được import; thiếu/trùng/sai role bị block |
| PDF parsing preview | Xem metadata, source list, warning source URL missing | FT-IMP-010..013, E2E-003, E2E-IMP-006..007 | Preview hiển thị đúng; warning không block; parse fail bị block |
| Internal normalization | Kiểm tra raw text, normalized text, metadata, source list, parent task trace | FT-PIP-001..003, FT-PIP-011..012, E2E-IMP-011 | Dữ liệu parse/normalized được lưu và trace về bundle/PDF |
| Claim extraction/source mapping | Sinh claim task, giữ thứ tự claim, map citation marker với source order | FT-PIP-004..007, E2E-IMP-008 | Claim được tạo đúng; claim không map source vào Source Mapping Required |
| LLM pre-scoring | LLM success/fail, đủ 6 score, baseline read-only | FT-PIP-008..010, E2E-IMP-009..010 | Success tạo pre-score; fail vào Pre-scoring Failed; baseline không sửa được |
| Annotation workspace | Annotator xem context/source/pre-score, sửa claim, nhập score, note, submit | FT-ANN-001..014, E2E-ANN-001..008 | Submit hợp lệ chuyển Submitted; lỗi score/note/reason bị block |
| QA workflow | QA xem queue, diff, approve, return, không sửa trực tiếp score/claim | FT-QA-001..010, E2E-QA-001..007 | Approve -> Approved; Return yêu cầu error/comment và trả task về annotator |
| Export CSV | Export approved-only, required columns, UTF-8, quoting, PDF trace | FT-EXP-001..010, E2E-EXP-001..006 | CSV chỉ có Approved claims, đúng schema, trace được PDF gốc |
| RBAC/Audit | Kiểm tra quyền Admin/Annotator/QA và log các action chính | FT-AUTH-001..006, FT-AUD-001..007, E2E-RBAC-001..003, E2E-AUD-001 | Role bị giới hạn đúng; audit có import/edit/submit/approve/return/export |
| Staging/storage/config sanity | Kiểm tra staging, migration, file metadata/storage, không lộ secret | FT-ENV-001..008, FT-STO-001..005, API-001, API-022..025 | Build test được, PDF metadata đúng, lỗi config không lộ secret |
| Logging/debuggability | Kiểm tra log cho upload, parse, scoring, export | FT-LOG-001..005, API-024, UI-026 | Dev/Test tra được lỗi theo bundle/task/export ID, không lộ secret |

---

## 3. Traceability matrix

| Requirement ID | Requirement | Source BA | Test Coverage | Priority | Status |
|---|---|---|---|---|---|
| REQ-AUTH-001 | User login theo tài khoản nội bộ | IA/Auth | FT-AUTH-001..004, FT-AUTH-007..012, E2E-AUTH-001..006, API-002..003, UI-001..002, REG-AUTH-001 | P0 | Covered |
| REQ-RBAC-001 | Admin truy cập Project/Import/User/Audit/Export | IA/RBAC | FT-AUTH-001, FT-AUTH-005, E2E-RBAC-001, API-N-002 | P0 | Covered |
| REQ-RBAC-002 | Annotator chỉ thấy task được giao | IA/My Tasks, US-04 | FT-ANN-001, E2E-ANN-001, API-013 | P0 | Covered |
| REQ-RBAC-003 | QA chỉ review task trong scope được giao | IA/QA Queue, US-08 | FT-QA-001, E2E-QA-001, API-016 | P0 | Covered |
| REQ-INT-001 | Main workflow integration từ import PDF đến export CSV | Scope MVP, Workflow baseline | INT-001..018, E2E-001..003, REG-SMOKE-001..005 | P0 | Covered |
| REQ-PRJ-001 | Admin tạo project text Vivipedia | Screen Spec 2.1 | FT-PRJ-001..004, API-005, UI-006..007 | P0 | Covered |
| REQ-LLM-001 | Admin cấu hình LLM endpoint/key/prompt | Screen Spec 2.1, BR-1 | FT-PRJ-005..008, API-006 | P0 | Covered |
| REQ-ASSIGN-001 | Admin gán Annotator và QA | Screen Spec 2.3 | FT-PRJ-009, E2E-001 | P0 | Covered |
| REQ-IMP-001 | Upload PDF Bundle gồm answer/ref/source content | DRD-001, VR-UP | FT-IMP-001..009, E2E-IMP-001..005, API-007..010, UI-008..010 | P0 | Covered |
| REQ-IMP-002 | Validate missing/duplicate/corrupt/invalid PDF | Validation Rules | FT-IMP-002..009, E2E-IMP-002..005, API-N-009..010 | P0 | Covered |
| REQ-PARSE-001 | Parse Answer PDF thành raw và normalized text | DRD-003, VR-PARSE | FT-PIP-001..002, E2E-IMP-007 | P0 | Covered |
| REQ-SRC-001 | Extract source order/title/tier, URL optional | DRD-006, VR-SRC | FT-IMP-010..012, FT-PIP-003, E2E-IMP-006 | P1 | Covered |
| REQ-STO-001 | PDF file metadata/storage trace theo bundle/file role | Scope DevOps, Import Schema | FT-STO-001..005, API-022, API-N-012, E2E-EXP-002 | P0 | Covered |
| REQ-CLAIM-001 | Claim extraction tạo Claim Task | Screen Flow, VR-CE | FT-PIP-004..005, E2E-IMP-001 | P0 | Covered |
| REQ-MAP-001 | Citation/source mapping và Source Mapping Required | VR-MAP | FT-PIP-006..007, E2E-IMP-008 | P1 | Covered |
| REQ-LLM-002 | LLM pre-score đủ 6 dimension | VR-LLM | FT-PIP-008..010, E2E-IMP-009..010, API-012 | P0 | Covered |
| REQ-ANN-001 | Workspace hiển thị context/claim/source/pre-score | Screen Spec 3 | FT-ANN-002..005, UI-012 | P0 | Covered |
| REQ-ANN-002 | Annotator sửa claim text, giữ original/final | Screen Spec 3.3, VR-CE-005 | FT-ANN-006, E2E-ANN-006 | P1 | Covered |
| REQ-ANN-003 | Score validate 0.00-1.00, tối đa 2 decimals | BR-7, VR-ANN | FT-ANN-007, E2E-ANN-003, API-N-004..005, UI-013 | P0 | Covered |
| REQ-ANN-004 | Composite score tính trung bình 6 dimension | BR-7.2 | FT-ANN-008, E2E-ANN-002 | P0 | Covered |
| REQ-ANN-005 | Delta >= 0.20 bắt buộc justification | BR-7.3 | FT-ANN-009, E2E-ANN-004 | P0 | Covered |
| REQ-ANN-006 | Source issue bắt buộc note | VR-ANN-004 | FT-ANN-010, E2E-ANN-005 | P0 | Covered |
| REQ-ANN-007 | Auto-save 30s hoặc blur event | Screen Flow, BR-6.1 | FT-ANN-013, E2E-ANN-007, API-014, UI-014 | P1 | Covered |
| REQ-ANN-008 | Submit valid chuyển task sang Submitted | Screen Flow | FT-ANN-011..012, E2E-ANN-002, API-015, UI-015 | P0 | Covered |
| REQ-QA-001 | QA Queue hiển thị task Submitted | Screen Spec 4 | FT-QA-001, E2E-QA-001, API-016, UI-017 | P0 | Covered |
| REQ-QA-002 | QA diff view baseline vs annotator output | Screen Spec 4.3 | FT-QA-002..004, E2E-QA-002, UI-018 | P1 | Covered |
| REQ-QA-003 | QA Approve chuyển task sang Approved | BR-8 | FT-QA-005, E2E-QA-003, API-017, UI-019 | P0 | Covered |
| REQ-QA-004 | QA Return bắt buộc error type/comment | BR-8.2 | FT-QA-006..008, E2E-QA-004..005, API-018, API-N-007, UI-020 | P0 | Covered |
| REQ-QA-005 | QA không sửa score/claim trực tiếp | DEC-010, BR-8.1 | FT-QA-009, E2E-QA-006 | P1 | Covered |
| REQ-EXP-001 | Export chỉ Approved claims | DRD-004, VR-EXP | FT-EXP-001..004, E2E-EXP-001, API-019 | P0 | Covered |
| REQ-EXP-002 | CSV có required columns và PDF trace | Import/Export Schema §10 | FT-EXP-005..006, E2E-EXP-002 | P0 | Covered |
| REQ-EXP-003 | CSV UTF-8 và quoting đúng | VR-EXP-006, BR-9.2 | FT-EXP-007..008, E2E-EXP-003, API-020 | P0 | Covered |
| REQ-EXP-004 | Multiple sources join bằng delimiter thống nhất | Edge Cases EC-EXP-003 | FT-EXP-009, E2E-EXP-004 | P1 | Covered |
| REQ-AUD-001 | Audit log core actions | Scope, BR-10 | FT-AUD-001..007, E2E-AUD-001, API-021 | P1 | Covered |
| REQ-LOG-001 | Log/debug cho upload, parse, scoring, export | Scope DevOps, Test Plan | FT-LOG-001..005, API-024, UI-026 | P1 | Covered |
| REQ-ENV-001 | Staging/deploy/migration/config sanity cho UAT | Scope DevOps, Test Plan | FT-ENV-001..008, API-001, API-023, API-025, API-N-011 | P1 | Covered |
| REQ-ERR-001 | Empty/loading/error state tối thiểu | Screen Spec 6 | UI-024..025 | P2 | Covered |

---

## 4. Known open items affecting test finalization

| Open item | Impact | Suggested QA action |
|---|---|---|
| `NH` vs `HR` naming đã chốt dùng `HR` | API/export assertion có thể sai field nếu còn theo tài liệu cũ | Update checklist/assertion theo `SF/SC/HR/SQ/REL/COMP` |
| Export role Admin-only hay Admin + QA | RBAC expected result có thể đổi | Confirm với BA/PO trước UAT |
| OCR scope cho PDF scan/image | Expected behavior reject hay flag khác nhau | Giữ test case ở dạng configurable cho đến khi chốt |
| Exact LLM output schema/mock contract chưa chốt | Pre-scoring assertion có thể đổi | Dùng mock provider/schema contract để unblock QA |
| Source content PDF 1-file-per-source hay gộp | Source mapping expected result có thể đổi | Thêm test data cho cả hai nếu dev hỗ trợ |

---

## 5. Acceptance Criteria to Test Cases Mapping

Mapping này dùng cho đầu việc của QA: đảm bảo mỗi AC/BR chính đều có test case hoặc checklist tương ứng.

| AC/BR ID | Nội dung kiểm chứng | Test coverage | Status |
|---|---|---|---|
| AC-1.1 | Admin tạo project mới, modality cố định `text` | FT-PRJ-001..004, E2E-001 | Covered |
| AC-1.2 | Admin cấu hình LLM endpoint/key/model/prompt | FT-PRJ-005..008, E2E-001 | Covered |
| AC-1.3 | Admin gán Annotator và QA | FT-PRJ-009, E2E-001 | Covered |
| AC-1.4 | Danh sách project hiển thị thông tin/trạng thái cấu hình | FT-PRJ-001..009, UI sanity | Covered |
| BR-1.1 | Modality MVP khóa `text`, audio/image không selectable | FT-PRJ-003 | Covered |
| BR-1.2 | API key được mask, không hiển thị plaintext | FT-PRJ-006, API-006, API/UI sanity | Covered |
| BR-1.3 | Prompt template validate biến bắt buộc nếu backend áp dụng | FT-PRJ-008 | Covered |
| AC-2.1 | Upload nhiều PDF và gán file role trong PDF bundle | FT-IMP-001, FT-IMP-006..009, E2E-IMP-001 | Covered |
| AC-2.2 | Parse preview hiển thị metadata/source list/source mapping/warnings | FT-IMP-010..012, E2E-IMP-001, E2E-IMP-006 | Covered |
| AC-2.3 | Confirm import tạo Batch/PDF Bundle/Parent Task và trạng thái import | FT-IMP-014, E2E-001, E2E-IMP-011 | Covered |
| AC-2.4 | Bundle lỗi validation/parse bị block và báo lỗi rõ | FT-IMP-002..004, FT-IMP-006..009, FT-IMP-013, E2E-IMP-002..007 | Covered |
| BR-2.1 | Bundle bắt buộc đúng file role và số lượng file | FT-IMP-006..009, FT-IMP-015, E2E-IMP-002..005 | Covered |
| BR-2.2 | `answer_text_normalized` không được rỗng sau parse | FT-IMP-013, FT-PIP-001, E2E-IMP-007 | Covered |
| BR-2.3 | Audit log cho import | FT-AUD-001, E2E-AUD-001 | Covered |
| AC-3.1 | Claim extraction từ `answer_text_normalized` | FT-PIP-004, E2E-IMP-001 | Covered |
| AC-3.2 | Mỗi claim thành Claim Task liên kết `parent_task_id` | FT-PIP-004..005, E2E-IMP-011 | Covered |
| AC-3.3 | Annotator sửa claim text | FT-ANN-006, E2E-ANN-006 | Covered |
| BR-3.1 | Claim giữ đúng `claim_order` | FT-PIP-005 | Covered |
| BR-3.2 | Claim không map được source vào `Source Mapping Required` | FT-PIP-006..007, E2E-IMP-008 | Covered |
| PDF-storage | PDF metadata/file role/source file refs trace đúng qua workflow/export | FT-STO-001..003, FT-PIP-011, E2E-IMP-011, E2E-EXP-002 | Covered |
| AC-4.1 | Workspace hiển thị source order/title/tier/text/file ref/url nếu có | FT-ANN-004, E2E-ANN-002 | Covered |
| AC-4.2 | Annotator chọn source status hợp lệ | FT-ANN-010, E2E-ANN-002 | Covered |
| AC-4.3 | Source issue yêu cầu ghi chú | FT-ANN-010, E2E-ANN-005 | Covered |
| BR-4.1 | Source inaccessible/unparsed/ocr_required ảnh hưởng SC/note | FT-ANN-010, E2E-ANN-005 | Covered |
| AC-5.1 | LLM pre-scoring gọi provider đã cấu hình | FT-PIP-008..010, E2E-IMP-009..010 | Covered |
| AC-5.2 | Pre-score hiển thị như AI Draft | FT-ANN-005, E2E-ANN-002 | Covered |
| AC-5.3 | LLM fail chuyển `Pre-scoring Failed` | FT-PIP-009, E2E-IMP-010 | Covered |
| BR-5.1 | LLM baseline immutable/read-only | FT-PIP-010, E2E-QA-002 | Covered |
| AC-6.1 | Workspace hiển thị answer context, claim, source | FT-ANN-002..004, E2E-ANN-002 | Covered |
| AC-6.2 | Composite score tính realtime/trung bình | FT-ANN-008, E2E-ANN-002 | Covered |
| AC-6.3 | Submit valid chuyển task đúng flow | FT-ANN-011..012, E2E-ANN-002 | Covered |
| BR-6.1 | Auto-save 30s hoặc blur | FT-ANN-013, E2E-ANN-007 | Covered |
| BR-6.2 | Submit validation đủ source/status/score/claim/reason | FT-ANN-007, FT-ANN-009..012, E2E-ANN-003..005 | Covered |
| AC-7.1 | 6 dimension dùng `SF/SC/HR/SQ/REL/COMP` | FT-ANN-007..008, E2E-ANN-002 | Covered |
| AC-7.2 | Score trong 0.00-1.00 | FT-ANN-007, E2E-ANN-003 | Covered |
| AC-7.3 | Composite score round 2 decimals | FT-ANN-008 | Covered |
| BR-7.1 | Regex score tối đa 2 decimals | FT-ANN-007, E2E-ANN-003 | Covered |
| BR-7.2 | Composite formula dùng 6 dimension | FT-ANN-008 | Covered |
| BR-7.3 | Delta >= 0.20 yêu cầu justification >= 15 ký tự | FT-ANN-009, E2E-ANN-004 | Covered |
| AC-8.1 | QA Review diff baseline vs annotator score | FT-QA-002..004, E2E-QA-002 | Covered |
| AC-8.2 | QA Approve chuyển task Approved | FT-QA-005, E2E-QA-003 | Covered |
| AC-8.3 | QA Return yêu cầu error/comment và trả về annotator | FT-QA-006..008, E2E-QA-004..005, E2E-002 | Covered |
| BR-8.1 | QA không sửa trực tiếp score/claim | FT-QA-009, E2E-QA-006 | Covered |
| BR-8.2 | Return bắt buộc error type/comment tối thiểu | FT-QA-006..007, E2E-QA-004..005 | Covered |
| BR-8.3 | Task history cho approve/return | FT-QA-004..008, E2E-002 | Covered |
| AC-9.1 | Export chỉ user có quyền | FT-EXP-001, E2E-RBAC-001..003 | Covered |
| AC-9.2 | File export `.csv` đúng naming nếu implemented | FT-EXP-003, E2E-EXP-002, Workflow Export Verification ticket | Covered |
| AC-9.3 | CSV claim-level cho task Approved | FT-EXP-004..006, E2E-EXP-001..002 | Covered |
| BR-9.1 | Export lọc `Approved` only | FT-EXP-004, E2E-EXP-001 | Covered |
| BR-9.2 | CSV UTF-8/quoting/escape đúng | FT-EXP-007..008, E2E-EXP-003 | Covered |
| BR-9.3 | Audit log cho export | FT-EXP-010, FT-AUD-006, E2E-EXP-006 | Covered |
| AC-10.1 | Audit log cho action nghiệp vụ chính | FT-AUD-001..006, E2E-AUD-001 | Covered |
| AC-10.2 | Chỉ Admin xem Audit Log | FT-AUTH-005, FT-AUD-007, E2E-RBAC-001..003 | Covered |
| BR-10.1 | Audit log insert-only/không sửa xóa nếu API expose | API-021, FT-AUD-007, API/UI Sanity Test ticket | Partial |
| BR-10.2 | Audit log đủ actor/action/object/time | FT-AUD-001..006, E2E-AUD-001 | Covered |

---

## 6. Backend risk-to-test mapping addendum

| Backend risk / rule | Why it matters | Added coverage | Expected evidence |
|---|---|---|---|
| Auth refresh must revalidate DB state | Disabled user or changed role can keep access if token is trusted blindly | E2E-BE-AUTH-001, FT-BE-AUTH-001, API-BE-001, REG-BE-AUTH-001 | 401/403 after disable/role change; no new token |
| User/admin APIs must hide secrets | Password hash/API key/JWT leak is a security P0 | FT-BE-USR-001..002, API-BE-003..004 | API response snapshots without secret fields |
| Project-scoped RBAC | Global role check alone can leak another project's task/export | E2E-BE-RBAC-001..002, FT-BE-RBAC-001..002, API-BE-005, REG-BE-RBAC-001 | 403/404 and unchanged target data |
| LLM API key encrypt/mask | BR-1.2 requires secret protection at rest and in response/log | FT-BE-PRJ-001, API-BE-006, INT-BE-009 | Masked read response; no plaintext in DB/log evidence |
| PDF validation cannot trust extension | Spoofed upload can break parser or bypass file policy | E2E-BE-IMP-003, FT-BE-IMP-001, API-BE-007, REG-BE-IMP-001 | Rejected upload and no parser job |
| Storage path traversal | File APIs are high-risk for reading/writing outside storage root | E2E-BE-IMP-004, FT-BE-IMP-003, API-BE-008 | 400/403 and no file leak |
| Import confirm idempotency/rollback | Double click or mid-request failure can create duplicate/orphan workflow records | E2E-BE-IMP-001..002, FT-BE-IMP-004..006, API-BE-009..010, INT-BE-002 | Single bundle/job or safe failure; DB/storage checks |
| Worker retry safety | ARQ retries can duplicate claims/pre-scores if steps are not idempotent | E2E-BE-PIP-001, FT-BE-PIP-001..002, INT-BE-003 | Unique child records and correct status counts |
| LLM schema drift | Provider may return wrong shape/types/ranges | E2E-BE-PIP-003, FT-BE-LLM-001..002, API-BE-012, REG-BE-LLM-001 | No invalid baseline; `Pre-scoring Failed` with safe error code |
| Pre-score immutability | Baseline must stay auditably read-only | FT-BE-LLM-003, E2E-BE-PIP-003 | Update/delete blocked or ignored; baseline unchanged |
| Annotation stale write/double submit | Autosave and concurrent tabs can overwrite final work | E2E-BE-ANN-001..003, FT-BE-ANN-001..005, API-BE-013..014 | 409/idempotent behavior; one history/audit entry |
| QA terminal race | Approve and Return must be atomic | E2E-BE-QA-001, FT-BE-QA-001..003, API-BE-015, INT-BE-007 | One final state and one terminal audit/history row |
| Export approved-only and snapshot consistency | CSV is deliverable; wrong rows or row_count breaks trust | E2E-BE-EXP-001..002, FT-BE-EXP-001..004, API-BE-016..018, INT-BE-008 | CSV rows match metadata and status filter |
| CSV injection | Spreadsheet formula execution risk in exported text | E2E-BE-EXP-001, FT-BE-EXP-002, API-BE-017 | Formula-like cells neutralized by agreed rule |
| Audit insert-only | BR-10.1 says audit should not be mutable | E2E-BE-AUD-001, FT-BE-AUD-001..002, API-BE-019, INT-BE-010 | Update/delete denied; row unchanged |
| Safe error envelope and log correlation | Debuggability without secret leakage | E2E-BE-LOG-001, FT-BE-LOG-001..002, API-BE-020, INT-BE-001 | Response has request_id/error_code; logs correlate safely |
