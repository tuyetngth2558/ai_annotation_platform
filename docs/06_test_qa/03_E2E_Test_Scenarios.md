# E2E Test Scenarios — VSF AI Annotation Platform MVP

**Owner:** QA Team  
**Phiên bản:** v1.2
**Ngày:** 10/06/2026
**Scope baseline:** `docs/03_ba/00_Scope_Assignment_MVP.md`

---

## 1. Test data baseline

| Data set | Mục đích |
|---|---|
| Valid PDF Bundle | Happy path import và annotation |
| Bundle thiếu `answer_pdf` | Upload validation |
| Bundle thiếu `source_ref_pdf` | Upload validation |
| Bundle thiếu `source_content_pdf` | Upload validation |
| Invalid/corrupt PDF | File validation |
| PDF parse warning: source URL missing | Non-blocking warning |
| Source content unparsed/ocr_required | Source note validation |
| LLM mock success | Pre-score success |
| LLM mock timeout/invalid schema | Pre-score failed |

---

## 2. Luồng chính cần cover

| Main flow | Test case đại diện |
|---|---|
| Happy path PDF-native | E2E-001 |
| QA Return và Resubmit | E2E-002 |
| PDF parse warning nhưng vẫn đi hết pipeline | E2E-003 |
| Authentication/login/logout/session | E2E-AUTH-001..006 |
| Import/pipeline negative cases | E2E-IMP-002..011 |
| Annotation validation | E2E-ANN-003..005 |
| QA validation | E2E-QA-004..007 |
| Export CSV claim-level | E2E-EXP-001..006 |
| RBAC và audit smoke | E2E-RBAC-001..003, E2E-AUD-001 |
| UI testability contract theo URL & Element Map | E2E-UI-001..009 |

---

## 3. Authentication scenarios

| ID | Scenario | Preconditions | Steps | Expected result | Priority |
|---|---|---|---|---|---|
| E2E-AUTH-001 | Login success by role | Admin, Annotator, QA accounts exist and are active | 1. Open login page. 2. Login with each valid account. | User logs in successfully; landing page and visible menu match role. | P0 |
| E2E-AUTH-002 | Login failed with invalid credentials | Login page is available | 1. Enter wrong email/password. 2. Submit. | Login is blocked; clear error message shown; no session is created. | P0 |
| E2E-AUTH-003 | Unauthenticated user cannot access protected pages | User is logged out | 1. Open Project Setup/My Tasks/QA Queue/Export URL directly. | User is redirected to Login or receives unauthorized state; protected data is not shown. | P0 |
| E2E-AUTH-004 | Logout clears session | User is logged in | 1. Click Logout. 2. Open a protected page again. | Session is cleared; protected page requires login again. | P0 |
| E2E-AUTH-005 | Role menu and direct URL restriction | Active Admin, Annotator, QA accounts exist | 1. Login as Annotator and QA. 2. Try to open Admin-only screens by URL. 3. Login as Admin and open admin screens. | Annotator/QA are blocked from unauthorized screens; Admin can access allowed admin screens. | P0 |
| E2E-AUTH-006 | Disabled/inactive user cannot login if supported | Inactive user account exists | 1. Login with inactive account. | Login is blocked with clear message; no session is created. | P1 |
| E2E-AUTH-007 | Role landing URLs match UI map | Admin, Annotator, QA accounts exist | 1. Login as Admin. 2. Login as Annotator. 3. Login as QA. | Admin lands on `/admin/dashboard`; Annotator lands on `/annotator/tasks`; QA lands on `/qa/queue`. | P0 |

---

## 4. E2E happy path

