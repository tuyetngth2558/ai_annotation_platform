# 11. Export Schema — Sprint 3 Consolidated Report

**Owner:** Phạm Đan Kha
**Phiên bản:** v0.1 (Sprint 3 draft)
**Trạng thái:** Draft — Tuần 1
**Quyết định chốt:** DEC-S3-03 — XLSX 6 sheet
**Mục tiêu:** 1 file XLSX duy nhất, chứa annotation result + QA review status + final approved output + dispute + IAA, phục vụ downstream.

---

## 1. Chung

- **Format:** `.xlsx` (không phải CSV — DEC-S3-03).
- **Encoding:** UTF-8 BOM (đặt file-level metadata) — đảm bảo Excel mở tiếng Việt đúng.
- **Mỗi cột có header mô tả rõ**, tránh viết tắt không giải thích — theo yêu cầu stakeholder từ Sprint 3 doc §2.4.
- **File build async** (qua `EXPORT_CONSOLIDATED_REQUEST.status = queued → running → done`) — xem ERD #09.
- **RBAC tạo export:** Admin (toàn project) hoặc QA trong project đó (DEC-S3-02 đã chốt QA export trong project của họ từ Sprint 1–2).
- **Filter mặc định:** chỉ lấy annotation final_status chấp nhận được (`Approved` hoặc `Dispute Resolved — Approved`). Không hard-block; cho phép admin filter rộng hơn.
- **Wrapper:** mỗi file export đặt trong MinIO/S3 qua `FileStorage` interface (xem `04-storage.md`); `EXPORT_CONSOLIDATED_REQUEST.storage_path` trỏ tới.

---

## 2. 6 sheet và quan hệ

| # | Sheet name | Mục đích | Số row (1 project, 10.000 claim) |
|---:|---|---|---:|
| 1 | `Summary` | Tổng quan dự án | 1 |
| 2 | `Claim Level` | Mỗi row = 1 claim đã approved/resolved-approved | ~10.000 |
| 3 | `Answer Level` | Mỗi row = 1 parent task (article) | ~500 |
| 4 | `QA Review Log` | Lịch sử mọi QA action per claim | ~20.000 |
| 5 | `Dispute Log` | Danh sách mọi dispute trong project | ~200 |
| 6 | `IAA Report` | IAA per dim × per scope (sheet-style pivot) | ~200 |

> Quy ước: tên sheet PascalCase với space (đúng Excel), cố định (không đổi) để downstream script pin theo tên.

---

## 3. Sheet 1 — `Summary`

| Column | Type | Source | Notes |
|---|---|---|---|
| `project_code` | string | `PROJECT.project_code` | vd `vivipedia` |
| `project_name` | string | `PROJECT.project_name` | Tên hiển thị |
| `project_id` | uuid | `PROJECT.project_id` | FK luôn có để reference |
| `rubric_version` | string | `RUBRIC_VERSION.version_name` | Phiên bản rubric áp dụng |
| `export_date` | datetime | generate | ISO datetime lúc build |
| `export_requested_by` | string | `USER_ACCOUNT.full_name` | Người yêu cầu |
| `total_parent_tasks` | integer | count `PARENT_TASK` | có trong `filter_json` |
| `total_claims` | integer | count `CLAIM_TASK` | |
| `approved_claims` | integer | `status = approved` | |
| `disputed_claims` | integer | có 1+ `DISPUTE` record | |
| `dispute_overdue_claims` | integer | `DISPUTE.status = dispute_overdue` | |
| `dispute_rate` | decimal | disputed_claims / total_claims | Cảnh báo nếu >5% |
| `quality_band_high` | integer | composite ≥ 0.80 | xem §7 |
| `quality_band_medium` | integer | 0.60–0.79 | |
| `quality_band_low` | integer | < 0.60 | |
| `iaa_composite_score` | decimal | `IAA_SCORE` (latest per project, composite) | một số |
| `iaa_computed_at` | datetime | theo `IAA_SCORE.computed_at` | |
| `rubric_dimensions_json` | json | `RUBRIC_VERSION.dimensions_json` | dạng chuỗi để downstream parse |

---

## 4. Sheet 2 — `Claim Level`

Mỗi row = 1 claim có final status = `approved` hoặc `dispute_resolved_approved`.

