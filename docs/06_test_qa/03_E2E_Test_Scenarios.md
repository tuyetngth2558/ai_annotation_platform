# E2E Test Scenarios — VSF AI Annotation Platform MVP

**Owner:** QA Team  
**Phiên bản:** v1.1
**Ngày:** 08/06/2026
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

## 2. E2E happy path

| ID | Scenario | Preconditions | Steps | Expected result | Priority |
|---|---|---|---|---|---|
| E2E-001 | Full flow: Import PDF Bundle -> Approve -> Export CSV | Admin, Annotator, QA account; valid PDF Bundle; LLM success | 1. Admin login. 2. Create project. 3. Configure LLM. 4. Upload valid PDF Bundle. 5. Assign file roles. 6. Preview parse. 7. Confirm import. 8. System parses PDF and normalizes internal data. 9. Assign annotator/QA. 10. Annotator opens assigned claim. 11. Reviews source and scores. 12. Submit. 13. QA opens Submitted task. 14. Approve. 15. Admin/authorized user exports CSV. | Project/batch/bundle/parent task created; parse result and normalized data saved; claim task reaches `Approved`; exported CSV contains approved claim with required fields and PDF trace. | P0 |
| E2E-002 | Full flow with QA Return and Resubmit | Valid task already submitted | 1. QA opens Submitted task. 2. Return with error type + comment. 3. Annotator sees Returned task. 4. Annotator edits claim/score/note. 5. Resubmit. 6. QA Approve. 7. Export. | Task goes `Submitted -> Returned -> Submitted -> Approved`; history/audit records return and resubmit; export includes final approved data only. | P0 |

---

## 3. Import and pipeline scenarios

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

---

## 4. Annotation scenarios

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

---

## 5. QA review scenarios

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| E2E-QA-001 | QA sees Submitted tasks | Login as QA | QA Queue shows only submitted tasks for assigned project/scope. | P0 |
| E2E-QA-002 | Diff view highlights delta | Open task with annotator score delta >= 0.20 | LLM baseline, annotator output, delta displayed; large delta highlighted. | P1 |
| E2E-QA-003 | Approve task | Click Approve on Submitted task | Task becomes `Approved`; no comment required; audit/history created. | P0 |
| E2E-QA-004 | Return requires error type | Click Return, leave error type empty | Return blocked. | P0 |
| E2E-QA-005 | Return requires comment | Click Return with no/short comment | Return blocked until comment >= 10 characters. | P0 |
| E2E-QA-006 | QA cannot edit score or claim | Try to edit annotator score/claim in QA screen | Fields are read-only or no edit action exists. | P1 |
| E2E-QA-007 | QA cannot review non-submitted task | Open/act on task not in `Submitted` state | API/UI blocks action with invalid status. | P0 |

---

## 6. Export scenarios

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| E2E-EXP-001 | Export approved-only claims | Have approved + returned/submitted tasks; create export | CSV includes only approved claims. | P0 |
| E2E-EXP-002 | Required columns | Export CSV and inspect header | Required columns match approved schema, including `bundle_id` and PDF filenames. | P0 |
| E2E-EXP-003 | UTF-8 and CSV quoting | Export claim with Vietnamese text, comma, quotes, newline | CSV opens correctly; text not corrupted; quoting/escaping correct. | P0 |
| E2E-EXP-004 | Multiple sources delimiter | Export claim mapped to multiple sources | Source orders/titles/file refs joined consistently with `;`. | P1 |
| E2E-EXP-005 | No approved claims | Export project/batch with no approved claim | UI shows no data message or header-only CSV according to implementation decision. | P2 |
| E2E-EXP-006 | Export audit log | Create export job | Audit log contains export action with actor, target, row count, timestamp. | P1 |

---

## 7. RBAC and audit scenarios

| ID | Scenario | Steps | Expected result | Priority |
|---|---|---|---|---|
| E2E-RBAC-001 | Admin access | Login Admin | Can access Project, Import, Users, Audit, Export. | P0 |
| E2E-RBAC-002 | Annotator restricted access | Login Annotator | Cannot access Project Setup, QA action, User Management, Audit. | P0 |
| E2E-RBAC-003 | QA restricted access | Login QA | Can access QA Queue and allowed export if configured; cannot create project/users unless Admin. | P0 |
| E2E-AUD-001 | Audit core actions | Perform import, claim edit, submit, approve, return, export | Audit log records actor, action type, entity, timestamp. | P1 |

---

## 8. Final UAT watchlist

- Export permission: Admin only or Admin + QA được cấp quyền.
- OCR handling for scan/image PDFs: reject or flag `ocr_required`.
- Exact LLM output schema and mock response contract.
- Source content PDF mapping rule: one file per source or bundled source content.