| ID | Scenario | Preconditions | Steps | Expected result | Priority |
|---|---|---|---|---|---|
| E2E-001 | Full flow: Import PDF Bundle -> Approve -> Export CSV | Admin, Annotator, QA account; valid PDF Bundle; LLM success | 1. Admin login. 2. Create project. 3. Configure LLM. 4. Upload valid PDF Bundle. 5. Assign file roles. 6. Preview parse. 7. Confirm import. 8. System parses PDF and normalizes internal data. 9. Assign annotator/QA. 10. Annotator opens assigned claim. 11. Reviews source and scores. 12. Submit. 13. QA opens Submitted task. 14. Approve. 15. Admin/authorized user exports CSV. | Project/batch/bundle/parent task created; parse result and normalized data saved; claim task reaches `Approved`; exported CSV contains approved claim with required fields and PDF trace. | P0 |
| E2E-002 | Full flow with QA Return and Resubmit | Valid task already submitted | 1. QA opens Submitted task. 2. Return with error type + comment. 3. Annotator sees Returned task. 4. Annotator edits claim/score/note. 5. Resubmit. 6. QA Approve. 7. Export. | Task goes `Submitted -> Returned -> Submitted -> Approved`; history/audit records return and resubmit; export includes final approved data only. | P0 |
| E2E-003 | Full flow with parse warning: source URL missing | Admin, Annotator, QA account; PDF Bundle has source order/title/tier and source text but no source URL | 1. Admin uploads PDF Bundle. 2. Preview parse shows `SOURCE_URL_MISSING` warning. 3. Admin confirms import. 4. Pipeline uses source text from PDF for mapping/pre-score. 5. Annotator reviews source text, sets source status, fills 6 scores and note if needed. 6. Submit. 7. QA Approve. 8. Export CSV. | Import is allowed with warning; `source_url = null`; claim still reaches Approved; export includes PDF trace and source file refs. | P0 |

---

## 5. Import and pipeline scenarios

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| E2E-IMP-001 | Import valid PDF Bundle | Upload 1 answer PDF, 1 source ref PDF, 1+ source content PDF; assign roles; confirm import | Bundle validation passes; parse preview shows metadata/source list; background pipeline starts. | P0 |
| E2E-IMP-002 | Missing answer PDF | Upload source ref + source content only | Import blocked with missing `answer_pdf` error. | P0 |
| E2E-IMP-003 | Missing source reference PDF | Upload answer + source content only | Import blocked with missing `source_ref_pdf` error. | P0 |
| E2E-IMP-004 | Missing source content PDF | Upload answer + source ref only | Import blocked per VR-UP-003. | P0 |
| E2E-IMP-005 | Duplicate answer/source ref role | Assign 2 files as `answer_pdf` or 2 as `source_ref_pdf` | Import blocked with duplicate role error. | P1 |
| E2E-IMP-006 | Source URL missing in PDF | Use valid source ref with title/order/tier but no URL | Import allowed with warning; `source_url = null`; source text from PDF remains usable. | P1 |
| E2E-IMP-007 | Cannot parse answer text | Upload PDF that parser cannot extract answer text from | Bundle invalid; pipeline does not create ready task. | P0 |
| E2E-IMP-008 | Claim cannot map source | Import answer with citation missing source order | Claim task becomes `Source Mapping Required`; not visible in annotator queue. | P1 |
| E2E-IMP-009 | LLM pre-scoring success | Pipeline calls LLM/mock provider with valid output | Task becomes `Ready for Annotation`; immutable pre-score saved. | P0 |
| E2E-IMP-010 | LLM pre-scoring failed | Provider timeout or invalid output schema | Task becomes `Pre-scoring Failed`; Admin can see error/retry entry if implemented. | P1 |
| E2E-IMP-011 | Internal normalization creates traceable parent task | Import valid PDF Bundle and inspect created data | Raw text, normalized text, metadata, source list, parse status, bundle ID, and PDF filenames are stored and traceable to generated claim tasks. | P0 |
| E2E-IMP-012 | Import wizard step guards | Open `/admin/import`; upload no file or unvalidated role mapping | Step 4 next is disabled until validation passes; step 5 confirm is available only after parse preview loads; step 6 shows pipeline status list. | P0 |
| E2E-IMP-013 | Staged file chips and dynamic role rows | Upload multiple PDF files with names including answer/source refs/source content | Each staged file chip is visible; answer/source-ref rows and every source-content row render with stable dynamic test IDs and correct role badge text. | P1 |

---