| Column | Type | Source | Notes |
|---|---|---|---|
| `claim_id` | uuid | `CLAIM_TASK.claim_id` | |
| `parent_task_id` | uuid | `PARENT_TASK.parent_task_id` | |
| `bundle_id` | uuid | `PDF_BUNDLE.bundle_id` | bắt buộc (trace requirement) |
| `article_code` | string | `PARENT_TASK.article_code` | |
| `article_title` | string | `PARENT_TASK.title` | |
| `domain` | string | `PARENT_TASK.domain` | |
| `subdomain` | string | `PARENT_TASK.subdomain` | |
| `tier` | string | `PARENT_TASK.tier` | |
| `answer_filename` | string | `PDF_FILE.original_filename` (file_role=answer_pdf) | |
| `source_ref_filename` | string | `PDF_FILE.original_filename` (file_role=source_ref_pdf) | |
| `claim_order` | integer | `CLAIM_TASK.claim_order` | |
| `section_name` | string | `CLAIM_TASK.section_name` | nullable |
| `claim_text` | text | `claim_text_final` ? `claim_text_original` : skip | fallback khi annotator không sửa |
| `citation_markers` | string | `CLAIM_TASK.citation_markers` | vd `[1];[3]` |
| `mapped_source_count` | integer | count `CLAIM_SOURCE_MAP` | |
| `mapped_source_orders` | string | `JOIN SOURCE_REFERENCE.source_order` | vd `1;3` |
| `mapped_source_titles` | string | `JOIN` | ngăn cách `;` |
| `mapped_source_urls` | string | `JOIN source_url` | ngăn cách `;` |
| `annotator_email` | string | `USER_ACCOUNT.email` (assigned_annotator_id) | |
| `llm_provider` | string | `LLM_PRE_SCORE.provider` | |
| `llm_model` | string | `LLM_PRE_SCORE.model` | |
| `pre_score_sf` | decimal | `LLM_PRE_SCORE.sf` | nếu có |
| `pre_score_sc` | decimal | `LLM_PRE_SCORE.sc` | |
| `pre_score_hr` | decimal | `LLM_PRE_SCORE.hr` | |
| `pre_score_sq` | decimal | `LLM_PRE_SCORE.sq` | |
| `pre_score_rel` | decimal | `LLM_PRE_SCORE.rel` | nullable |
| `pre_score_comp` | decimal | `LLM_PRE_SCORE.comp` | nullable |
| `pre_score_composite` | decimal | `LLM_PRE_SCORE.composite_score` | |
| `annotation_sf` | decimal | `ANNOTATION_SUBMISSION.sf` (final) | |
| `annotation_sc` | decimal | … | |
| `annotation_hr` | decimal | … | |
| `annotation_sq` | decimal | … | |
| `annotation_composite` | decimal | `ANNOTATION_SUBMISSION.composite_score` (final) | |
| `fact_check_status` | enum | `ANNOTATION_SUBMISSION.fact_check_status` | |
| `source_access_status` | enum | `ANNOTATION_SUBMISSION.source_access_status` | |
| `annotator_note` | text | `ANNOTATION_SUBMISSION.annotator_note` | optional |
| `qa_decision` | enum | `QA_REVIEW.decision` (latest non-pending) | `approved` / `returned` |
| `qa_final_decision` | derived | xem §6 | `approved` / `rejected` / `disputed` |
| `qa_approved_at` | datetime | `QA_REVIEW.reviewed_at` (decision=approved final) | |
| `dispute_id` | uuid | `DISPUTE.dispute_id` (nếu có resolved) | nullable |
| `dispute_status` | enum | `DISPUTE.status` | nullable |
| `dispute_resolution` | enum | `DISPUTE.resolution_decision` | nullable |
| `final_recommendation` | enum | xem §7 | `ACCEPTED` / `NEEDS_REVISION` / `REJECTED` |
| `quality_band` | enum | xem §7 | `HIGH` / `MEDIUM` / `LOW` |
| `submitted_at` | datetime | `ANNOTATION_SUBMISSION.submitted_at` (final) | |
| `approved_at` | datetime | xem `qa_approved_at` | |

> **Trường `qa_final_decision` và `final_recommendation`** (xem §7) — quy tắc tính chuẩn hóa để downstream không tự suy.

---

## 5. Sheet 3 — `Answer Level`

Mỗi row = 1 `PARENT_TASK`. Dùng để revision của Excel TA mẫu (REL/COMP cấp bài).

