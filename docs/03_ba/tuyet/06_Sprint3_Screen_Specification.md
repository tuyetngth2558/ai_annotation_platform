# Screen Specification — Sprint 3 Extensions

**Owner:** Nguyễn Thị Tuyết  
**Trạng thái:** Ready for Dev / Test review  

---

## 1. Quy ước

- Kế thừa quy ước từ `03_Screen_Specification.md` (Claim Task, PDF Bundle, states).
- Sprint 3 **bổ sung** màn hình — không sửa spec MVP trừ **QA Review Workspace** (thêm action Dispute).
- `data-testid` gợi ý cho Test automation (align `09_UI_Testability_URL_Element_Map_MVP.md`).

---

## 2. Màn hình 5 — Notification Center & Bell

### 2.1. Global Notification Bell (Platform Shell)

**Vị trí:** Header phải, trước user menu  
**Vai trò:** ALL  

#### Components

| Component | Mô tả | data-testid |
|---|---|---|
| `NotificationBell` | Icon bell | `nav-notification-bell` |
| `UnreadBadge` | Số unread, ẩn khi = 0 | `nav-notification-badge` |
| `PreviewDropdown` | Tối đa 5 item (optional MVP) | `nav-notification-preview` |
| `ViewAllLink` | → `/notifications` | `nav-notification-view-all` |

#### Hành vi

| Hành vi | Chi tiết |
|---|---|
| Polling | Mỗi 10s gọi `GET /notifications/unread-count` |
| Badge | Hiển thị 1–99, `99+` nếu >99 |
| Click bell | Mở dropdown hoặc navigate full center (chốt 1 pattern — khuyến nghị: click → full page) |
| Toast | Khi count tăng trong session: toast 3s "Bạn có thông báo mới" |

#### States

| State | UI |
|---|---|
| Loading | Bell không badge hoặc skeleton nhỏ |
| Zero unread | Không badge |
| Has unread | Badge đỏ |
| Poll error | Bell bình thường, không crash |

---

### 2.2. Notification Center

**URL:** `/notifications`  
**Vai trò:** ALL  

#### Layout wireframe

```text
┌────────────────────────────────────────────────────────────┐
│ Thông báo                    [Đánh dấu tất cả đã đọc]      │
│ [ Tất cả ] [ Chưa đọc ]                                    │
├────────────────────────────────────────────────────────────┤
│ ● Task CLM-42 được giao          2 phút trước              │
│ ○ QA đã return task CLM-18       1 giờ trước               │
│ ○ Export báo cáo sẵn sàng        Hôm qua                   │
├────────────────────────────────────────────────────────────┤
│ (empty state nếu không có item)                            │
└────────────────────────────────────────────────────────────┘
```

#### List item fields

| Field | Hiển thị |
|---|---|
| `title` | Dòng chính (theo type template) |
| `body` | Tóm tắt (return reason, dispute id…) |
| `created_at` | Relative time |
| `is_read` | ● unread / ○ read |
| `entity_link` | Click cả row → deep link + mark read |

#### Actions

| Action | Điều kiện | Kết quả |
|---|---|---|
| Mark as read | Click item | `PATCH .../read` |
| Mark all read | Nút header | Tất cả → read, badge = 0 |
| Filter All / Unread | Tab | Lọc list |

#### Notification copy templates

| type | Title template | Body (tóm tắt) |
|---|---|---|
| `task_assigned` | `Task {claim_id} được giao cho bạn` | Dự án: {project_name} |
| `task_returned` | `QA đã return task {claim_id}` | Lý do: {error_type} |
| `dispute_created` | `Dispute mới: {dispute_id}` | Task: {claim_id} · QA: {qa_name} |
| `dispute_resolved` | `Dispute {dispute_id} đã được xử lý` | Kết quả: {resolution_type} |
| `export_ready` | `Báo cáo export sẵn sàng tải` | Dự án: {project_name} |
| `sla_warning` | `Task {claim_id} sắp quá hạn SLA` | Còn {hours}h để hoàn thành |
| `dispute_overdue` | `⚠ Dispute {dispute_id} quá SLA` | Quá {days} ngày làm việc |
| `guideline_published` | `Guideline dự án {project_name} vừa cập nhật` | Phiên bản mới yêu cầu xác nhận đã đọc |
| `llm_job_done` | `LLM pre-scoring hoàn tất — {batch_id}` | {task_count} task sẵn sàng cho annotator |
| `llm_job_failed` | `⚠ LLM pre-scoring thất bại — {batch_id}` | Kiểm tra cấu hình LLM hoặc retry |

