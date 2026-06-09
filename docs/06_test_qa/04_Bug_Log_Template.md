# Bug Log Template — VSF AI Annotation Platform MVP

**Owner:** QA Team  
**Phiên bản:** v1.0

---

## 1. Bug log table

| Bug ID | Title | Module | Severity | Priority | Status | Environment | Build/Commit | Reporter | Assignee | Created Date | Expected Result | Actual Result | Steps to Reproduce | Test Data | Evidence Link | Root Cause | Fix Version | Retest Result | Closed Date | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BUG-001 | Example: Export includes returned task | Export | High | P0 | Open | Staging | TBD | QA | Dev | 2026-06-06 | CSV only includes Approved claims | Returned claim appears in CSV | 1. Prepare Returned task. 2. Export project. 3. Open CSV. | batch_001 | screenshot/log | TBD | TBD | Not retested |  |  |

---

## 2. Status values

| Status | Ý nghĩa |
|---|---|
| New | Bug mới được ghi nhận |
| Open | Dev/QA Lead đã xác nhận cần xử lý |
| In Progress | Dev đang xử lý |
| Fixed | Dev đã fix, chờ QA retest |
| Retest | QA đang kiểm tra lại |
| Reopened | Fix chưa đạt, mở lại |
| Deferred | Hoãn xử lý, cần PO/QA Lead chấp nhận |
| Duplicate | Trùng bug khác |
| Won't Fix | Không xử lý theo quyết định scope |
| Closed | Đã verify pass và đóng |

---

## 3. Severity guide

| Severity | Tiêu chí |
|---|---|
| Critical | Không login được, không import được happy path, mất dữ liệu, sai quyền nghiêm trọng, crash hệ thống, không export được |
| High | Sai rule nghiệp vụ chính: validation sai, task state sai, export sai data, QA approve/return sai |
| Medium | Lỗi ảnh hưởng một phần flow nhưng có workaround |
| Low | Lỗi hiển thị, typo, alignment, thông báo chưa rõ |

---

## 4. Priority guide

| Priority | Tiêu chí |
|---|---|
| P0 | Block release/UAT, phải xử lý ngay |
| P1 | Cần xử lý trước khi nghiệm thu |
| P2 | Có thể xử lý sau nếu còn thời gian |
| P3 | Nice-to-have/polish |

---

## 5. Bug report format

```text
Bug ID:
Title:
Module:
Severity:
Priority:
Environment:
Build/Commit:

Preconditions:

Steps to reproduce:
1.
2.
3.

Expected result:

Actual result:

Test data:

Evidence:

Notes:
```

---

## 6. Modules

- Auth/RBAC
- Dashboard
- Project Setup
- PDF Bundle Import
- PDF Parsing
- Claim Extraction
- Source Mapping
- LLM Pre-scoring
- Annotation Workspace
- QA Review
- Export
- Audit Log
- API
- UI/UX
- DevOps/Environment