| Column | Type | Source | Notes |
|---|---|---|---|
| `parent_task_id` | uuid | `PARENT_TASK.parent_task_id` | |
| `bundle_id` | uuid | `PDF_BUNDLE.bundle_id` | |
| `article_code` | string | | |
| `article_title` | string | | |
| `domain` | string | | |
| `subdomain` | string | | |
| `rubric_version` | string | | |
| `total_claims` | integer | count claim | |
| `approved_claims` | integer | count claim approved resolved | |
| `disputed_claims` | integer | count claim có dispute | |
| `avg_annotation_composite` | decimal | AVG(annotation_composite) của approved claims | |
| `rel` | decimal | `ARTICLE_EVALUATION.rel` | 0.00–1.00 |
| `comp` | decimal | `ARTICLE_EVALUATION.comp` | 0.00–1.00 |
| `quality_band` | enum | xem §7 | theo `avg_annotation_composite` |
| `final_recommendation` | enum | xem §7 | ở cấp bài (rule ưu tiên) |
| `evaluated_by` | string | `USER_ACCOUNT.full_name` (annotator_id của ARTICLE_EVALUATION) | |
| `evaluated_at` | datetime | `ARTICLE_EVALUATION.evaluated_at` | |

---

## 6. Sheet 4 — `QA Review Log`

Mỗi row = 1 `QA_REVIEW`. Liệt kê mọi action QA per claim, kể cả `return` rồi được duyệt sau.

| Column | Type | Source | Notes |
|---|---|---|---|
| `qa_review_id` | uuid | `QA_REVIEW.qa_review_id` | |
| `claim_id` | uuid | `CLAIM_TASK.claim_id` | |
| `parent_task_id` | uuid | denormalized | liên kết article |
| `qa_email` | string | `USER_ACCOUNT.email` (qa_id) | |
| `decision` | enum | `QA_REVIEW.decision` | `approved` / `returned` |
| `error_category` | enum | `QA_REVIEW.error_category` | Required if `decision=returned` |
| `qa_comment` | text | `QA_REVIEW.qa_comment` | |
| `linked_dispute_id` | uuid | `DISPUTE.dispute_id` nếu có | nullable |
| `linked_dispute_status` | enum | nullable | |
| `reviewed_at` | datetime | `QA_REVIEW.reviewed_at` | ISO datetime |

---

## 7. Sheet 5 — `Dispute Log`

Mỗi row = 1 `DISPUTE` (mọi trạng thái).

| Column | Type | Source | Notes |
|---|---|---|---|
| `dispute_id` | uuid | `DISPUTE.dispute_id` | |
| `claim_id` | uuid | `CLAIM_TASK.claim_id` | |
| `parent_task_id` | uuid | denormalized | |
| `project_id` | uuid | denormalized | |
| `flagged_by_email` | string | `USER_ACCOUNT.email` (flagged_by) | QA |
| `reason` | text | `DISPUTE.reason` | |
| `status` | enum | `DISPUTE.status` | |
| `resolution_decision` | enum | nullable | |
| `resolution_note` | text | nullable | |
| `policy_note` | text | nullable | guideline update link |
| `policy_guideline_update_id` | uuid | nullable | link `RUBRIC_VERSION` nếu có update |
| `flagged_at` | datetime | | |
| `sla_due_at` | datetime | | tính sẵn từ lúc flagged |
| `resolved_at` | datetime | nullable | |
| `resolved_by_email` | string | nullable | Admin |
| `sla_status` | derived | xem §7.b | `on_track` / `approaching` / `overdue` |

---

## 8. Sheet 6 — `IAA Report`

Mỗi row = 1 `IAA_SCORE` (filter theo `filter_json` của request). Có thể nhiều row cho cùng scope nếu period khác nhau.

| Column | Type | Source | Notes |
|---|---|---|---|
| `iaa_score_id` | uuid | `IAA_SCORE.iaa_score_id` | |
| `project_id` | uuid | | |
| `scope_type` | enum | `IAA_SCORE.scope_type` | |
| `scope_id` | uuid | | |
| `annotator_a_email` | string | User | optional |
| `annotator_b_email` | string | | optional |
| `rubric_dimension` | enum | | |
| `score` | decimal | 0.00–1.00 | |
| `metric_used` | string | = `krippendorff_alpha` default | |
| `period_start` | datetime | | |
| `period_end` | datetime | | |
| `computed_at` | datetime | | |
| `action_required` | derived | `flag` / `monitor` / `ok` | Thresholds `§7.a` |

