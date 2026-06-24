# 12. Validation Rules — Sprint 3 (Dispute Record, Notification, IAA, Export Consolidated)

**Owner:** Phạm Đan Kha
**Phiên bản:** v0.1 (Sprint 3 draft)
**Trạng thái:** Draft — Tuần 2
**Bổ sung cho:** `docs/03_ba/dan/03_Validation_Rules.md` (Sprint 1–2 v0.6). Đánh số tiếp VR-…

---

## 1. Dispute Record Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|:---:|---|
| VR-DISP-001 | Tạo dispute | Chỉ QA (`role = "qa"`) được phép tạo | Yes | Only QA can create a dispute |
| VR-DISP-002 | Tạo dispute | `DISPUTE.claim_id` phải tồn tại và thuộc project | Yes | Claim not found in project |
| VR-DISP-003 | Tạo dispute | `claim_id` phải có ít nhất 1 `QA_REVIEW.decision = "returned"` và 1 `ANNOTATION_SUBMISSION` resubmit gần nhất. **Tối đa 3 lần return/resubmit** (align `05_Sprint3_Screen_Flow_Extensions.md` §4.1) | Yes | Dispute precondition not met (need return + resubmit, max 3 cycles) |
| VR-DISP-004 | Tạo dispute | `reason` phải thuộc enum §6.2.b (`10_Data_Dictionary.md`); nếu `other` thì `dispute_description` ≥ 20 ký tự | Yes | Invalid dispute reason or description too short |
| VR-DISP-005 | Tạo dispute | Trước khi tạo, chưa có `DISPUTE` `status` active khác cho cùng `claim_id` (tránh double-flag) | Yes | An active dispute already exists for this claim |
| VR-DISP-006 | Tạo dispute (admin override) | Nếu Admin override qua điều kiện (VR-DISP-003) thì phải có `audit_log.reason` text ≥ 10 ký tự | Yes | Override requires recorded reason |
| VR-DISP-007 | Resolve | Chỉ Admin (`resolved_by.role = "admin"`) trong MVP (DEC-S3-02/06) | Yes | Only Admin can resolve disputes (Policy role later) |
| VR-DISP-008 | Resolve | `resolution_decision` ∈ {`approved`, `re_annotation_required`} | Yes | Invalid resolution decision |
| VR-DISP-009 | Resolve | `resolution_note` không rỗng; trim dài ≥ 10 ký tự | Yes | Resolution note must be at least 10 characters |
| VR-DISP-010 | Resolve | `resolved_at` set = now() cùng transaction | Yes | resolved_at required |
| VR-DISP-011 | Trạng thái | Transition được phép: `disputed → dispute_in_review`, `disputed → dispute_overdue` (auto), `dispute_in_review → dispute_resolved_*`, `dispute_in_review → dispute_overdue` (auto). KHÔNG transition khác. | Yes | Invalid status transition |
| VR-DISP-012 | Auto-overdue | Cron job set `status = dispute_overdue` khi `now() > sla_due_at` và chưa resolve | No (system) | Auto-flip overdue; thông báo Admin |
| VR-DISP-013 | SLA | `sla_due_at = flagged_at + 5 ngày làm việc` (tính sẵn khi tạo) | Yes | SLA must be configured at creation |
| VR-DISP-014 | Immutable | Sau khi tạo, MỌI column không được UPDATE/DELETE (DB-level revoke) ngoại trừ `status` qua 2 transition được phép ở VR-DISP-011 và `resolved_at`/`resolved_by` set khi resolve (audit_log kèm) | Yes | Dispute record is immutable |
| VR-DISP-015 | Audit | Mọi state transition phải INSERT 1 `AUDIT_LOG` row (action_type=`dispute_create` hoặc `dispute_resolve`) | Yes | Dispute transition must be audited |