## 6. Annotation scenarios

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| E2E-ANN-001 | Annotator sees only assigned tasks | Login as Annotator | My Tasks shows only assigned `Ready/In Annotation/Returned` tasks. | P0 |
| E2E-ANN-002 | Open workspace and submit valid task | Open assigned task; confirm source; keep/enter all 6 scores; submit | Task becomes `Submitted`; removed from My Tasks active queue; appears in QA Queue. | P0 |
| E2E-ANN-003 | Score validation rejects invalid values | Enter -0.01, 1.01, 0.123, text | Field/API rejects invalid score; submit disabled/blocked. | P0 |
| E2E-ANN-004 | Justification required when delta >= 0.20 | Change any score from pre-score by >= 0.20 without reason | Submit blocked until justification note >= 15 trimmed characters. | P0 |
| E2E-ANN-005 | Source issue note required | Mark source `inaccessible`, `unparsed`, or `ocr_required` without note | Submit blocked; note required message shown. | P0 |
| E2E-ANN-006 | Claim edit audit | Edit claim text and save/auto-save | `claim_text_original` preserved; `claim_text_final` saved; audit logs before/after. | P1 |
| E2E-ANN-007 | Auto-save | Modify score/note; wait 30 seconds or blur field | Draft saved asynchronously; UI shows last saved time; data persists after reload. | P1 |
| E2E-ANN-008 | Returned task resubmit | Open Returned task, view QA comment, update data, resubmit | Task returns to QA Queue with history retained. | P0 |
| E2E-ANN-009 | Claim reset restores original text | Open annotation workspace, edit claim text, click reset claim | Claim text returns to original AI/parsed value; draft state updates without losing scores/notes. | P1 |
| E2E-ANN-010 | Rubric/guideline/example tabs | Open annotation workspace and switch all right-panel tabs | Rubric, guideline, and example content panels render without losing unsaved annotation data. | P1 |
| E2E-ANN-011 | Composite score updates from six dimensions | Change each SF/SC/NH/SQ/REL/COMP score | Composite display recalculates consistently and rounds according to product rule. | P0 |

---

## 7. QA review scenarios

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| E2E-QA-001 | QA sees Submitted tasks | Login as QA | QA Queue shows only submitted tasks for assigned project/scope. | P0 |
| E2E-QA-002 | Diff view highlights delta | Open task with annotator score delta >= 0.20 | LLM baseline, annotator output, delta displayed; large delta highlighted. | P1 |
| E2E-QA-003 | Approve task | Click Approve on Submitted task | Task becomes `Approved`; no comment required; audit/history created. | P0 |
| E2E-QA-004 | Return requires error type | Click Return, leave error type empty | Return blocked. | P0 |
| E2E-QA-005 | Return requires comment | Click Return with no/short comment | Return blocked until comment >= 10 characters. | P0 |
| E2E-QA-006 | QA cannot edit score or claim | Try to edit annotator score/claim in QA screen | Fields are read-only or no edit action exists. | P1 |
| E2E-QA-007 | QA cannot review non-submitted task | Open/act on task not in `Submitted` state | API/UI blocks action with invalid status. | P0 |
| E2E-QA-008 | QA queue search and status filters | Open QA Queue with submitted/returned/approved data; use search and each filter | Results update correctly by claim/task/article/annotator text and by Submitted/Returned/Approved state; opening a row navigates to `/qa/review/:claimId`. | P1 |
| E2E-QA-009 | Return modal cancel does not change status | Open return modal, enter error type/comment, click cancel | Modal closes; task remains `Submitted`; no return audit/history record is created. | P0 |
| E2E-QA-010 | Review history tab after resubmit | Complete return and resubmit flow, open QA Review history tab | History tab shows prior submit, QA return comment/error type, resubmit, and actor/time metadata. | P0 |

---

## 8. Export scenarios

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| E2E-EXP-001 | Export approved-only claims | Have approved + returned/submitted tasks; create export | CSV includes only approved claims. | P0 |
| E2E-EXP-002 | Required columns | Export CSV and inspect header | Required columns match approved schema, including `bundle_id` and PDF filenames. | P0 |
| E2E-EXP-003 | UTF-8 and CSV quoting | Export claim with Vietnamese text, comma, quotes, newline | CSV opens correctly; text not corrupted; quoting/escaping correct. | P0 |
| E2E-EXP-004 | Multiple sources delimiter | Export claim mapped to multiple sources | Source orders/titles/file refs joined consistently with `;`. | P1 |
| E2E-EXP-005 | No approved claims | Export project/batch with no approved claim | UI shows no data message or header-only CSV according to implementation decision. | P2 |
| E2E-EXP-006 | Export audit log | Create export job | Audit log contains export action with actor, target, row count, timestamp. | P1 |
| E2E-EXP-007 | Export button disabled until project selected | Open `/admin/export` without selecting project | Export/download button is disabled; status note states only approved claims are exported. | P0 |
| E2E-EXP-008 | Export history download | Create or use existing export history row, click download again | History table shows filename/date/user/claim count; download link retrieves a `.csv` file without creating duplicate export rows. | P1 |

