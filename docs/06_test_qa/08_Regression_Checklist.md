# Regression Checklist — VSF AI Annotation Platform MVP

**Owner:** QA Team  
**Phiên bản:** v1.0  
**Ngày:** 12/06/2026  
**Scope baseline:** `docs/03_ba/00_Scope_Assignment_MVP.md`

---

## 1. Mục tiêu

Checklist này dùng sau mỗi lần fix bug, deploy staging hoặc chuẩn bị UAT/demo để kiểm tra nhanh các luồng chính không bị regression.

Ưu tiên chạy trên staging với dữ liệu PDF bundle thật hoặc bộ test data đã được BA/Data xác nhận.

---

## 2. Khi nào cần chạy

| Thời điểm | Mức cần chạy |
|---|---|
| Sau mỗi deploy staging | Smoke regression |
| Sau bug fix liên quan auth/import/annotation/QA/export | Module regression |
| Trước UAT nội bộ | Full MVP regression |
| Trước demo mentor/stakeholder | Full MVP regression + export verification |

---

## 3. Smoke regression

| ID | Checklist | Expected result | Status | Notes |
|---|---|---|---|---|
| REG-SMOKE-001 | Health check/API chính phản hồi | Service sống, không lỗi 5xx | Not Run | |
| REG-SMOKE-002 | Login Admin/Annotator/QA | Login được và menu đúng role | Not Run | |
| REG-SMOKE-003 | Mở các màn chính: Project, Import, My Tasks, QA Queue, Export | Không crash/blank page | Not Run | |
| REG-SMOKE-004 | Kiểm tra build/schema version nếu có | Đúng bản build cần test | Not Run | |
| REG-SMOKE-005 | Log/error không lộ secret/API key | Không lộ thông tin nhạy cảm | Not Run | |
| REG-SMOKE-006 | Mở route canonical theo UI map: `/login`, `/admin/projects/new`, `/admin/import`, `/annotator/tasks`, `/qa/queue`, `/admin/export` | Đúng màn, đúng guard theo role, không redirect sai | Not Run | |
| REG-SMOKE-007 | Kiểm tra page-level `data-testid` cho các màn MVP | Mỗi màn có đúng root test ID phục vụ automation | Not Run | |

---

## 4. Module regression

| ID | Module | Checklist | Expected result | Status | Notes |
|---|---|---|---|---|---|
| REG-AUTH-001 | Authentication | Login sai bị block, logout xóa session, direct URL protected bị chặn | Auth/session đúng | Not Run | |
| REG-RBAC-001 | RBAC | Annotator/QA không vào được màn Admin-only | Không lộ dữ liệu/trang trái quyền | Not Run | |
| REG-IMP-001 | PDF Import | Upload valid PDF bundle đủ 3 role | Validate pass, preview parse được | Not Run | |
| REG-IMP-002 | PDF Import | Upload thiếu/trùng/sai role hoặc non-PDF | Validate fail rõ lỗi | Not Run | |
| REG-PARSE-001 | Parsing/Normalization | Parse raw text, normalized text, metadata, source list | Dữ liệu lưu và trace về bundle | Not Run | |
| REG-PARSE-002 | Parsing/Normalization | Parse warning source URL missing | Warning không block import | Not Run | |
| REG-PIP-001 | Pipeline | Claim extraction, source mapping, LLM pre-score success | Task sẵn sàng cho annotator | Not Run | |
| REG-PIP-002 | Pipeline | LLM fail hoặc output sai schema | Task vào trạng thái lỗi phù hợp | Not Run | |
| REG-ANN-001 | Annotation | Annotator mở task, nhập 6 score, note, submit | Task chuyển `Submitted` | Not Run | |
| REG-ANN-002 | Annotation | Score invalid/delta thiếu justification/source issue thiếu note | Submit bị block | Not Run | |
| REG-QA-001 | QA Review | QA approve task `Submitted` | Task chuyển `Approved` | Not Run | |
| REG-QA-002 | QA Review | QA return với error type/comment, annotator resubmit | Flow return/resubmit đúng | Not Run | |
| REG-EXP-001 | Export | Export CSV approved-only | Chỉ có claim Approved | Not Run | |
| REG-EXP-002 | Export | CSV UTF-8, quoting, required columns, PDF trace | File export đúng schema | Not Run | |
| REG-AUD-001 | Audit/Log | Import/edit/submit/approve/return/export có log | Log đủ actor/action/object/time | Not Run | |
| REG-STO-001 | Storage | PDF file refs mở được theo quyền hợp lệ | Không broken link/không leak file | Not Run | |
| REG-UI-001 | UI Testability | Login labels/placeholders/button/error test IDs đúng spec | Automation login không vỡ do text/selector đổi | Not Run | |
| REG-UI-002 | UI Testability | Import wizard step 3-6, role rows, preview warning, pipeline status có test IDs ổn định | Automation import chạy được bằng selector contract | Not Run | |
| REG-UI-003 | UI Testability | Annotator task row/open button và annotation form fields/tabs/autosave/submit có test IDs ổn định | Automation annotation chạy được bằng selector contract | Not Run | |
| REG-UI-004 | UI Testability | QA queue filters/search, review diff panels, approve/return modal/history tab có test IDs ổn định | Automation QA review chạy được bằng selector contract | Not Run | |
| REG-UI-005 | UI Testability | Export form/button/history/download link có test IDs ổn định và filename `.csv` | Automation export/download chạy được bằng selector contract | Not Run | |
| REG-UI-006 | UI Copy | Button text, placeholder, label, tab text dùng trong E2E không đổi ngoài ý muốn | Playwright role/label fallback vẫn pass | Not Run | |

