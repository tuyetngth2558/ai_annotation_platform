# 10. Data Dictionary — Sprint 3 Extensions (Notification · IAA · Dispute · Export)

**Owner:** Phạm Đan Kha
**Phiên bản:** v0.2 (Sprint 3 draft)
**Trạng thái:** Draft — Tuần 1
**Bổ sung cho:** `docs/03_ba/dan/06_Data_Dictionary.md` (Sprint 1–2 v0.6). Không đụng entity cũ.

---

## 6.1 NOTIFICATION

| Field | Type | Required | Notes |
|---|---|---:|---|
| `notification_id` | uuid | Yes | Primary key |
| `user_id` | uuid | Yes | FK → `USER_ACCOUNT` |
| `project_id` | uuid | No | FK → `PROJECT`; null nếu system-wide (vd rubric publish) |
| `type` | enum | Yes | Xem §6.1.a |
| `title` | string | Yes | ≤120 ký tự; hiển thị ở badge/header |
| `body` | text | No | ≤500 ký tự; chi tiết ngắn |
| `payload_json` | json | No | Dữ liệu click-through (vd `{"claim_id":"..."}`, `{"batch_id":"..."}`) |
| `entity_type` | string | No | vd `claim_task` / `pdf_bundle` / `dispute` |
| `entity_id` | uuid | No | ID entity gắn với notification |
| `is_read` | boolean | Yes | Default `false` |
| `read_at` | datetime | No | Set khi `is_read = true` |
| `created_at` | datetime | Yes | ISO datetime |

### 6.1.a `type` enum

| Value | Trigger |
|---|---|
| `task_assigned` | Annotator được gán task mới |
| `task_returned` | QA Return cho annotator |
| `dispute_created` | QA flag dispute → notify QA + (Policy/Admin) |
| `dispute_resolved` | Resolve xong → notify QA + Annotator + (Policy) |
| `llm_pre_scoring_done` | Admin notified |
| `llm_pre_scoring_failed` | Admin notified, có link retry |
| `rubric_published` | Annotator của project được notify |
| `export_done` | Người tạo export |
| `sla_approaching` | Còn 24h tới deadline task |
| `dispute_overdue` | Quá 5 ngày SLA, Admin cờ đỏ |

### Index đề xuất
- `(user_id, is_read, created_at DESC)` — query inbox/list
- `(user_id, created_at DESC)` — query "tất cả"
- `(created_at)` — cleanup cron: giữ `unread` 90 ngày, `read` 30 ngày

---

## 6.2 DISPUTE

| Field | Type | Required | Notes |
|---|---|---:|---|
| `dispute_id` | uuid | Yes | Primary key |
| `claim_id` | uuid | Yes | FK → `CLAIM_TASK` |
| `submission_id` | uuid | No | FK → `ANNOTATION_SUBMISSION` (submission bị contest) |
| `qa_review_id` | uuid | No | FK → `QA_REVIEW` (review từ chối resubmit) |
| `flagged_by` | uuid | Yes | FK → `USER_ACCOUNT` (thường là QA) |
| `project_id` | uuid | Yes | FK → `PROJECT` (denormalized for query) |
| `reason` | enum | Yes | Xem §6.2.b — 5 options (kế thừa `QA_REVIEW.error_category` + bổ sung dispute-specific) |
| `status` | enum | Yes | Xem §6.2.a |
| `resolved_by` | uuid | No | FK → `USER_ACCOUNT` (Policy/Admin) |
| `resolution_decision` | enum | No | `approved` / `re_annotation_required` |
| `resolution_note` | text | No | Lý do resolve |
| `policy_note` | text | No | Note guideline update nếu có (link `RUBRIC_VERSION`) |
| `flagged_at` | datetime | Yes | ISO datetime |
| `resolved_at` | datetime | No | Set khi status chuyển `dispute_resolved_*` |
| `sla_due_at` | datetime | Yes | `flagged_at + 5 ngày làm việc` — đã tính sẵn |
| `overdue_at` | datetime | No | Set khi quá `sla_due_at` |

### 6.2.a `status` enum

| Value | Ý nghĩa |
|---|---|
| `disputed` | QA vừa flag |
| `dispute_in_review` | Admin/Policy đang xử lý |
| `dispute_resolved_approved` | Chấp nhận output ban đầu |
| `dispute_resolved_re_annotation` | Yêu cầu làm lại |
| `dispute_overdue` | Quá SLA (auto-flag) |

### 6.2.b `reason` enum (quyết định C01 — chốt 23/06/2026)