## 2. Notification Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|:---:|---|
| VR-NOTIF-001 | Tạo | `user_id` phải tồn tại, role active | Yes | Recipient inactive |
| VR-NOTIF-002 | Tạo | `type` phải thuộc enum §6.1.a của `10_…_Data_Dictionary.md` | Yes | Invalid notification type |
| VR-NOTIF-003 | Tạo | `title` không rỗng; ≤ 120 ký tự | Yes | Title required / too long |
| VR-NOTIF-004 | Tạo | `body` nếu có: ≤ 500 ký tự | Yes | Body too long |
| VR-NOTIF-005 | Tạo | Một trigger nghiệp vụ tạo CHÍNH XÁC 1 notification per recipient (idempotent qua UNIQUE constraint vd `(user_id, entity_type, entity_id, type)`) | No (warning) | Duplicate notification suppressed |
| VR-NOTIF-006 | Mark read | Chỉ user sở hữu (`user_id = current_user`) mới được set `is_read=true` | Yes | Not your notification |
| VR-NOTIF-007 | Mark read | `read_at` set = now() cùng transaction khi `is_read=true` | No (default) | Read timestamp missing |
| VR-NOTIF-008 | Batch delete | User có thể xóa notification của mình (cleanup client-side) | No | OK |
| VR-NOTIF-009 | Retention | Cron cleanup xóa `unread` sau 90 ngày, `read` sau 30 ngày | No | Auto-cleanup per retention policy (C03) |
| VR-NOTIF-010 | Trigger link | Nếu notification là `task_assigned` → `entity_type = claim_task`, `entity_id = claim_id`. Nếu `dispute_resolved` → `entity_type=dispute`. Tương tự cho các type khác theo bảng §6.1.a | Yes | Notification payload mismatch |

## 3. IAA Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|:---:|---|
| VR-IAA-001 | Overlap assign | 1 `claim_id` phải có ≥2 `IAA_OVERLAP_ASSIGN.annotator_id` ở cùng `rubric_dimension` trước khi tính IAA dim đó | Yes | Need at least 2 annotators for IAA |
| VR-IAA-002 | Overlap assign | Mỗi annotator phải có role `annotator` trong project (USER_PROJECT_ROLE) | Yes | Non-annotator in overlap |
| VR-IAA-003 | Overlap assign | Annotator không được trùng chính mình ở 2 row cùng `(claim_id, rubric_dimension)` | Yes | Duplicate annotator in overlap |
| VR-IAA-004 | Compute | Chỉ compute khi tất cả annotator trong overlap đều có `ANNOTATION_SUBMISSION.status = submitted` (final, không draft) cho cùng `claim_id` | Yes | Annotator still in draft |
| VR-IAA-005 | Compute | Metric default `krippendorff_alpha` (DEC-S3-01); `score` ∈ [0.00, 1.00] | Yes | Invalid metric score |
| VR-IAA-006 | Compute | `period_start < period_end`; `computed_at ≥ period_end` | Yes | Invalid IAA period |
| VR-IAA-007 | Compute (re-trigger) | Nếu có submission mới không thay đổi overlap → không recompute (idempotent cho cùng `period_end`) | No | Skipped recompute |
| VR-IAA-008 | Read | `GET /projects/:id/iaa` mặc định trả về scope_type=`project`, rubric_dimension=`composite`; có thể query per dimension | No | Filter param validation |
| VR-IAA-009 | RBAC | Annotator xem `GetSelfIa` chỉ của mình; Admin/QA xem toàn project | Yes | RBAC on IAA read |
| VR-IAA-010 | Thresholds (Quality Gate) | Mặc định thresholds: `action_required = "flag"` khi `score < 0.60`; `monitor` 0.60–0.74; `ok` ≥ 0.75 — thresholds cấu hình per project | No | Threshold configurable per project (Post-Sprint 3) |