---

## 5. Full MVP regression run

| Step | Action | Expected result | Status | Notes |
|---|---|---|---|---|
| 1 | Login Admin và tạo/check project Vivipedia text-only | Project hợp lệ | Not Run | |
| 2 | Upload valid PDF bundle | Bundle validate pass | Not Run | |
| 3 | Preview parse và confirm import | Parse/normalize/pipeline start | Not Run | |
| 4 | Kiểm tra claim task được tạo và pre-score có đủ 6 dimension | Task ready | Not Run | |
| 5 | Login Annotator, review claim, submit | Task `Submitted` | Not Run | |
| 6 | Login QA, return task với comment | Task `Returned` | Not Run | |
| 7 | Annotator chỉnh và resubmit | Task `Submitted` lại | Not Run | |
| 8 | QA approve | Task `Approved` | Not Run | |
| 9 | Export CSV | File CSV claim-level đúng và trace được PDF | Not Run | |
| 10 | Kiểm tra audit/log | Có log cho các action chính | Not Run | |
| 11 | Chạy UI Testability smoke cho Login, Import, Annotation, QA Review, Export | Selector/text/route contract đúng spec | Not Run | |

---

## 6. Exit rule

| Điều kiện | Kết luận |
|---|---|
| Có lỗi Critical/P0 | Không pass regression, block UAT/demo |
| Có lỗi High/P1 ở auth/import/annotation/QA/export | Chỉ pass nếu có workaround được BA/PO chấp nhận |
| Chỉ còn lỗi Medium/Low không ảnh hưởng luồng chính | Có thể pass có điều kiện |
| Full MVP regression pass | Build sẵn sàng cho UAT/demo |

---

## 7. Backend regression focus after API/worker/storage changes

| ID | Area | Checklist | Expected result | Status | Notes |
|---|---|---|---|---|---|
| REG-BE-AUTH-001 | Auth | Refresh/current-user revalidates disabled user and role changes | Disabled/downgraded user loses access without token/secret leak | Not Run | |
| REG-BE-USR-001 | Users | Admin create/list/get user, duplicate email, non-admin forbidden | Correct 2xx/4xx/403; no password hash in response | Not Run | |
| REG-BE-RBAC-001 | RBAC | Cross-project task/export/audit access by wrong role/scope | 403/404 and no data/action leak | Not Run | |
| REG-BE-IMP-001 | Import | Non-PDF body with `.pdf`, corrupt PDF, duplicate role, traversal filename | Backend rejects and parser/job not triggered | Not Run | |
| REG-BE-IMP-002 | Import | Confirm valid bundle twice | One batch/bundle/job only, or second request returns safe 409/idempotent result | Not Run | |
| REG-BE-PIP-001 | Worker | Retry parse/claim/pre-score job | No duplicate parent task/claim/pre-score; status counts correct | Not Run | |
| REG-BE-LLM-001 | LLM | Timeout, invalid schema, out-of-range score, missing dimension | `Pre-scoring Failed`; no invalid baseline saved; logs safe | Not Run | |
| REG-BE-ANN-001 | Annotation | Stale draft, double submit, submit on non-ready task | 409 or idempotent safe result; no duplicate history/audit | Not Run | |
| REG-BE-QA-001 | QA | Double approve/return and approve non-submitted task | One terminal action only; invalid state rejected | Not Run | |
| REG-BE-EXP-001 | Export | Approved-only, CSV injection, row_count metadata, unauthorized download | CSV/data correct; unauthorized blocked; no formula injection | Not Run | |
| REG-BE-AUD-001 | Audit | Try update/delete audit row via API/app DB role if testable | Update/delete denied; audit insert-only behavior holds | Not Run | |
| REG-BE-LOG-001 | Logging | Forced parser/LLM/storage errors | Response has request_id/error_code; logs have diagnostics without secrets | Not Run | |

## 8. Backend bug-fix targeted rerun matrix

| Bug area fixed | Minimum rerun |
|---|---|
| Auth/session/RBAC | REG-BE-AUTH-001, REG-BE-RBAC-001, API-N-001..003, E2E-BE-RBAC-001..002 |
| User management | REG-BE-USR-001, FT-BE-USR-001..002 |
| Import/storage/parser | REG-BE-IMP-001..002, REG-BE-PIP-001, E2E-BE-IMP-001..004 |
| Worker/LLM | REG-BE-PIP-001, REG-BE-LLM-001, E2E-BE-PIP-001..003 |
| Annotation state | REG-BE-ANN-001, E2E-BE-ANN-001..003 |
| QA workflow | REG-BE-QA-001, E2E-BE-QA-001..002 |
| Export CSV | REG-BE-EXP-001, E2E-BE-EXP-001..002 |
| Audit/log/error envelope | REG-BE-AUD-001, REG-BE-LOG-001, E2E-BE-AUD-001, E2E-BE-LOG-001 |