> **Ghi chú:** `guideline_published` và `llm_job_failed/done` bổ sung từ PRD §14.4 — đảm bảo đủ event types cho Test coverage.

#### Validation / AC

- [ ] Unread count khớp số item chưa đọc trong list
- [ ] Deep link mở đúng màn và mark read
- [ ] Empty state khi filter Unread và không có item
- [ ] `guideline_published` → link `/policy/guidelines/:id` (reserve Phase 2, hiển thị fallback `/projects/:id` nếu chưa có)
- [ ] `llm_job_failed` chỉ gửi tới ADMIN; không gửi annotator

---

## 3. Màn hình 6 — QA Dispute Flag (Modal)

**URL context:** `/qa/:id/review` (modal overlay)  
**Vai trò:** QA  

#### Trigger điều kiện

| Điều kiện | UI |
|---|---|
| Chưa đủ return lần 2 | Nút `Escalate Dispute` disabled + tooltip |
| Đủ điều kiện | Nút enabled, style secondary/destructive |

#### Wireframe

```text
┌──────────────── Escalate Dispute ─────────────────┐
│ Task: CLM-42 · Vivipedia                          │
│                                                   │
│ Lý do dispute *                                   │
│ ( ) Guideline không rõ                            │
│ ( ) Bất đồng điểm số không giải quyết được       │
│ ( ) Lỗi extraction / mapping                      │
│ ( ) Pattern lỗi lặp lại                             │
│ ( ) Khác                                          │
│                                                   │
│ Mô tả chi tiết *                                  │
│ [________________________________________]        │
│                                                   │
│              [Hủy]  [Gửi dispute]                 │
└───────────────────────────────────────────────────┘
```

#### Fields

| Field | Loại | Bắt buộc | Validation |
|---|---|---|---|
| `dispute_reason_code` | Radio | Có | 1 trong enum |
| `dispute_description` | Textarea | Có | 20–2000 ký tự |

#### Actions

| Action | Kết quả |
|---|---|
| Gửi dispute | Task → `Disputed`, tạo record, notify, đóng modal |
| Hủy | Đóng modal, không đổi task |

#### data-testid

`qa-dispute-btn`, `qa-dispute-modal`, `qa-dispute-reason`, `qa-dispute-description`, `qa-dispute-submit`

---

## 4. Màn hình 7 — Dispute Queue

**URL:** `/disputes`  
**Vai trò:** QA (read), ADMIN (full)  

#### Components

| Component | Mô tả |
|---|---|
| Page header | Tiêu đề + filter |
| Status filter | Open / In Review / Resolved / Overdue |
| Project filter | Dropdown project |
| Data table | Sortable columns |
| SLA column | Countdown hoặc overdue badge |
| Row action | View → Detail |

#### Table columns

| Column | Ghi chú |
|---|---|
| Dispute ID | Link |
| Claim / Task ID | Link workspace |
| Project | Text |
| Created by | QA name |
| Status | Badge màu |
| SLA | 5 ngày làm việc |
| Created at | Date |

#### States

| State | UI |
|---|---|
| Empty | "Không có dispute" |
| Loading | Skeleton table |
| Overdue row | Background `error-container` nhạt |

---

## 5. Màn hình 8 — Dispute Detail & Resolve

**URL:** `/disputes/:id`  
**Vai trò:** ADMIN resolve; QA/ANN read-only  

#### Layout (2 cột)

```text
┌─────────────────────────┬──────────────────────────┐
│ Dispute D-001           │ SLA: 3 ngày còn lại       │
│ Status: Open            │                          │
├─────────────────────────┴──────────────────────────┤
│ Task context                                      │
│ - Claim text, scores, source                      │
│ - Annotator output vs QA assessment               │
├───────────────────────────────────────────────────┤
│ Return history (timeline)                         │
├───────────────────────────────────────────────────┤
│ Dispute reason + QA description                   │
├───────────────────────────────────────────────────┤
│ [ADMIN ONLY] Resolution                           │
│ ( ) Approve current output                        │
│ ( ) Re-annotation required                        │
│ Resolution note * [____________]                  │
│ [Resolve dispute]                                 │
├───────────────────────────────────────────────────┤
│ Policy Analyst fields (disabled — Phase 2)        │
│ assigned_to, policy_note, guideline_update_id     │
└───────────────────────────────────────────────────┘
```

#### Fields resolve (Admin)

| Field | Bắt buộc | Validation |
|---|---|---|
| `resolution_type` | Có | `approved` \| `reannotation` |
| `resolution_note` | Có | 10–2000 ký tự |

