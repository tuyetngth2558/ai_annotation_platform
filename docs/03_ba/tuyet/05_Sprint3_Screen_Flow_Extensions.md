# Screen Flow — Sprint 3 Extensions

**Owner:** Nguyễn Thị Tuyết  
**Trạng thái:** Ready for cross-review  
**Phạm vi:** Notification · Dispute (MVP) · Export Consolidated · IAA Settings (navigation)  

---

## 1. Mục đích

Bổ sung luồng màn hình cho 4 module Sprint 3, tách khỏi `02_Screen_Flow.md` (MVP Sprint 1–2) để tránh nhầm scope build.

---

## 2. Quyết định đã chốt (ảnh hưởng flow)

| ID | Quyết định | Ảnh hưởng UI |
|---|---|---|
| B-02 | Dispute MVP: QA → Admin resolve | Không có màn Policy Analyst resolve trong Sprint 4 build |
| B-04 | Notification polling 10s | Không có realtime push UI; badge cập nhật theo poll |
| B-03 | Export XLSX 6 sheet | Một job → một file download |
| B-05 | Overlap thủ công | Admin chọn annotator tại Project Config |

---

## 3. Flow — Notification Center

### 3.1. Luồng tổng quát

```text
[ALL] Đăng nhập
  → Header hiển thị bell + badge unread (polling 10s)
  → Có notification mới?
        Có → Toast ngắn (optional) + badge tăng
        Không → giữ badge hiện tại

[ALL] Click bell
  → Dropdown preview (5 item gần nhất) HOẶC đi thẳng Notification Center
  → Notification Center (/notifications)
  → Lọc: All | Unread
  → Click 1 item
        → Mark as read
        → Navigate deep link (task / dispute / export job)
```

### 3.2. Flow theo event

```text
Event: task_assigned
  → Annotator nhận badge
  → Click → My Tasks / Annotation Workspace

Event: task_returned
  → Annotator nhận badge + preview error type trong list
  → Click → Annotation Workspace (tab QA feedback)

Event: dispute_created
  → QA + Admin nhận badge
  → Click → Dispute Detail

Event: dispute_resolved
  → Annotator + QA + Admin
  → Click → Dispute Detail (read-only) hoặc Task

Event: export_ready
  → Người tạo export
  → Click → Export Job Status → Download

Event: dispute_overdue
  → Admin
  → Item highlight đỏ trong list + dashboard flag
```

### 3.3. Empty / edge

- Không có notification → empty state + text hướng dẫn
- Mark all read → badge = 0
- Polling lỗi → badge giữ nguyên; icon warning nhỏ (không block app)

---

## 4. Flow — Dispute Management (MVP)

### 4.1. Điều kiện tạo dispute (gate trên UI)

```text
[QA] QA Review Workspace
  → Task đã Returned ít nhất 1 lần?
        Không → nút Dispute disabled + tooltip "Cần Return trước"
  → Annotator đã resubmit sau return?
        Không → Dispute disabled
  → Đây là lần QA review thứ 2 sau resubmit?
        Không → chỉ hiện Approve | Return
        Có → hiện thêm Escalate Dispute

[QA] Click Escalate Dispute
  → Modal: chọn lý do + mô tả bắt buộc
  → Confirm
  → Task → Disputed
  → Tạo dispute record
  → Notification → QA + Admin
  → Redirect option: Dispute Queue hoặc ở lại QA queue
```

### 4.2. Admin override (MVP)

```text
[ADMIN] Dispute Queue → Dispute Detail
  → Nút "Admin override tạo dispute" (chỉ Admin)
  → Bắt buộc nhập lý do override
  → Tạo dispute bỏ qua gate return lần 2
  → Ghi audit log
```

### 4.3. Resolve flow (MVP — Admin)

```text
[ADMIN] Dispute Detail (/disputes/:id)
  → Xem: task context, QA history, annotator output, lý do dispute
  → SLA indicator (5 ngày làm việc)
  → Chọn resolution:
        Approve output hiện tại
        Re-annotation Required
  → Nhập resolution note (bắt buộc)
  → Submit Resolve
  → Trạng thái dispute → Resolved
  → Task chuyển Approved hoặc Re-annotation Required
  → Notification → Annotator, QA
  → Dispute record read-only (không edit/xóa)
```

### 4.4. QA / Annotator view