## 4. Export Consolidated Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|:---:|---|
| VR-EXP-CONS-001 | Request | Chỉ Admin hoặc QA trong project được tạo request | Yes | RBAC on request creation |
| VR-EXP-CONS-002 | Request | `filter_json` phải parse được; nếu khóa date_from/date_to → `date_from ≤ date_to` | Yes | Invalid filter |
| VR-EXP-CONS-003 | Build job | Build XLSX qua task async (ARQ), không chặn request | No | Async build |
| VR-EXP-CONS-004 | Build success | File phải có đủ 6 sheet đúng tên PascalCase (xem `11_…_Export_Schema_Consolidated.md` §2) | Yes | Missing/invalid sheet |
| VR-EXP-CONS-005 | Build success | Mỗi sheet có header row đúng schema §3–§8; số cột khớp spec | Yes | Header mismatch |
| VR-EXP-CONS-006 | Encoding | Workbook có UTF-8 BOM (file-level metadata), mở Excel tiếng Việt OK | Yes | Encoding missing |
| VR-EXP-CONS-007 | Empty dataset | Project không có data claim/annotation đáp ứng filter → file vẫn build với header-only; phải có 1 dòng warning ở Summary | No | Header-only export with warning |
| VR-EXP-CONS-008 | Storage | File build xong lưu MinIO/S3 qua `FileStorage`; set `storage_path`, `row_count_summary`, `completed_at` | Yes | Storage path required when done |
| VR-EXP-CONS-009 | Failure | Build fail → set `status=failed`, `error_detail` (≥ 1 dòng mô tả), `completed_at` | Yes | Failure record incomplete |
| VR-EXP-CONS-010 | Download | Link download có TTL (vd 1 giờ presigned URL), RBAC check user đã tạo hoặc Admin | Yes | Presigned URL required and RBAC enforced |
| VR-EXP-CONS-011 | Audit | Mỗi request `EXPORT_CONSOLIDATED_REQUEST` insert 1 audit_log khi tạo + 1 khi hoàn tất | No | Audit companion |

## 5. Quality Gate Cross-feature Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|:---:|---|
| VR-QG-001 | Quality Gate dashboard | `dispute_rate = (claims có ≥1 dispute) / (total claims)`; > 5% → flag | No (Warning) | Quality Gate flag triggered |
| VR-QG-002 | Quality Gate dashboard | Admin có quyền "pause" project khi QG flag | No (action) | Project paused (status='paused') |
| VR-QG-003 | Quality Gate dashboard | IAA flag (score < 0.60) hiển thị annotator nào trong ngưỡng xấu → admin/QA đề xuất retrain | No (action) | Retrain suggestion |
| VR-QG-004 | Quality Gate dashboard | Notification tạo cho Admin khi Quality Gate flag flipped on/off | No | Notify Admin |

---

## 6. Lưu ý mapping với validation đã có (Sprint 1–2)

- Không đụng VR-UP/PARSE/SRC/MAP/CE/LLM/ANN/ART/QA/EXP/FETCH cũ.
- VR-QA-002/003/004/005 (Sprint 1–2) giữ nguyên — dispute flow là **luồng ngoài** của QA Return.
- BR-10.1 (audit_log immutable) mở rộng áp dụng cho `DISPUTE` tương tự (xem VR-DISP-014 — phải có cơ chế DB tương đương).

---

## 7. ✅ Đã chốt (C01–C03 — 23/06/2026)

| ID | Quyết định | Chi tiết |
|---|---|---|
| **C01** | `DISPUTE.reason` enum | 5 options chuẩn (align `10_Data_Dictionary.md` §6.2.b) |
| **C02** | Dispute gate logic | Tối đa 3 lần return/resubmit trước khi escalate |
| **C03** | Notification cleanup | `unread` 90 ngày, `read` 30 ngày (align `10_Data_Dictionary.md`) |

## 8. Mở / chưa chốt


## 9. Error Code & HTTP Status Mapping (machine-readable)

Các error code dưới đây dùng cho API response `error_code` field và `Problem Details (RFC 7807)` type URI. Backend nên map 1-1 với VR rule để client parse được.

### 9.1 Dispute