---

## 9. RBAC and audit scenarios

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| E2E-RBAC-001 | Admin access | Login Admin | Can access Project, Import, Users, Audit, Export. | P0 |
| E2E-RBAC-002 | Annotator restricted access | Login Annotator | Cannot access Project Setup, QA action, User Management, Audit. | P0 |
| E2E-RBAC-003 | QA restricted access | Login QA | Can access QA Queue and allowed export if configured; cannot create project/users unless Admin. | P0 |
| E2E-AUD-001 | Audit core actions | Perform import, claim edit, submit, approve, return, export | Audit log records actor, action type, entity, timestamp. | P1 |

---

## 10. UI testability and route scenarios

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| E2E-UI-001 | Canonical route smoke | Navigate directly to `/login`, `/admin/projects/new`, `/admin/import`, `/annotator/tasks`, `/annotator/tasks/CT-001`, `/qa/queue`, `/qa/review/CT-001`, `/admin/export` with allowed roles | Each URL resolves to the expected screen component; protected URLs apply RoleGuard. | P0 |
| E2E-UI-002 | Page-level `data-testid` contract | Open every MVP screen in the UI map | `login-page`, `import-bundle-page`, `annotator-tasks-page`, `annotation-workspace-page`, `qa-queue-page`, `qa-review-page`, and `export-page` are present exactly once per page. | P0 |
| E2E-UI-003 | Login form selector/text contract | Open `/login` | Email/password inputs expose stable test IDs, labels, placeholders, required attributes, fixed login button text, and auth error test ID when login fails. | P0 |
| E2E-UI-004 | Import selector/text contract | Complete import wizard steps 3-6 | All documented step panels, upload/dropzone, role mapping, validate, preview, warning, confirm, pipeline, and next buttons have stable test IDs and fixed text. | P0 |
| E2E-UI-005 | Annotator list selector contract | Open `/annotator/tasks` with claim `CT-001` assigned | Task table, row `annotator-tasks-row-CT-001`, and open button `annotator-tasks-open-CT-001` are available and navigate to the workspace. | P0 |
| E2E-UI-006 | Annotation workspace selector contract | Open `/annotator/tasks/CT-001` | Claim, six score inputs, reason, notes, source status/note, auto-save indicator, submit button, status badge, and tabs expose expected test IDs and labels. | P0 |
| E2E-UI-007 | QA queue/review selector contract | Open queue and review for `CT-001` | Search/filter controls, row/open buttons, review tabs, diff panels, approve/return buttons, and return modal controls expose expected test IDs. | P0 |
| E2E-UI-008 | Export selector/download contract | Open `/admin/export` and export an approved project | Project/batch selects, status note, download button, history table/row/download link expose expected test IDs; browser download filename ends with `.csv`. | P0 |
| E2E-UI-009 | Fixed Vietnamese UI copy for E2E | Open every MVP screen | Button text, placeholders, tab text, and modal labels used by E2E remain stable and match the UI Testability map. | P1 |

---

## 11. Final UAT watchlist

- Export permission: Admin only or Admin + QA được cấp quyền.
- OCR handling for scan/image PDFs: reject or flag `ocr_required`.
- Exact LLM output schema and mock response contract.
- Source content PDF mapping rule: one file per source or bundled source content.

---

## 12. Backend/API deep-dive scenarios

> Nhom case nay uu tien test qua API/DB/log de bat loi backend de sot. Khong yeu cau thay doi UI.