| Value | Ý nghĩa | Kế thừa từ |
|---|---|---|
| `guideline_unclear` | Guideline không rõ | QA_REVIEW.error_category |
| `unresolved_score_disagreement` | Bất đồng điểm số không giải quyết được | QA_REVIEW.error_category |
| `extraction_mapping_error` | Lỗi extraction / mapping | QA_REVIEW.error_category |
| `repeated_error_pattern` | Pattern lỗi lặp lại | Bổ sung dispute-specific |
| `other` | Khác (cần mô tả chi tiết) | Bổ sung dispute-specific |

> **Ghi chú**: Value `other` phải kèm theo `dispute_description` ≥ 20 ký tự.


### Index đề xuất
- `(project_id, status, sla_due_at)` — Quality Gate dashboard
- `(claim_id)` — 1 claim có thể nhiều dispute theo thời gian (lịch sử)
- `(status, sla_due_at)` — cron quét overdue

### Immutable (DEC-S3 + B-02 + BR-10.1 mở rộng)
- INSERT-only sau khi tạo — không UPDATE/DELETE ngoại trừ 2 state transition được phép: `disputed → dispute_in_review`, `dispute_in_review → dispute_resolved_*`. Mọi transition phải INSERT 1 notification kèm và 1 audit_log kèm.
- Gắn DB trigger `REVOKE UPDATE, DELETE` (giống audit_log) — detail ở artifact #12 validation.

---

## 6.3 IAA_OVERLAP_ASSIGN

| Field | Type | Required | Notes |
|---|---|---:|---|
| `overlap_id` | uuid | Yes | Primary key |
| `project_id` | uuid | Yes | FK → `PROJECT` |
| `claim_id` | uuid | Yes | FK → `CLAIM_TASK` |
| `annotator_id` | uuid | Yes | FK → `USER_ACCOUNT` |
| `rubric_dimension` | enum | Yes | `sf` / `sc` / `hr` / `sq` / `rel` / `comp` / `composite` |
| `assigned_at` | datetime | Yes | ISO datetime |

### Ràng buộc
- UNIQUE `(claim_id, annotator_id, rubric_dimension)`: 1 annotator chỉ được gán 1 lần cho cùng (claim, dim).
- 1 claim có ≥2 annotator ở cùng dim để IAA có ý nghĩa (DEC-S3-01).

### Index
- `(project_id, rubric_dimension, assigned_at DESC)`
- `(claim_id)`

---

## 6.4 IAA_SCORE

| Field | Type | Required | Notes |
|---|---|---:|---|
| `iaa_score_id` | uuid | Yes | Primary key |
| `project_id` | uuid | Yes | FK → `PROJECT` |
| `scope_type` | enum | Yes | Xem §6.4.a |
| `scope_id` | uuid | Yes | ID tương ứng scope_type (vd project_id khi scope=project; pair_key khi scope=pair — DEC) |
| `annotator_a_id` | uuid | No | FK → `USER_ACCOUNT` |
| `annotator_b_id` | uuid | No | FK → `USER_ACCOUNT` |
| `rubric_dimension` | enum | Yes | `sf` / `sc` / `hr` / `sq` / `rel` / `comp` / `composite` |
| `score` | decimal | Yes | 0.00–1.00 |
| `metric_used` | string | Yes | `krippendorff_alpha` (default — DEC-S3-01) |
| `period_start` | datetime | Yes | ISO datetime |
| `period_end` | datetime | Yes | ISO datetime |
| `computed_at` | datetime | Yes | ISO datetime |

### 6.4.a `scope_type` enum

| Value | Ý nghĩa |
|---|---|
| `project` | IAA tổng của cả project (mặc định) |
| `pair` | IAA giữa 2 annotator (floor chart) |
| `annotator` | IAA của 1 annotator vs đa annotator khác |
| `dimension` | IAA theo 1 dim cụ thể (cross-project) |

### Ràng buộc
- `score` ∈ [0.00, 1.00], tối đa 4 chữ số th thập phân (Alpha thường 3).
- `period_end > period_start`.
- Threshold mặc định (xem SPEC): ≥0.75 tốt, 0.60–0.74 monitor, <0.60 flag — cấu hình per project (qua `PROJECT` settings nếu Sprint 4 mở rộng).

### Index
- `(project_id, scope_type, rubric_dimension, computed_at DESC)`
- `(annotator_a_id, annotator_b_id)`

---

## 6.5 EXPORT_CONSOLIDATED_REQUEST