```text
[QA] Dispute Queue
  → Filter: open / resolved / overdue
  → Click row → Dispute Detail (read-only nếu không phải Admin resolve)

[ANN] Notification dispute_resolved
  → Click → Task workspace hoặc read-only dispute summary panel
```

### 4.5. Wireframe ASCII — Dispute Queue

```text
┌─────────────────────────────────────────────────────────────┐
│ Disputes                                    [Filter ▼]      │
├──────────┬──────────┬────────────┬──────────┬───────────────┤
│ ID       │ Task     │ Project    │ Status   │ SLA           │
├──────────┼──────────┼────────────┼──────────┼───────────────┤
│ D-001    │ CLM-42   │ Vivipedia  │ Open     │ 3 ngày còn    │
│ D-002    │ CLM-88   │ Vivipedia  │ Overdue  │ ⚠ Quá hạn     │
└──────────┴──────────┴────────────┴──────────┴───────────────┘
```

---

## 5. Flow — QA Workspace (cập nhật Sprint 3)

```text
QA Review Workspace (existing)
  ├── Approve          → Approved
  ├── Return           → Returned (+ error type + comment)
  └── Escalate Dispute → Disputed (sau gate lần 2)
         └── Modal Dispute Flag (spec tại 06_Sprint3)
```

**Không thay đổi** flow Approve/Return Sprint 1–2 — chỉ **thêm** nhánh Dispute.

---

## 6. Flow — Export Consolidated

### 6.1. Luồng chính

```text
[ADMIN/QA] Sidebar → Export → Tab "Consolidated Report"
  → /export/consolidated

Bước 1 — Filter
  → Chọn Project (required)
  → Chọn Batch (optional)
  → Date range (optional)
  → Preview: số task / claim ước tính

Bước 2 — Create job
  → Click "Tạo báo cáo XLSX"
  → Job queued
  → Redirect /export/jobs/:id

Bước 3 — Theo dõi
  → Status: Queued → Processing (progress bar)
  → Ready → nút Download
  → Failed → thông báo lỗi + Retry

Bước 4 — Download
  → File .xlsx (UTF-8 BOM)
  → Ghi audit log
  → Notification export_ready (nếu user rời trang)
```

### 6.2. Export History

```text
/export hoặc tab History
  → Danh sách job: CSV (cũ) + Consolidated XLSX (mới)
  → Filter theo type, project, date
  → Re-download trong TTL (config backend)
```

### 6.3. Edge cases (hiển thị UI)

| Case | UI |
|---|---|
| 0 task match filter | Block tạo job + message |
| Job >30s | Progress + "Có thể rời trang, sẽ notify khi xong" |
| Download hết hạn | Disable download + "Tạo export mới" |

---

## 7. Flow — IAA Settings (Admin)

```text
[ADMIN] Project Detail → Tab Config → IAA Settings
  → Set overlap % (default 10%)
  → Chọn Annotator A + Annotator B
  → Save
  → System đánh dấu task overlap trong batch (backend)

[ADMIN/QA] Project → IAA Report
  → Xem Alpha scores sau khi overlap tasks hoàn thành
  → Không có flow chỉnh sửa score trên UI (read-only)
```

---

## 8. Mapping flow → màn hình Sprint 3

| # | Màn hình | Vai trò | Spec |
|---|---|---|---|
| 5 | Notification Center + Bell | ALL | `06_Sprint3` §2 |
| 6 | Dispute Flag Modal (QA) | QA | `06_Sprint3` §3 |
| 7 | Dispute Queue | QA, ADMIN | `06_Sprint3` §4 |
| 8 | Dispute Detail / Resolve | ADMIN | `06_Sprint3` §5 |
| 9 | Export Consolidated Form | ADMIN, QA | `06_Sprint3` §6 |
| 10 | Export Job Status | ADMIN, QA | `06_Sprint3` §7 |
| 11 | Project IAA Settings | ADMIN | `06_Sprint3` §8 |

---

## 9. Handoff Sprint 4

Dev cần từ flow này:

- [ ] Route list khớp `01_Information_Architecture.md` v3.0
- [ ] Gate logic Dispute trên QA Workspace
- [ ] Polling interval 10s cho bell
- [ ] Deep link map per `notification.type`
- [ ] Async export job UI states

---

*Tài liệu nội bộ VSF — Sprint 3 Screen Flow — Owner: Nguyễn Thị Tuyết*
