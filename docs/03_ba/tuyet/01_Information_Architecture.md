# Information Architecture — VSF AI Annotation Platform

**Owner:** Nguyễn Thị Tuyết  
**Phiên bản:** Sprint 3 Extension  
**Trạng thái:** Ready for Dev / Test review (Sprint 3)  

---

## 1. Mục đích tài liệu

Mô tả cấu trúc thông tin platform sau khi mở rộng Sprint 3 với 4 module:

- **Notification** (in-app, polling 10s)
- **IAA** (overlap assignment + dashboard)
- **Dispute Management** (MVP flow: QA → Admin resolve)
- **Export Consolidated Report** (XLSX 6 sheet)

Tài liệu cập nhật IA MVP (v2.0) — không thay thế hoàn toàn, bổ sung module và URL mới.

---

## 2. Phạm vi theo giai đoạn

### 2.1. Đã build (Sprint 1–2)

- PDF import → Annotation → QA Approve/Return → Export CSV claim-level
- RBAC Admin / Annotator / QA
- 4 màn chính: Project Setup, Annotation Workspace, QA Review, Export CSV

### 2.2. Design Sprint 3 — Build Sprint 4

| Module | URL chính | Vai trò truy cập |
|---|---|---|
| Notification Center | `/notifications` | ALL (theo event) |
| Dispute Queue | `/disputes` | QA, ADMIN |
| Dispute Detail / Resolve | `/disputes/:id` | ADMIN (MVP resolve); reserve Policy Analyst |
| Project IAA Settings | `/projects/:id/config/iaa` | ADMIN |
| IAA Dashboard | `/projects/:id/iaa` | ADMIN, QA |
| Export Consolidated | `/export/consolidated` | ADMIN, QA |
| Export Job Status | `/export/jobs/:id` | Người tạo job |

### 2.3. Vẫn hoãn (Phase 2+)

- Policy Center đầy đủ (Guideline Editor WYSIWYG)
- Full Dispute flow (Policy Analyst → Guideline update)
- SSE / WebSocket notification
- Auto overlap assignment
- PDF Summary export

---

## 3. Sơ đồ IA tổng thể (cập nhật Sprint 3)

```text
VSF AI Annotation Platform
│
├── Auth
│   ├── Login
│   └── Đổi mật khẩu
│
├── Platform Shell [ALL]
│   ├── Header: logo, breadcrumb, notification bell (badge), user menu
│   └── Sidebar: role-based navigation
│
├── Dashboard / Home
│   ├── Dashboard Admin (+ dispute rate, IAA summary widget)
│   ├── Dashboard Annotator
│   └── Dashboard QA
│
├── Projects [ADMIN]
│   ├── Project List / Setup / Detail / Import
│   ├── Team Assignment
│   ├── Project Config
│   │   ├── General
│   │   ├── IAA Settings          ← Sprint 3
│   │   └── SLA / Quality gates   ← reserve
│   └── Project IAA Report        ← Sprint 3
│
├── My Tasks [ANN]
│   ├── Task List
│   └── Annotation Workspace
│
├── QA Queue [QA, ADMIN]
│   ├── QA Task List
│   └── QA Review Workspace (+ Escalate Dispute)   ← Sprint 3
│
├── Disputes [QA, ADMIN]                          ← Sprint 3
│   ├── Dispute Queue
│   └── Dispute Detail / Resolve
│
├── Export [ADMIN, QA]
│   ├── Export CSV (MVP hiện có)
│   ├── Export Consolidated (XLSX)                ← Sprint 3
│   └── Export History / Job Status
│
├── Notifications [ALL]                           ← Sprint 3
│   └── Notification Center
│
├── Users [ADMIN]
├── Audit Log [ADMIN]
│
└── Policies [Phase 2 — reserve URL]
    └── /policy/disputes → redirect /disputes (khi build Policy Center)
```

---

## 4. Bảng module — URL, vai trò, trạng thái build

| Module | URL | ADMIN | QA | ANN | Sprint |
|---|---|:---:|:---:|:---:|---|
| Notification bell (shell) | global | ✓ | ✓ | ✓ | 3 design / 4 build |
| Notification Center | `/notifications` | ✓ | ✓ | ✓ | 3 design / 4 build |
| QA Review + Dispute action | `/qa/:id/review` | ✓ | ✓ | — | 3 design / 4 build |
| Dispute Queue | `/disputes` | ✓ | ✓ | — | 3 design / 4 build |
| Dispute Detail | `/disputes/:id` | ✓ | read | read* | 3 design / 4 build |
| IAA Settings | `/projects/:id/config/iaa` | ✓ | — | — | 3 design / 4 build |
| IAA Report | `/projects/:id/iaa` | ✓ | ✓ | — | 3 design / 4 build |
| Export Consolidated | `/export/consolidated` | ✓ | ✓ | — | 3 design / 4 build |
| Export Job Status | `/export/jobs/:id` | ✓ | ✓ | — | 3 design / 4 build |

\* Annotator chỉ xem dispute liên quan task của mình (read-only summary), không vào queue.

---

## 5. Notification — cấu trúc thông tin

### 5.1. Entry points

