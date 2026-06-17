# API Integration Guide — VSF AI Annotation Platform

> Tài liệu cho **Frontend** (và bất kỳ client nào) kết nối Backend API.
> Nguồn chân lý: code BE `src/backend/app/features/*/routes.py` + `schemas.py`.
> Mọi shape request/response dưới đây trích trực tiếp từ Pydantic schema BE — KHÔNG suy diễn.

**Base URL:** `http://localhost:8000/api/v1` (dev) — biến `VITE_API_BASE_URL`.
**Swagger UI (thử trực tiếp):** `http://localhost:8000/docs`.

---

## 0. Quy ước chung

### 0.1 Xác thực — Bearer token
- Sau khi login, lưu `access_token`, gắn vào mọi request (trừ `/auth/login`, `/auth/bootstrap-admin`):
  ```
  Authorization: Bearer <access_token>
  ```
- `Content-Type: application/json` cho body JSON. **Riêng upload file dùng `multipart/form-data`** (KHÔNG set Content-Type thủ công — để browser tự set boundary).

### 0.2 Shape lỗi (mọi endpoint)
BE chuẩn hóa lỗi về 1 shape duy nhất (`app/core/middleware.py`):
```json
{
  "error": {
    "code": "not_found",
    "message": "Mô tả lỗi cho người dùng",
    "request_id": "uuid-trace-id"
  }
}
```
- FE nên đọc `error.code` (machine-readable) để xử lý nhánh, `error.message` để hiển thị.
- Code thường gặp: `unauthorized` (401), `permission_denied` (403), `not_found` (404),
  `validation_error` / `422` (sai schema), `internal_error` (500).
- HTTP 422 (FastAPI validation) có thể trả shape khác (`detail[]`) — đó là lỗi sai kiểu dữ liệu gửi lên.

### 0.3 RBAC theo role
| Nhóm endpoint | Role được phép |
|---|---|
| `/auth/*` | công khai (login/bootstrap), `/me` cần token |
| `/users/*`, `/projects/*`, `/import-bundles/*`, `/exports/*`, `/audit-logs` | **ADMIN** |
| `/tasks/*` (annotation) | **ANNOTATOR** (chỉ task được giao — OQ-008) |
| `/qa-reviews/*` | **QA**, ADMIN |
| `/files/{id}` | ADMIN, ANNOTATOR, QA |

Gọi sai role → `403 permission_denied`.

### 0.4 Phân trang
Endpoint list dùng query `?limit=20&offset=0` (limit 1..100, default 20).

---

## 1. Auth

### POST `/auth/bootstrap-admin` — tạo Admin đầu tiên (1 lần duy nhất)
Chỉ chạy khi DB chưa có user nào. Sau đó tự khóa.
```json
// Request
{ "email": "admin@vsf.local", "full_name": "Admin", "password": "Admin@12345" }
```
```json
// Response 201 — TokenResponse
{
  "access_token": "eyJ...", "refresh_token": "eyJ...",
  "token_type": "bearer", "role": "ADMIN", "email": "admin@vsf.local"
}
```
> `password` ≥ 8 ký tự và ≤ 72 byte (UTF-8), nếu không → 422.

### POST `/auth/login`
```json
// Request
{ "email": "admin@vsf.local", "password": "Admin@12345" }
```
```json
// Response 200 — TokenResponse (giống bootstrap)
{ "access_token": "...", "refresh_token": "...", "token_type": "bearer", "role": "ADMIN", "email": "..." }
```
→ FE lưu `access_token` + `role` (điều hướng theo role) + `refresh_token`.

### POST `/auth/refresh`
```json
// Request
{ "refresh_token": "eyJ..." }
```
```json
// Response 200 — AccessTokenResponse
{ "access_token": "eyJ...", "token_type": "bearer" }
```
→ Gọi khi access_token hết hạn (BE revalidate user trong DB; user bị xóa/khóa → 401).