| Field | Type | Required | Notes |
|---|---|---:|---|
| `export_id` | uuid | Yes | Primary key |
| `project_id` | uuid | Yes | FK → `PROJECT` |
| `requested_by` | uuid | Yes | FK → `USER_ACCOUNT` (Admin hoặc QA trong project) |
| `filter_json` | json | Yes | Bộ filter: batch_id, date_from, date_to, status, dispute_status, score_band, rubric_version... |
| `status` | enum | Yes | `queued` / `running` / `done` / `failed` |
| `storage_path` | string | No | MinIO/S3 path tới file XLSX (nullable tới khi done) |
| `requested_at` | datetime | Yes | ISO datetime |
| `completed_at` | datetime | No | Set khi done/failed |
| `row_count_summary` | integer | No | Tổng row summary sheet để verify nhanh |
| `error_detail` | text | No | Lý do fail (nếu có) |

### Ràng buộc
- RBAC: chỉ Admin (toàn project) hoặc QA trong project đó được tạo.
- File XLSX có 6 sheet — schema chi tiết ở artifact #11.
- Khi `status = done`: `storage_path` và `completed_at` bắt buộc.
- Khi `status = failed`: `error_detail` và `completed_at` bắt buộc.

### Index
- `(project_id, requested_at DESC)`
- `(status, requested_at)` — cron cleanup file XLSX cũ (vd >30 ngày)

---

## 7. Quan hệ tham chiếu chéo

Tham chiếu ngược entity Sprint 1–2:

| Entity mới | Liên kết tới | Ghi chú |
|---|---|---|
| NOTIFICATION | `USER_ACCOUNT`, `PROJECT` (optional) | Không đụng sprint cũ |
| DISPUTE | `CLAIM_TASK`, `ANNOTATION_SUBMISSION`, `QA_REVIEW`, `USER_ACCOUNT`, `PROJECT` | Không thêm cột vào entity cũ |
| IAA_OVERLAP_ASSIGN | `CLAIM_TASK`, `USER_ACCOUNT`, `PROJECT` | Mapping riêng |
| IAA_SCORE | `USER_ACCOUNT`, `PROJECT` | Computed data |
| EXPORT_CONSOLIDATED_REQUEST | `PROJECT`, `USER_ACCOUNT` | Async job tracking |

---

## 8. ✅ Đã chốt (C01–C03 — 23/06/2026)

| ID | Quyết định | Chi tiết |
|---|---|---|
| **C01** | `DISPUTE.reason` enum | 5 options: `guideline_unclear`, `unresolved_score_disagreement`, `extraction_mapping_error`, `repeated_error_pattern`, `other` |
| **C02** | Dispute gate logic | Tối đa 3 lần return/resubmit trước khi escalate (align `05_Sprint3_Screen_Flow_Extensions.md` §4.1) |
| **C03** | Notification cleanup | `unread` giữ 90 ngày, `read` giữ 30 ngày (cron auto-cleanup) |

## 9. Mở / chưa chốt (cần BA/Dev xác nhận)

- `NOTIFICATION.type` đã liệt kê — cần BA Tuyết xác nhận đủ trigger (B-?).
  - *Lưu ý*: Có sự lệch tên sự kiện export giữa DB enum (`export_done` ở DD §6.1.a) và Screen Flow của Tuyết (`export_ready` ở `05_Sprint3_Screen_Flow_Extensions.md` §3.2). Đề xuất thống nhất tên gọi.
- `IAA_SCORE.scope_type` & `scope_id`: cần chốt cụ thể query shape (B-01).
- `EXPORT_CONSOLIDATED_REQUEST.filter_json` keys: cần đồng bộ với UI filter screen (Tuyết) và API spec (Khải tuần 1).



## 10. Version History

| Version | Date | Author | Changes |
|---|---|---|---|
| v0.1 | 2026-06-23 | Phạm Đan Kha | Initial draft: NOTIFICATION, DISPUTE, IAA_OVERLAP_ASSIGN, IAA_SCORE, EXPORT_CONSOLIDATED_REQUEST |
| v0.2 | 2026-06-24 | Phạm Đan Kha | Thêm C01–C03 đã chốt; bổ sung version history & cross-ref footer |

## 11. Cross-reference Index

| Artifact # | File | Áp dụng cho |
|---|---|---|
| #09 | `09_Sprint3_ERD_Extensions.md` | ERD entity list, FK map, DB constraint DDL |
| #10 | File này | Field-level definition, enum, index |
| #11 | `11_Sprint3_Export_Schema_Consolidated.md` | 6 sheet XLSX schema, derived field rules |
| #12 | `12_Sprint3_Validation_Rules_Dispute.md` | VR cho dispute/notif/iaa/export/QG, error codes |
| #13 | `13_Sprint3_Edge_Cases.md` | Edge case log 4 module + cross-feature |
| #14 | `14_Sprint3_Notification_API_Spec.md` | API spec Notification Center |
| Sprint 1–2 ref | `06_Data_Dictionary.md` | Entity Sprint 1–2 (không đụng) |