| Vị trí | Hành vi |
|---|---|
| Bell icon (header) | Badge số unread; click → Notification Center hoặc dropdown preview (tối đa 5 item) |
| Toast in-app | Hiện khi polling phát hiện notification mới trong session |
| Deep link | Mỗi notification → entity: task, dispute, export job, guideline |

### 5.2. Loại notification (theo PRD §14.4 + Sprint 3 scope)

| type | Mô tả ngắn | Deep link target |
|---|---|---|
| `task_assigned` | Task mới được giao | `/tasks/:id/annotate` |
| `task_returned` | QA return kèm lý do | `/tasks/:id/annotate` |
| `dispute_created` | Dispute mới | `/disputes/:id` |
| `dispute_resolved` | Dispute đã resolve | `/disputes/:id` hoặc task |
| `guideline_published` | Rubric/guideline mới | `/policy/guidelines/:id` (reserve) |
| `llm_job_done` / `llm_job_failed` | Pre-scoring job | `/projects/:id` |
| `export_ready` | Export job hoàn tất | `/export/jobs/:id` |
| `sla_warning` | Còn 24h deadline | task hoặc dispute |
| `dispute_overdue` | Dispute quá SLA 5 ngày | `/disputes/:id` (cờ đỏ) |

### 5.3. Trạng thái đọc

- `unread` / `read`
- Hành động: mark one read, mark all read
- Polling: `GET /notifications/unread-count` mỗi 10 giây (B-04)

---

## 6. Dispute — cấu trúc thông tin (MVP)

### 6.1. Luồng thông tin

```text
QA Review Workspace
  → Escalate Dispute (sau return lần 2)
  → Dispute record tạo (immutable)
  → Notify QA + Admin
  → Dispute Queue
  → Admin Resolve → Approved | Re-annotation Required
  → Notify Annotator + QA
```

### 6.2. Dispute record (view model UI)

| Nhóm field | Nội dung hiển thị |
|---|---|
| Header | dispute_id, task_id, project, trạng thái, SLA countdown |
| Context | claim text, annotator output, QA assessment, return history |
| Dispute | lý do QA, error type, timestamp, người tạo |
| Resolution | quyết định Admin, ghi chú, resolved_at (khi xong) |
| Reserve Full flow | `assigned_to`, `policy_note`, `guideline_update_id` (ẩn hoặc disabled MVP) |

### 6.3. Trạng thái hiển thị

| Status code | Label UI |
|---|---|
| `disputed` | Chờ xử lý |
| `dispute_in_review` | Đang review |
| `dispute_resolved_approved` | Đã resolve — Chấp nhận |
| `dispute_resolved_reannotation` | Đã resolve — Cần làm lại |
| `dispute_overdue` | Quá SLA (cờ đỏ) |

---

## 7. IAA — cấu trúc thông tin

### 7.1. Project Config → Tab IAA Settings

- Overlap % (mặc định 10%)
- Chọn 2 annotator overlap (admin thủ công — B-05)
- Metric: Krippendorff's Alpha (read-only label, B-01)
- Threshold action: <0.60 flag (hiển thị legend)

### 7.2. IAA Report (`/projects/:id/iaa`)

- Bảng cặp annotator + Alpha per dimension + composite
- Ngưỡng màu: ≥0.75 xanh · 0.60–0.74 vàng · <0.60 đỏ
- Link sang profile annotator (reserve Team module)

---

## 8. Export Consolidated — cấu trúc thông tin

### 8.1. Màn tạo export

| Filter | Mô tả |
|---|---|
| Project | Bắt buộc |
| Batch | Tùy chọn |
| Date range | submitted / approved |
| Status include | Mặc định Approved; Admin có thể mở rộng |
| Format | XLSX consolidated (6 sheet) — cố định Sprint 3 |

### 8.2. Output structure (align Đan Export Schema)

| Sheet | Mục đích |
|---|---|
| Summary | Tổng quan dự án |
| Claim Level | Chi tiết claim + scores |
| Answer Level | Parent task aggregate |
| QA Review Log | Lịch sử QA action |
| Dispute Log | Dispute trong scope export |
| IAA Report | IAA snapshot |

### 8.3. Export job lifecycle (UI)

`Queued` → `Processing` (progress %) → `Ready` (download) | `Failed` (retry)

---

## 9. Cập nhật navigation sidebar

| Vai trò | Item mới Sprint 3 |
|---|---|
| ALL | Notification (bell only — không cần menu riêng nếu dùng bell) |
| ADMIN | Disputes, Export Consolidated, Project → IAA tab |
| QA | Disputes (queue), Export Consolidated |
| ANN | — (chỉ nhận notification, không có menu Disputes) |

---

## 10. Nguyên tắc IA Sprint 3

1. **Bell-first notification** — không chiếm sidebar; center là đích đầy đủ.
2. **Dispute gắn task context** — luôn trace về claim task và QA history.
3. **MVP Admin resolve** — UI không ẩn field Policy Analyst nhưng disabled + tooltip "Phase 2".
4. **Export một file** — user chọn filter một lần, nhận một XLSX nhiều sheet.
5. **Extensible URLs** — `/disputes`, `/notifications` khớp PRD Screen Map §23.

---

*Tài liệu nội bộ VSF — Cập nhật IA Sprint 3 — Owner: Nguyễn Thị Tuyết*