---

## 9. Field dẫn xuất (chuẩn hóa downstream)

### §7.a IAA `action_required`

```
IF score >= 0.75 -> "ok"
ELIF score >= 0.60 -> "monitor"
ELSE -> "flag"
```

### §7.b `sla_status` (dispute)

```
IF status in (resolved_*) -> "resolved"
ELIF now() < sla_due_at - 24h -> "on_track"
ELIF now() < sla_due_at -> "approaching"
ELSE -> "overdue"
```

### §7.c `quality_band` từ composite

```
IF composite >= 0.80 -> "HIGH"
ELIF composite >= 0.60 -> "MEDIUM"
ELSE -> "LOW"
```

### §7.d `final_recommendation` (Claim Level)

```
IF qa_final_decision = approved  AND dispute IS NULL       -> "ACCEPTED"
IF qa_final_decision = approved  AND dispute_resolved_approved -> "ACCEPTED"
IF qa_final_decision = approved  AND dispute_resolved_re_annotation -> "NEEDS_REVISION"
IF qa_final_decision = returned  AND dispute_resolved_approved       -> "ACCEPTED"
IF qa_final_decision = returned  AND dispute_resolved_re_annotation  -> "REJECTED"
IF qa_final_decision = approved  AND dispute OVERDUE  -> "NEEDS_REVISION"
IF qa_final_decision = returned AND dispute IS NULL          -> "REJECTED"
ELSE -> "NEEDS_REVISION"   # fallback cho state chưa kết
```

### §7.e `qa_final_decision` (Claim Level)

```
# Logic: lấy latest QA_REVIEW không phải "dispute-resolution overridden"
IF dispute exists with resolution_decision in (approved, re_annotation_required)
   -> theo resolution_decision ("approved"/"rejected")
ELIF last QA_REVIEW.decision = approved -> "approved"
ELIF last QA_REVIEW.decision = returned -> "rejected"
ELSE -> NULL  # đang pipeline
```

---

## 10. Validation cho file export (bổ sung artifact `#12`)

### VR-EXP-CONS-001 — File buildable
- Trigger: `EXPORT_CONSOLIDATED_REQUEST.status = running`
- Nếu file build lỗi → `status = failed`, set `error_detail` (§`EXPORT_CONSOLIDATED_REQUEST`).

### VR-EXP-CONS-002 — File tồn tại + openable
- Sau khi `status = done` → verify file readable, ≥6 sheet đúng tên, không corrupted (openpyxl round-trip OK).

### VR-EXP-CONS-003 — UTF-8 BOM
- File XLSX có BOM ở level workbook (Excel mở đúng font tiếng Việt).

### VR-EXP-CONS-004 — Sheet names immutable
- 6 sheet name cố định, KHÔNG đổi qua version. Validation nội bộ: so với list cứng `["Summary", "Claim Level", "Answer Level", "QA Review Log", "Dispute Log", "IAA Report"]`.

### VR-EXP-CONS-005 — Empty dataset không crash
- Project chưa có data → tất cả 6 sheet được tạo, chỉ header row + 1 dòng cảnh báo. Cảnh báo ở Summary sheet (`notes`).

### VR-EXP-CONS-006 — RBAC
- Endpoint build: chỉ Admin hoặc QA trong project đó.

---

## 11. Mở / chưa chốt

- **Async generator pattern:** job chạy nền (ARQ giống pipeline import), poll status qua `EXPORT_CONSOLIDATED_REQUEST.status`. — cần Khải confirm.
- **Cleanup policy:** giữ file bao lâu? 30 / 90 ngày? Hay user tự xóa? — DEC chưa có.
- **Phân quyền download:** ai được tải? Admin tự / user đã tạo request? Hay share cho cả project? — RBAC chi tiết cần chốt.
- **Encoding UTF-8 BOM** — với `.xlsx` (zip-based) áp dụng BOM thế nào cần test thực tế với Excel tiếng Việt Mac/Win.
- **Field coverage:** column "approval" có cần `qa_approved_by_email` riêng (không chỉ timestamp)? — BA Tuyết xác nhận.