#### Sau resolve

- Toàn bộ màn chuyển read-only
- Banner: "Dispute đã resolve — {date}"
- Không có nút Edit / Delete

#### Annotator view

- Ẩn panel Resolution
- Hiển thị kết quả resolve khi đã xong

---

## 6. Màn hình 9 — Export Consolidated (Filter & Create)

**URL:** `/export/consolidated`  
**Vai trò:** ADMIN, QA  

#### Wireframe

```text
┌──────────────── Báo cáo tổng hợp (XLSX) ────────────────┐
│ Dự án *        [ Vivipedia          ▼]                  │
│ Batch          [ Tất cả              ▼]                  │
│ Từ ngày        [____]  Đến ngày [____]                   │
│                                                          │
│ Ước tính: ~120 claim · ~15 parent tasks                  │
│                                                          │
│ File output: 1 file XLSX · 6 sheet                       │
│  Summary | Claim | Answer | QA Log | Dispute | IAA     │
│                                                          │
│              [Hủy]  [Tạo báo cáo]                         │
└──────────────────────────────────────────────────────────┘
```

#### Fields

| Field | Loại | Bắt buộc | Ghi chú |
|---|---|---|---|
| `project_id` | Select | Có | |
| `batch_id` | Select | Không | "Tất cả" |
| `date_from` | Date | Không | Filter approved_at |
| `date_to` | Date | Không | >= date_from |
| `export_type` | Hidden | — | `consolidated_xlsx` |

#### Validation

| Rule | Hành vi |
|---|---|
| Không chọn project | Disable submit |
| 0 record match | Error inline, không tạo job |
| User không có quyền export project | 403 page |

#### Actions

| Action | Kết quả |
|---|---|
| Tạo báo cáo | `POST /exports/consolidated` → redirect job status |
| Hủy | Về Export hub |

#### data-testid

| Element | data-testid |
|---|---|
| Project select | `export-project-select` |
| Batch select | `export-batch-select` |
| Date from | `export-date-from` |
| Date to | `export-date-to` |
| Preview count text | `export-preview-count` |
| Submit button | `export-consolidated-submit` |
| Cancel button | `export-consolidated-cancel` |

---

## 7. Màn hình 10 — Export Job Status & Download

**URL:** `/export/jobs/:id`  
**Vai trò:** Người tạo job, ADMIN  

#### States UI

| Job status | UI |
|---|---|
| `queued` | Spinner + "Đang chờ xử lý" |
| `processing` | Progress bar + % (nếu API có) |
| `ready` | Nút **Tải XLSX** primary |
| `failed` | Message lỗi + **Thử lại** |

#### Components

| Component | Mô tả |
|---|---|
| Job metadata | project, created_at, created_by |
| Sheet list | 6 sheet names (read-only info) |
| Download button | Chỉ enable khi `ready` |
| Back link | → Export history |

#### Post-download

- Ghi audit (backend)
- Optional: toast "Đã tải file"

#### data-testid

| Element | data-testid |
|---|---|
| Job status badge | `export-job-status` |
| Progress bar | `export-job-progress` |
| Download button | `export-job-download-btn` |
| Retry button | `export-job-retry-btn` |
| Back link | `export-job-back-link` |

---

## 8. Màn hình 11 — Project IAA Settings (Tab)

**URL:** `/projects/:id/config/iaa`  
**Vai trò:** ADMIN  

#### Fields

| Field | Loại | Default | Validation |
|---|---|---|---|
| `overlap_percent` | Number | 10 | 5–30 |
| `overlap_annotator_ids` | Multi-select (exactly 2) | — | 2 user role ANN, khác nhau |
| `iaa_metric` | Read-only text | Krippendorff's Alpha | — |

#### Helper text

- "Admin chọn thủ công 2 annotator; hệ thống random task trong batch để overlap."
- Bảng ngưỡng: ≥0.75 Tốt · 0.60–0.74 Monitor · <0.60 Flag

#### Actions

| Action | Kết quả |
|---|---|
| Lưu | Validate → API save → toast success |
| Hủy | Revert form |

---

## 8b. Màn hình 12 — Project IAA Report

**URL:** `/projects/:id/iaa`  
**Vai trò:** ADMIN, QA (read-only)

#### Mô tả

Hiển thị kết quả tính Krippendorff's Alpha sau khi các overlap task hoàn thành. Toàn bộ màn hình là read-only — không có action chỉnh sửa score.