| ID | Scenario | Preconditions | Steps | Expected result | Priority |
|---|---|---|---|---|---|
| E2E-BE-AUTH-001 | Refresh token revalidates inactive user | User has valid refresh token, then is disabled in DB | 1. Login and keep refresh token. 2. Disable user. 3. Call refresh/current-user API. | API returns 401/403; no new access token; audit/log does not leak token. | P0 |
| E2E-BE-AUTH-002 | Change password invalidates old credential path | Active user exists | 1. Login. 2. Change password. 3. Try login with old password. 4. Login with new password. | Old password fails, new password works; response never returns password hash. | P0 |
| E2E-BE-RBAC-001 | Cross-project task access is blocked | Annotator A assigned to Project A only; task exists in Project B | Call task detail/draft/submit APIs for Project B task using Annotator A token. | 403/404 without task data leak; no draft/history created. | P0 |
| E2E-BE-RBAC-002 | QA cannot approve task outside assigned project/scope | QA assigned to Project A only; submitted task exists in Project B | Call QA approve/return API for Project B task. | 403/404; task state unchanged; no audit approve/return. | P0 |
| E2E-BE-IMP-001 | Confirm import is idempotent for same validated bundle | Valid staged bundle exists | Send confirm request twice with same idempotency key or same staging ID. | Only one batch/bundle/parent task is created; second response is same result or 409 safe conflict. | P0 |
| E2E-BE-IMP-002 | Confirm import rollback on storage/DB failure | Backend can simulate storage or DB failure after some files are staged | Confirm import while failure is injected. | No orphan batch/claim task; partial DB writes are rolled back or marked failed with recoverable cleanup state. | P0 |
| E2E-BE-IMP-003 | Filename/content-type spoofing rejected | Test file named `.pdf` but body is not a PDF | Upload spoofed file with `application/pdf`. | Backend validates magic/content enough to reject; parser not triggered. | P0 |
| E2E-BE-IMP-004 | Storage key path traversal rejected | Upload/download request uses filename/key with `../`, encoded traversal, absolute path, or backslash variants | Call upload/download/file metadata API. | 400/403; no file outside configured storage root is read/written. | P0 |
| E2E-BE-PIP-001 | Pipeline retry does not duplicate claims/pre-scores | Valid import; worker job retry is triggered | Run parse/claim/pre-score job twice or retry same job ID. | Claim order and pre-score records remain single per claim/version; retry updates status safely. | P0 |
| E2E-BE-PIP-002 | Partial LLM success/failure per claim is isolated | Bundle creates multiple claims; LLM succeeds for one and fails for another | Run pre-scoring. | Successful claim becomes ready; failed claim enters `Pre-scoring Failed`; parent/batch summary counts are correct. | P1 |
| E2E-BE-PIP-003 | LLM schema rejects missing/extra/wrong-type dimensions | Mock provider returns missing score, score as string, extra field, or out-of-range value | Run pre-scoring for each malformed response. | Invalid output is rejected; no invalid baseline saved; error code/log is searchable by task ID. | P0 |
| E2E-BE-ANN-001 | Draft save cannot overwrite submitted/approved task | Task already submitted or approved | Call draft API with old/stale payload. | 409 invalid state/version; saved annotation and task status remain unchanged. | P0 |
| E2E-BE-ANN-002 | Double submit creates one state transition | Valid ready task and annotation payload | Send two submit requests quickly or replay same request. | Exactly one submit history/audit; task remains `Submitted`; second request returns idempotent success or 409. | P0 |
| E2E-BE-ANN-003 | Optimistic locking catches stale annotation draft | Two sessions load same task version | Session A saves/submits; Session B submits older version. | Backend rejects stale version with 409; no lost update. | P1 |
| E2E-BE-QA-001 | Double approve/return race is safe | Submitted task exists | QA A approves while QA B returns or approves same task nearly simultaneously. | Only one final transition wins; loser gets 409; history/audit has one terminal action. | P0 |
| E2E-BE-QA-002 | Returned task cannot be exported until re-approved | Task is returned after previously being submitted | Trigger export before resubmit/approve. | Returned claim is excluded; export row count/status is correct. | P0 |
| E2E-BE-EXP-001 | CSV injection is neutralized | Approved claim/source/note begins with `=`, `+`, `-`, `@`, tab, or CR | Export CSV and inspect cell values. | Export prevents spreadsheet formula execution according to chosen rule; text remains traceable. | P0 |
| E2E-BE-EXP-002 | Export snapshot is consistent during concurrent approval | Export starts while QA approves another task in same project | Start export and approve concurrently. | CSV includes a consistent snapshot; export metadata row_count matches actual file rows. | P1 |
| E2E-BE-AUD-001 | Audit log is insert-only via API and DB permission | Audit row exists | Try update/delete via exposed API if any and via DB role used by app if testable. | Update/delete blocked; no mutable audit API; attempt is logged or denied safely. | P0 |
| E2E-BE-LOG-001 | Error responses use request ID and hide internals | Force parser/LLM/storage errors | Call relevant API and inspect response/log. | Client sees safe error code/request_id; log has diagnostic detail without secret/PII. | P1 |