| Rule ID | Error Code | HTTP Status | Type URI |
|---|---|---|---|
| VR-DISP-001 | `DISPUTE_ROLE_INVALID` | 403 | `/errors/dispute/role-invalid` |
| VR-DISP-002 | `DISPUTE_CLAIM_NOT_FOUND` | 404 | `/errors/dispute/claim-not-found` |
| VR-DISP-003 | `DISPUTE_PRECONDITION_FAILED` | 422 | `/errors/dispute/precondition-failed` |
| VR-DISP-004 | `DISPUTE_REASON_INVALID` | 422 | `/errors/dispute/reason-invalid` |
| VR-DISP-005 | `DISPUTE_DUPLICATE_ACTIVE` | 409 | `/errors/dispute/duplicate-active` |
| VR-DISP-006 | `DISPUTE_OVERRIDE_REASON_REQUIRED` | 422 | `/errors/dispute/override-reason-required` |
| VR-DISP-007 | `DISPUTE_RESOLVE_ROLE_INVALID` | 403 | `/errors/dispute/resolve-role-invalid` |
| VR-DISP-008 | `DISPUTE_RESOLUTION_DECISION_INVALID` | 422 | `/errors/dispute/resolution-decision-invalid` |
| VR-DISP-009 | `DISPUTE_RESOLUTION_NOTE_REQUIRED` | 422 | `/errors/dispute/resolution-note-required` |
| VR-DISP-010 | `DISPUTE_RESOLVED_AT_REQUIRED` | 422 | `/errors/dispute/resolved-at-required` |
| VR-DISP-011 | `DISPUTE_STATUS_TRANSITION_INVALID` | 409 | `/errors/dispute/status-transition-invalid` |
| VR-DISP-012 | `DISPUTE_SLA_EXCEEDED` | 200 | `/errors/dispute/sla-exceeded` |
| VR-DISP-013 | `DISPUTE_SLA_MISSING` | 422 | `/errors/dispute/sla-missing` |
| VR-DISP-014 | `DISPUTE_IMMUTABLE` | 403 | `/errors/dispute/immutable` |
| VR-DISP-015 | `DISPUTE_AUDIT_MISSING` | 500 | `/errors/internal/audit-missing` |

### 9.2 Notification

| Rule ID | Error Code | HTTP Status |
|---|---|---|
| VR-NOTIF-001 | `NOTIF_RECIPIENT_INACTIVE` | 422 |
| VR-NOTIF-002 | `NOTIF_TYPE_INVALID` | 422 |
| VR-NOTIF-003 | `NOTIF_TITLE_INVALID` | 422 |
| VR-NOTIF-004 | `NOTIF_BODY_TOO_LONG` | 422 |
| VR-NOTIF-005 | `NOTIF_DUPLICATE` | 200 |
| VR-NOTIF-006 | `NOTIF_NOT_YOURS` | 403 |
| VR-NOTIF-007 | `NOTIF_READ_TIMESTAMP_INVALID` | 422 |
| VR-NOTIF-008 | `NOTIF_DELETE_OK` | 204 |
| VR-NOTIF-009 | `NOTIF_CLEANUP_CRON` | n/a |
| VR-NOTIF-010 | `NOTIF_PAYLOAD_MISMATCH` | 422 |

### 9.3 IAA

| Rule ID | Error Code | HTTP Status |
|---|---|---|
| VR-IAA-001 | `IAA_INSUFFICIENT_ANNOTATORS` | 422 |
| VR-IAA-002 | `IAA_NON_ANNOTATOR_IN_OVERLAP` | 422 |
| VR-IAA-003 | `IAA_DUPLICATE_OVERLAP` | 409 |
| VR-IAA-004 | `IAA_DRAFT_STILL_OPEN` | 422 |
| VR-IAA-005 | `IAA_INVALID_METRIC` | 422 |
| VR-IAA-006 | `IAA_INVALID_PERIOD` | 422 |
| VR-IAA-007 | `IAA_SKIPPED_RECOMPUTE` | 200 |
| VR-IAA-008 | `IAA_QUERY_PARAM_INVALID` | 422 |
| VR-IAA-009 | `IAA_RBAC_DENIED` | 403 |
| VR-IAA-010 | `IAA_THRESHOLD_FLAG` | 200 |