### GET `/auth/me` (cần token)
```json
// Response 200
{ "subject": "3f9a…-uuid", "role": "ADMIN", "name": "Admin" }
```
> `subject` = **`str(user.id)` (UUID)**, KHÔNG phải email (đồng bộ với JWT `sub` sau fix #1).
> Hiển thị tên dùng `name`; nhận diện vai trò dùng `role`.

### POST `/auth/change-password` (cần token) → **204 No Content**
```json
// Request
{ "old_password": "...", "new_password": "MoiManh@123" }
```

---

## 2. Users (ADMIN)

### POST `/users` → 201
```json
// Request — UserCreate
{
  "email": "annotator1@vsf.local",
  "full_name": "Nguyễn Văn A",
  "temp_password": "Temp@1234",
  "role": "ANNOTATOR",
  "project_id": "uuid-project"
}
```
```json
// Response — UserOut
{ "id": "uuid", "email": "...", "full_name": "...", "status": "active", "last_login_at": null }
```
> `role` = `ANNOTATOR` | `QA` | `ADMIN`. `project_id` để gán role trong project đó.

### GET `/users?limit=&offset=` → `UserOut[]`
### GET `/users/{user_id}` → `UserOut`

---

## 3. Projects (ADMIN)

### POST `/projects` → 201
```json
// Request — ProjectCreate
{
  "project_code": "vivipedia",
  "project_name": "Vivipedia MVP",
  "description": "optional, ≤500 ký tự",
  "deadline": "2026-07-01",
  "llm_config": {
    "endpoint": "https://openrouter.ai/api/v1",
    "api_key": "sk-or-...",
    "model": "openai/gpt-5.4",
    "prompt_template": "Chấm {{claim_text}} dựa trên {{source_context}}"
  }
}
```
**Ràng buộc (sai → 422):**
- `project_code`: `^[A-Za-z0-9_\-]+$`, 1..64 ký tự.
- `project_name`: 3..100 ký tự.
- `llm_config.prompt_template`: **bắt buộc chứa `{{claim_text}}` và `{{source_context}}`** (BR-1.3).
- `llm_config.endpoint`: bắt đầu `http://` hoặc `https://`.

```json
// Response — ProjectOut (api_key bị mask, BR-1.2)
{
  "id": "uuid", "project_code": "vivipedia", "project_name": "...",
  "description": null, "modality": "text", "status": "...", "deadline": "2026-07-01",
  "created_at": "2026-06-16T...", "member_count": 0,
  "llm_config": { "endpoint": "https://...", "api_key_masked": "••••••••", "model": "openai/gpt-5.4", "is_configured": true }
}
```

### GET `/projects?limit=&offset=` → `Page<ProjectOut>`
```json
{ "items": [ /* ProjectOut[] */ ], "meta": { "total": 1, "limit": 20, "offset": 0 } }
```

### GET `/projects/{project_id}` → `ProjectDetail` (ProjectOut + `members: MemberOut[]`)
```json
// MemberOut
{ "user_id": "uuid", "full_name": "...", "email": "...", "role": "ANNOTATOR", "is_active": true }
```

### POST `/projects/{project_id}/assignments` → 200 → `MemberOut[]`
```json
// Request — AssignMembersIn (upsert, gọi nhiều lần an toàn)
{ "members": [ { "user_id": "uuid", "role": "ANNOTATOR" }, { "user_id": "uuid", "role": "QA" } ] }
```
> Không gán `ADMIN` qua đây (→ 422).

### GET `/projects/{project_id}/claims?limit=&offset=&status=&annotator_id=&unassigned=` → `ProjectClaimsOut`
Danh sách claim của project — **phân trang + filter** + thống kê tiến độ.
```json
{
  "items": [
    { "claim_id": "uuid", "claim_order": 1, "section_name": "...", "claim_text": "...",
      "status": "ready", "article_code": "ART_...", "title": "...",
      "assigned_annotator_id": "uuid|null", "assigned_annotator_email": "ann@vsf.local|null" }
  ],
  "total": 6, "limit": 10, "offset": 0,
  "stats": { "total": 6, "ready": 6, "in_annotation": 0, "submitted": 0,
             "returned": 0, "approved": 0, "unassigned": 6 }
}
```
- `status` filter (ready/in_annotation/submitted/returned/approved). `unassigned=true` chỉ claim chưa gán.
- `annotator_id` lọc theo annotator (bỏ qua nếu `unassigned=true`).
- `stats` đếm toàn project (KHÔNG theo filter) → hiển tiến độ.

### DELETE `/projects/{project_id}/members/{user_id}` → **204**
Gỡ thành viên khỏi project (deactivate role, không xóa cứng).

### POST `/projects/{project_id}/assign-claims` → 200 → `AssignClaimsOut`
Gán claim cho 1 annotator (bù khâu auto-assign). `claim_ids` rỗng = gán **tất cả** claim của project.
```json
// Request — AssignClaimsIn
{ "annotator_id": "uuid", "claim_ids": [] }
```
```json
// Response
{ "assigned_count": 6, "annotator_id": "uuid" }
```
- Annotator phải có role `ANNOTATOR` trong project (chưa gán → `422 annotator_not_in_project`).
- Annotator không tồn tại → `404`.

---

## 4. Import Bundle (ADMIN) — luồng 4 bước

Thứ tự: **upload-file (×N) → validate → preview → confirm → poll status**.

> ⚠️ **`upload_tokens` là query param lặp lại**, KHÔNG nằm trong body:
> `?upload_tokens=T1&upload_tokens=T2&upload_tokens=T3`

### 4.1 POST `/import-bundles/upload-file` — `multipart/form-data`
Form fields:
| field | kiểu | giá trị |
|---|---|---|
| `file` | File | PDF |
| `file_role` | text | `answer_pdf` \| `source_ref_pdf` \| `source_content_pdf` |
| `project_id` | text | uuid |

```json
// Response — UploadFileOut
{ "file_id": "uuid", "original_filename": "answer.pdf", "file_role": "answer_pdf",
  "file_size_bytes": 12345, "upload_token": "<rand>:<file_id>" }
```
→ Lưu `upload_token` của từng file. Bundle tối thiểu cần `answer_pdf` + `source_ref_pdf`
(`source_content_pdf` là **tùy chọn**, 0..N).

### 4.2 POST `/import-bundles/validate?upload_tokens=T1&upload_tokens=T2[...]`
```json
// Body — ValidateBundleIn
{ "project_id": "uuid", "upload_token": "T1", "bundle_name": "Bundle 01" }
```
```json
// Response — ValidateBundleOut
{
  "upload_token": "T1", "bundle_name": "Bundle 01", "is_valid": true,
  "files": [ { "file_id": "uuid", "original_filename": "...", "file_role": "answer_pdf",
               "file_size_bytes": 123, "is_valid": true, "errors": [] } ],
  "errors": [], "warnings": []
}
```

### 4.3 POST `/import-bundles/preview?upload_tokens=...`
```json
// Body — PreviewParseIn
{ "project_id": "uuid", "upload_token": "T1" }
```
```json
// Response — PreviewParseOut (rút gọn)
{
  "upload_token": "T1", "title": "Thanh toán chi phí dự án ODA...",
  "citation_format": "law", "total_sections": 3, "total_claim_candidates": 6,
  "sections": [ { "heading": "Hồ sơ cần chuẩn bị", "claim_count": 2, "sample_claims": ["..."] } ],
  "source_ref_count": 14,
  "source_refs": [ { "index": 1, "url": "https://chinhphu.vn/...", "source_text": "...", "page": 1 } ],
  "article_code": "ENC_20260512_375DE786",
  "metadata": { "domain_key": "law", "domain_name": "Pháp luật", "created_date": "2026-05-12", "confidence_score": 0.1 },
  "warnings": [ { "warning_code": "...", "message": "..." } ]
}
```
> FE nên hiển thị `metadata.domain_key`/`domain_name` + warnings cho Admin xác nhận trước confirm.

### 4.4 POST `/import-bundles/confirm?upload_tokens=...` → **202**
```json
// Body — ConfirmImportIn
{ "project_id": "uuid", "upload_token": "T1", "bundle_name": "Bundle 01", "batch_name": "Batch 01" }
```
```json
// Response — ConfirmImportOut
{ "bundle_id": "uuid", "batch_id": "uuid", "bundle_name": "Bundle 01",
  "status": "queued", "message": "Đã enqueue xử lý PDF...", "job_id": "arq-job-id-or-null" }
```
→ Lưu `bundle_id`, chuyển sang poll status.

### 4.5 GET `/import-bundles/{bundle_id}/status`
```json
// Response — BundleStatusOut
{ "bundle_id": "uuid", "bundle_name": "...", "bundle_status": "pre_scoring",
  "article_code": "...", "title": "...", "file_count": 3,
  "created_at": "...", "updated_at": "...", "error_detail": null }
```
> `bundle_status`: `uploaded → parsing → pre_scoring → done` (hoặc `failed` + `error_detail`).
> FE poll mỗi ~2–3s tới khi `done`/`failed`.

---

## 5. Annotation (ANNOTATOR) — chỉ task được giao (OQ-008)

### GET `/tasks?status=<optional>` → `TaskListOut`
```json
{ "items": [ { "claim_id": "uuid", "claim_order": 1, "section_name": "...",
               "claim_text": "...", "status": "ready", "submitted_at": null,
               "parent_task_id": "uuid", "article_code": "...", "title": "..." } ],
  "total": 1 }
```

### GET `/tasks/{claim_id}` → `TaskDetailOut`
```json
{
  "claim_id": "uuid", "claim_order": 1, "section_name": "...", "claim_text": "...",
  "status": "ready", "citation_markers": "1;3",
  "parent_task_id": "uuid", "article_code": "...", "title": "...",
  "answer_context": "...đoạn answer quanh claim...",
  "pre_score": {
    "pre_score_id": "uuid", "provider": "OpenRouterProvider", "model": "openai/gpt-5.4",
    "sf": 0.75, "sc": 0.8, "hr": 0.7, "sq": 0.49, "rel": 0.85, "comp": 0.6,
    "composite_score": 0.71,
    "rationale_json": {
      "sf": "...", "sc": "...", "hr": "...", "sq": "SQ rule: ...", "rel": "...", "comp": "...",
      "_meta": {
        "fact_check_status": "KHONG TIM THAY",
        "sq_domain_class": "gov_vn", "sq_tier": "unknown", "sq_needs_review": true
      }
    }
  },
  "sources": [ { "source_id": "uuid", "source_url": "https://...", "citation_marker": "...", "access_status": "..." } ],
  "draft": null
}
```
**Lưu ý quan trọng cho FE (xem §7 — Khác biệt SQ):**
- `pre_score.sq` do **rule engine** tính, KHÔNG phải LLM. `_meta.sq_needs_review=true` →
  FE nên highlight + gợi ý annotator mở `source_url` để verify thủ công.
- `_meta.fact_check_status` chỉ tham khảo (LLM không web search) — annotator tự fact-check.

### PUT `/tasks/{claim_id}/autosave` → `AutosaveOut` (BR-6.1, mỗi ~30s)
```json
// Body — AutosaveIn (mọi field optional)
{ "scores": { "sf": 0.8, "sc": 0.7, "hr": 0.9, "sq": 0.5, "rel": 0.8, "comp": 0.6 },
  "source_access_status": "accessible", "annotator_note": "...",
  "justifications": { "sf": "lý do nếu lệch", "sc": null, "hr": null, "sq": null, "rel": null, "comp": null } }
```
```json
// Response
{ "claim_id": "uuid", "saved_at": "2026-06-16T..." }
```

### POST `/tasks/{claim_id}/submit` → `SubmitOut`
```json
// Body — SubmitIn (scores BẮT BUỘC đủ 6 chiều + source_access_status)
{
  "scores": { "sf": 0.8, "sc": 0.7, "hr": 0.9, "sq": 0.5, "rel": 0.8, "comp": 0.6 },
  "source_access_status": "accessible",
  "annotator_note": "optional ≤2000",
  "justifications": { "sf": "...", "sc": null, "hr": null, "sq": null, "rel": null, "comp": null }
}
```
```json
// Response — SubmitOut
{ "claim_id": "uuid", "composite_score": 0.72, "status": "submitted",
  "submitted_at": "...", "dimensions_needing_justification": [] }
```
**Ràng buộc nghiệp vụ (BE enforce — sai → 400):**
- Chiều nào lệch ≥ ±0.20 so với pre-score mà **thiếu justification** → `400 justification_required`,
  field `dimensions_needing_justification` (ở response lỗi/diff) liệt kê chiều thiếu.
- `source_access_status`: `accessible` | `partial` | `inaccessible` | `not_checked`.
- Composite do **server tính** (BR-7.2) — FE không gửi composite.

> **Mapping field FE→BE:** dùng đúng key `scores` với 6 thuộc tính `sf/sc/hr/sq/rel/comp` (lowercase).
> UI gọi non-hallucination là "NH" nhưng key gửi lên BE là **`hr`**.

---

## 6. QA Review (QA, ADMIN)

### GET `/qa-reviews/queue` → `QueueOut`
```json
{ "items": [ { "claim_id": "uuid", "claim_order": 1, "claim_text": "...", "section_name": "...",
               "parent_task_id": "uuid", "article_code": "...", "title": "...",
               "submitted_at": "...", "annotator_id": "uuid" } ], "total": 1 }
```

### GET `/qa-reviews/{claim_id}` → `ReviewDetailOut` (diff view)
```json
{
  "claim_id": "uuid", "claim_order": 1, "claim_text": "...", "section_name": "...",
  "citation_markers": "1;3", "article_code": "...", "title": "...", "answer_context": "...",
  "score_diff": [
    { "dimension": "sf", "pre_score": 0.75, "annotator_score": 0.8, "delta": 0.05, "needs_justification": false },
    { "dimension": "sq", "pre_score": 0.49, "annotator_score": 0.5, "delta": 0.01, "needs_justification": false }
  ],
  "composite_pre": 0.71, "composite_annotator": 0.72,
  "source_access_status": "accessible", "annotator_note": "...",
  "justifications": { "sf": "..." },
  "previous_reviews": [ { "qa_review_id": "uuid", "decision": "returned", "error_category": "factual_error",
                          "qa_comment": "...", "reviewed_at": "...", "qa_id": "uuid" } ]
}
```
> `score_diff` highlight chiều có `needs_justification=true` (lệch ≥ ±0.20 — AC-8.1).

### POST `/qa-reviews/{claim_id}/approve` → 200 → `ReviewOut`
```json
// Body — ApproveIn
{ "qa_comment": "optional ≤2000" }
```

### POST `/qa-reviews/{claim_id}/return` → 200 → `ReviewOut`
```json
// Body — ReturnIn
{ "error_category": "factual_error", "qa_comment": "ít nhất 10 ký tự bắt buộc" }
```
- `error_category`: `factual_error` | `guideline_violation` | `source_mismatch` | `incomplete` | `other`.
- `qa_comment`: **bắt buộc ≥ 10 ký tự** (VR-QA-002), nếu không → 422.

```json
// Response — ReviewOut (cả approve lẫn return)
{ "qa_review_id": "uuid", "claim_id": "uuid", "decision": "approved",
  "error_category": null, "qa_comment": "...", "reviewed_at": "..." }
```
> Chỉ review được claim đang `submitted`; sai trạng thái → `400 invalid_claim_status`.

---

## 7. Export (ADMIN)

### GET `/exports/{project_id}/download?batch_id=<optional>` → **file CSV**
- Trả thẳng bytes CSV (UTF-8 BOM), **KHÔNG phải JSON**. Header:
  `Content-Type: text/csv; charset=utf-8-sig`,
  `Content-Disposition: attachment; filename="export_<project>_<timestamp>.csv"`.
- FE: tải dạng blob → trigger download. Ví dụ:
  ```ts
  const res = await fetch(`${BASE}/exports/${projectId}/download`, { headers: { Authorization: `Bearer ${token}` }});
  const blob = await res.blob();
  // tạo <a download> với URL.createObjectURL(blob)
  ```
- Chỉ export claim đã `approved` (BR-9.1). `batch_id` optional để lọc 1 batch.

---

## 8. Files — xem PDF gốc (ADMIN, ANNOTATOR, QA)

### GET `/files/{file_id}` → **stream PDF**
- Trả bytes PDF inline (`Content-Disposition: inline`), `Content-Type: application/pdf`.
- `file_id` lấy từ `UploadFileOut.file_id` hoặc các response có `source_file_id`.
- FE nhúng vào `<iframe>`/viewer hoặc mở tab mới. Cần gắn Bearer token (fetch blob rồi tạo object URL,
  vì `<iframe src>` không gửi được header).
- File không tồn tại / không có trong storage → `404 not_found`.

---

## 9. Audit Log (ADMIN)

### GET `/audit-logs?limit=&offset=&action_type=&entity_type=&project_id=` → `AuditLogPage`
```json
{
  "items": [
    { "id": "uuid", "project_id": "uuid|null", "user_id": "uuid|null", "user_role": "QA",
      "entity_type": "claim_task", "entity_id": "uuid", "action_type": "approve",
      "description": "QA approve claim ...", "reason": null, "client_ip": "203.0.113.7",
      "timestamp": "2026-06-16T..." }
  ],
  "total": 42, "limit": 20, "offset": 0
}
```
- Filter optional: `action_type` (`import`|`submit`|`approve`|`return`|`export`),
  `entity_type`, `project_id`. Mới nhất trước.
- Bảng INSERT-only (BR-10.1) — KHÔNG có API sửa/xóa.

---

## 10. Luồng E2E gợi ý cho FE

```
[ADMIN]
  login → tạo project (llm_config) → tạo user (annotator/qa) → assign vào project
  → upload 2–3 PDF → validate → preview → confirm → poll status tới 'done'
  → (sau khi annotate+QA xong) export CSV
  → xem audit-logs

[ANNOTATOR]
  login → GET /tasks → GET /tasks/{id} (xem pre_score + sources)
  → autosave định kỳ → submit (đủ 6 chiều + justification nếu lệch ≥0.20)

[QA]
  login → GET /qa-reviews/queue → GET /qa-reviews/{id} (diff view)
  → approve HOẶC return (kèm lý do ≥10 ký tự)
```

---

## 11. Bảng tra nhanh endpoint

| Method | Path | Role | Body/Query |
|---|---|---|---|
| POST | `/auth/bootstrap-admin` | public | JSON |
| POST | `/auth/login` | public | JSON |
| POST | `/auth/refresh` | public | JSON |
| GET | `/auth/me` | token | — |
| POST | `/auth/change-password` | token | JSON → 204 |
| POST | `/users` | ADMIN | JSON → 201 |
| GET | `/users` | ADMIN | `?limit&offset` |
| GET | `/users/{id}` | ADMIN | — |
| GET | `/projects` | ADMIN | `?limit&offset` |
| POST | `/projects` | ADMIN | JSON → 201 |
| GET | `/projects/{id}` | ADMIN | — |
| POST | `/projects/{id}/assignments` | ADMIN | JSON |
| GET | `/projects/{id}/claims` | ADMIN | `?limit&offset&status&annotator_id&unassigned` |
| POST | `/projects/{id}/assign-claims` | ADMIN | JSON |
| DELETE | `/projects/{id}/members/{user_id}` | ADMIN | → 204 |
| POST | `/import-bundles/upload-file` | ADMIN | multipart |
| POST | `/import-bundles/validate` | ADMIN | JSON + `?upload_tokens` |
| POST | `/import-bundles/preview` | ADMIN | JSON + `?upload_tokens` |
| POST | `/import-bundles/confirm` | ADMIN | JSON + `?upload_tokens` → 202 |
| GET | `/import-bundles/{bundle_id}/status` | ADMIN | — |
| GET | `/tasks` | ANNOTATOR | `?status` |
| GET | `/tasks/{claim_id}` | ANNOTATOR | — |
| PUT | `/tasks/{claim_id}/autosave` | ANNOTATOR | JSON |
| POST | `/tasks/{claim_id}/submit` | ANNOTATOR | JSON |
| GET | `/qa-reviews/queue` | QA/ADMIN | — |
| GET | `/qa-reviews/{claim_id}` | QA/ADMIN | — |
| POST | `/qa-reviews/{claim_id}/approve` | QA/ADMIN | JSON |
| POST | `/qa-reviews/{claim_id}/return` | QA/ADMIN | JSON |
| GET | `/exports/{project_id}/download` | ADMIN | `?batch_id` → CSV |
| GET | `/files/{file_id}` | ADMIN/ANN/QA | → PDF |
| GET | `/audit-logs` | ADMIN | `?limit&offset&action_type&entity_type&project_id` |
