# API / UI Sanity Test Checklist — VSF AI Annotation Platform MVP

**Owner:** QA Team  
**Phiên bản:** v1.0

---

## 1. API sanity checklist

> Endpoint dưới đây là checklist theo capability. Tên endpoint thực tế có thể điều chỉnh theo backend implementation.

| ID | Capability | Suggested endpoint | Method | Expected sanity result | Status |
|---|---|---|---|---|---|
| API-001 | Health check | `/health` | GET | 200 OK, service/version/env returned | Not Run |
| API-002 | Login | `/auth/login` | POST | 200 OK with token/session for valid credentials | Not Run |
| API-003 | Current user | `/auth/me` | GET | Returns user id, role, active status | Not Run |
| API-004 | Project list | `/projects` | GET | Role-filtered list returned | Not Run |
| API-005 | Create project | `/projects` | POST | Admin can create project; non-admin forbidden | Not Run |
| API-006 | Save LLM config | `/projects/:id/llm-config` | POST/PUT | Valid config saved; API key not returned plain text | Not Run |
| API-007 | Upload PDF files | `/projects/:id/import/pdf-bundles/upload` | POST | Accepts PDF files; rejects invalid files | Not Run |
| API-008 | Validate bundle | `/projects/:id/import/pdf-bundles/validate` | POST | Returns pass/fail with detailed errors | Not Run |
| API-009 | Parse preview | `/projects/:id/import/pdf-bundles/preview` | POST | Returns metadata/source preview/warnings | Not Run |
| API-010 | Confirm import | `/projects/:id/import/pdf-bundles/confirm` | POST | Creates batch/bundle and starts background pipeline | Not Run |
| API-011 | Batch detail/status | `/batches/:id` | GET | Returns import/pipeline counts and statuses | Not Run |
| API-012 | Claim task detail | `/tasks/:id` | GET | Returns claim, source, pre-score, state | Not Run |
| API-013 | My tasks | `/tasks?assignee=me` | GET | Annotator sees only assigned tasks | Not Run |
| API-014 | Auto-save annotation | `/tasks/:id/annotation/draft` | PUT | Saves draft; does not submit task | Not Run |
| API-015 | Submit annotation | `/tasks/:id/submit` | POST | Valid payload moves task to `Submitted` | Not Run |
| API-016 | QA queue | `/qa/tasks` | GET | QA sees submitted tasks in assigned scope | Not Run |
| API-017 | QA approve | `/qa/tasks/:id/approve` | POST | Submitted task moves to `Approved` | Not Run |
| API-018 | QA return | `/qa/tasks/:id/return` | POST | Requires error type/comment; moves to `Returned` | Not Run |
| API-019 | Export CSV | `/exports` | POST | Creates export job for approved claims only | Not Run |
| API-020 | Download export | `/exports/:id/download` | GET | Downloads UTF-8 CSV | Not Run |
| API-021 | Audit log | `/audit` | GET | Admin-only audit list returned | Not Run |

---

## 2. API negative sanity

| ID | Check | Expected result | Status |
|---|---|---|---|
| API-N-001 | Request without auth token/session | 401 Unauthorized | Not Run |
| API-N-002 | Annotator calls create project API | 403 Forbidden | Not Run |
| API-N-003 | QA approves task not `Submitted` | 400/409 invalid task state | Not Run |
| API-N-004 | Submit annotation with score `1.01` | 400 validation error | Not Run |
| API-N-005 | Submit annotation with score `0.123` | 400 validation error | Not Run |
| API-N-006 | Submit annotation missing required score | 400 validation error | Not Run |
| API-N-007 | Return without comment | 400 validation error | Not Run |
| API-N-008 | Export with non-approved status if blocked by MVP rule | 400/disabled equivalent | Not Run |
| API-N-009 | Upload non-PDF file as PDF bundle | 400 validation error | Not Run |
| API-N-010 | Confirm invalid bundle | 400 validation error, no batch created | Not Run |

---

## 3. UI sanity checklist

| ID | Screen | Check | Expected result | Status |
|---|---|---|---|---|
| UI-001 | Login | Login page loads | No console-breaking error, fields visible | Not Run |
| UI-002 | Login | Invalid credentials | Error message displayed, no login | Not Run |
| UI-003 | Dashboard | Admin dashboard | Project/import/export/audit navigation visible | Not Run |
| UI-004 | Dashboard | Annotator dashboard | My Tasks navigation visible, admin modules hidden | Not Run |
| UI-005 | Dashboard | QA dashboard | QA Queue visible, QA actions accessible | Not Run |
| UI-006 | Project Setup | Required field validation | Inline errors and disabled continue until valid | Not Run |
| UI-007 | Project Setup | Modality | Text fixed; audio/image disabled/not selectable | Not Run |
| UI-008 | Import | Upload files | File list visible; role selector usable | Not Run |
| UI-009 | Import | Validation errors | Error panel lists missing/duplicate/invalid role issues | Not Run |
| UI-010 | Import | Parse preview | Metadata/source/warnings visible after preview | Not Run |
| UI-011 | My Tasks | Empty state | Clear empty message when no assigned task | Not Run |
| UI-012 | Annotation | Workspace layout | Answer context, claim scoring, source viewer visible | Not Run |
| UI-013 | Annotation | Score input | Invalid score shows error and blocks submit | Not Run |
| UI-014 | Annotation | Auto-save indicator | Shows last saved status/time | Not Run |
| UI-015 | Annotation | Submit success | Toast/message shown; task leaves active queue | Not Run |
| UI-016 | Annotation | Returned state | Return banner and QA comment visible | Not Run |
| UI-017 | QA Queue | Queue list | Submitted tasks listed with filters/search | Not Run |
| UI-018 | QA Review | Diff view | Baseline, annotator score, delta visible | Not Run |
| UI-019 | QA Review | Approve | Success feedback and return to queue | Not Run |
| UI-020 | QA Review | Return modal | Error type + comment required | Not Run |
| UI-021 | Export | Export form | Project/status/format controls visible | Not Run |
| UI-022 | Export | Export result | Done state and download action visible | Not Run |
| UI-023 | Audit | Audit list | Admin can filter/view action logs | Not Run |
| UI-024 | Global | Loading state | No broken blank screen during loading | Not Run |
| UI-025 | Global | Error state | API error shown in user-readable way | Not Run |

---

## 4. Release sanity run order

1. API health check.
2. Login with Admin, Annotator, QA.
3. Admin create project and import one valid PDF Bundle.
4. Confirm pipeline creates claim task with pre-score.
5. Annotator submit one task.
6. QA approve one task.
7. Export CSV and verify approved-only.
8. Check audit log for import/submit/approve/export.
9. Run one negative validation each for upload, score, QA return.
10. Record result in test execution notes.