### 9.4 Export Consolidated

| Rule ID | Error Code | HTTP Status |
|---|---|---|
| VR-EXP-CONS-001 | `EXPORT_RBAC_DENIED` | 403 |
| VR-EXP-CONS-002 | `EXPORT_FILTER_INVALID` | 422 |
| VR-EXP-CONS-003 | `EXPORT_ASYNC_QUEUED` | 202 |
| VR-EXP-CONS-004 | `EXPORT_SHEET_MISSING` | 500 |
| VR-EXP-CONS-005 | `EXPORT_HEADER_MISMATCH` | 500 |
| VR-EXP-CONS-006 | `EXPORT_ENCODING_MISSING` | 500 |
| VR-EXP-CONS-007 | `EXPORT_EMPTY_DATASET` | 200 |
| VR-EXP-CONS-008 | `EXPORT_STORAGE_REQUIRED` | 500 |
| VR-EXP-CONS-009 | `EXPORT_BUILD_FAILED` | 500 |
| VR-EXP-CONS-010 | `EXPORT_PRESIGNED_URL_REQUIRED` | 403 |
| VR-EXP-CONS-011 | `EXPORT_AUDIT_MISSING` | 500 |

### 9.5 Quality Gate

| Rule ID | Error Code | HTTP Status |
|---|---|---|
| VR-QG-001 | `QG_DISPUTE_RATE_HIGH` | 200 |
| VR-QG-002 | `QG_PROJECT_PAUSED` | 200 |
| VR-QG-003 | `QG_ANNOTATOR_FLAGGED` | 200 |
| VR-QG-004 | `QG_ADMIN_NOTIFIED` | 200 |

> **Ghi chú:** Backend nên map các error code này vào response body theo format: `{"error_code": "...", "message": "...", "details": {...}}`. Client FE parse `error_code` để hiển thị message đã i18n thay vì hardcode message tiếng Anh.


## 10. DB Constraint Mapping (đối chiếu với ERD #09 §9)

Mỗi VR blocking (Yes) nên có DB-level constraint tương ứng để chống race condition/bug ở app layer:

| VR Rule | DB Constraint Type | DDL gợi ý |
|---|---|---|
| VR-DISP-004 | CHECK | `CHECK (reason IN (...))` |
| VR-DISP-005 | Partial UNIQUE INDEX | `CREATE UNIQUE INDEX ... WHERE status NOT IN (...)` |
| VR-DISP-008 | CHECK | `CHECK (resolution_decision IS NULL OR resolution_decision IN (...))` |
| VR-DISP-011 | CHECK + Trigger | `CHECK (status IN (...))` + trigger kiểm tra transition |
| VR-DISP-014 | Trigger REVOKE | `REVOKE UPDATE, DELETE ON dispute FROM app_role` |
| VR-NOTIF-002 | CHECK | `CHECK (type IN (...))` |
| VR-NOTIF-005 | UNIQUE | `UNIQUE (user_id, entity_type, entity_id, type)` |
| VR-IAA-003 | UNIQUE | `UNIQUE (claim_id, annotator_id, rubric_dimension)` |
| VR-IAA-005 | CHECK | `CHECK (score >= 0.00 AND score <= 1.00)` |
| VR-IAA-006 | CHECK | `CHECK (period_end > period_start)` |
| VR-IAA-008 | CHECK | `CHECK (scope_type IN ('project','pair','annotator','dimension'))` |
| VR-EXP-CONS-004 | App-level (verify at build) | Không DB constraint được (file XLSX verify sau build) |

> **Ghi chú:** Các VR `No (Warning)` như VR-QG-001..004 không cần DB constraint — chỉ cần application-level check + dashboard flag.

- Cron overdue & notification trigger: tech ownership (Backend/Khải) hay Build job (Tuấn Anh)?
- Thresholds IAA có cần cấu hình per project (VR-IAA-010) trong Sprint 3 hay hardcode mặc định + Sprint 4 mở rộng?