#### Layout wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ IAA Report — Vivipedia                   [Batch ▼] [Export] │
├──────────────────────────────────────────────────────────────┤
│ Metric: Krippendorff's Alpha · Overlap: 10% · 18 task       │
├──────────────────────────────────────────────────────────────┤
│ Cặp annotator   │ SF   │ SC   │ NH   │ SQ  │ REL │ COMP │ Σ │
├─────────────────┼──────┼──────┼──────┼─────┼─────┼──────┼───┤
│ Ann A ↔ Ann B   │ 0.81 │ 0.74 │ 0.79 │0.82 │0.76 │ 0.70 │🟡 │
│ Ann A ↔ Ann C   │ 0.68 │ 0.61 │ 0.72 │0.65 │0.70 │ 0.55 │🔴 │
└─────────────────┴──────┴──────┴──────┴─────┴─────┴──────┴───┘
│ Legend: 🟢 ≥0.75 Tốt · 🟡 0.60–0.74 Monitor · 🔴 <0.60 Flag │
└──────────────────────────────────────────────────────────────┘
```

#### Components

| Component | Mô tả |
|---|---|
| Filter bar | Batch dropdown; date range (tùy chọn) |
| Summary row | Tổng số task overlap, metric dùng, % overlap thực tế |
| Score table | Mỗi row = 1 cặp annotator; cột = 6 dimension + composite |
| Color coding | 🟢 ≥0.75 / 🟡 0.60–0.74 / 🔴 <0.60 (theo B-01 threshold) |
| Flag badge | Annotator có composite < 0.60 → badge "Cần review" |
| Empty state | "Chưa có overlap task hoàn thành" nếu chưa có data |

#### States

| State | UI |
|---|---|
| Loading | Skeleton table |
| No overlap data | Empty state + hướng dẫn cấu hình IAA Settings |
| Has data | Bảng score + color coding |
| Annotator flagged | Row highlight đỏ nhạt + badge "Cần review" |

#### Validation / AC

- [ ] Chỉ hiển thị cặp annotator có ít nhất 1 overlap task đã approved
- [ ] Score làm tròn 2 chữ số thập phân
- [ ] Color coding đúng ngưỡng 0.60 / 0.75
- [ ] Annotator composite < 0.60 → badge xuất hiện
- [ ] Filter theo batch cập nhật bảng không reload trang

#### data-testid

| Element | data-testid |
|---|---|
| Page container | `iaa-report-page` |
| Batch filter | `iaa-report-batch-filter` |
| Score table | `iaa-report-table` |
| Flag badge | `iaa-flag-badge` |
| Empty state | `iaa-report-empty` |

---

## 9. Cập nhật QA Review Workspace (delta Sprint 3)

**URL:** `/qa/:id/review` — spec gốc `03_Screen_Specification.md` §4  

### Thêm vào QA actions

| Action | Điều kiện | Modal |
|---|---|---|
| `Escalate Dispute` | Sau return lần 2 | §3 màn hình 6 |

### Thêm hiển thị

- Badge `Return count` trên header task
- Link "Xem dispute" nếu task đã `Disputed`

---

## 10. Traceability PRD

| PRD section | Màn hình spec |
|---|---|
| §14.4 Notification | §2 (10 types đầy đủ) |
| §8.3 Dispute | §3, §4, §5 |
| §13.3 QA Dispute action | §3, §9 |
| §19 Export | §6, §7 |
| §7.4 IAA (settings) | §8 |
| §7.4 IAA (report/dashboard) | §8b |
| Sprint 3 B-01–B-05 | Toàn doc |

---

## 11. Checklist handoff Tuyết — Sprint 3

| Nhiệm vụ (Sprint_3_Scope) | Deliverable | Trạng thái |
|---|---|---|
| Notification Center UI flow | §2 + `05_Sprint3` §3 | ✅ |
| Notification copy templates đầy đủ 10 types | §2.2 (bổ sung `guideline_published`, `llm_job_done/failed`) | ✅ |
| Dispute UI + wireframe | §3–§5 + ASCII wireframes | ✅ |
| Update IA `/notifications`, `/disputes` | `01_Information_Architecture.md` v3.0 | ✅ |
| Export Consolidated filter + download | §6–§7 + `05_Sprint3` §6 | ✅ |
| data-testid Export screens | §6, §7 (bổ sung) | ✅ |
| IAA Settings screen spec | §8 | ✅ |
| IAA Report screen spec | §8b (bổ sung) | ✅ |

---

*Tài liệu nội bộ VSF — Sprint 3 Screen Spec — Owner: Nguyễn Thị Tuyết · Cập nhật lần cuối: 23/06/2026*
