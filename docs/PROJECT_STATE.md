# PROJECT STATE — Trạng thái hiện tại của dự án

> 🎯 **Mục đích:** Đây là "bản đồ giờ đang ở đâu" — file để **bất kỳ ai (người hoặc AI)**
> đọc đầu phiên là biết ngay cái gì xong, cái gì đang làm, cái gì TODO. Chống **context
> drift** khi nhiều người + AI vibe-code qua thời gian dài.
>
> ⚠️ **FILE NÀY PHẢI ĐƯỢC CẬP NHẬT.** Quy ước "ai cập nhật gì, khi nào" ở cuối file và
> trong `CLAUDE.md` / `AGENTS.md`. Cập nhật stale → cả team lệch.


**Cập nhật lần cuối:** 2026-06-17 · **Bởi:** Claude (Luồng import + auth + UI nhiều cải tiến. **Auth**: tắt mock (docker-compose + .env), login THẬT bằng DB; refresh token tự gia hạn khi 401 (FE single-flight), fix `_get_primary_role` fallback `default_role` khi user chưa thuộc project. **Project**: status `draft`→`active` (active khi confirm import xong); mã `proj_NNN` tự sinh; thêm `start_date` (migration c9d0e1f2a3b4) + validate start≤deadline; bỏ LLM config khỏi form (lấy từ .env, llm_config optional); DELETE /projects/{id} (chặn nếu có claim → 409). **Wizard import**: gộp 5→4 bước, stepper tròn-số trên header sticky (đã qua xanh/đang đỏ/chưa xám), DatePicker tròn đỏ (react-day-picker), gán thành viên tối đa 15, validate FE sớm (đuôi/size); **resume**: project draft bấm → /admin/import?projectId tiếp tục import, back không tạo lại. **FE chung**: header trang lên thanh app (usePageHeader), sidebar thu/mở, toast popup variant, empty state, card project có dropdown Xóa. 161 test pass. — Lịch sử cũ: Trang chi tiết project đầy đủ vai admin + phân trang toàn cục. BE: GET /projects/{id}/claims phân trang+filter(status/annotator/unassigned)+stats tiến độ, DELETE members/{id} gỡ thành viên (155 test pass). FE: ProjectDetailPage = header info + thống kê 6 ô + quản lý thành viên (thêm user đã có/xóa, annotator+QA) + gán claim + filter + phân trang 10; import xong vào thẳng project; wizard bước 1 chọn thành viên; phân trang 10/trang cho projects/users/audit (component Pagination); bước 2 import 2 ô kéo-thả cố định. — Lịch sử cũ: ) Claude (Tái cấu trúc FE chuẩn + giữ giao diện cam đỏ fe_ui (VinSmart Future). Chuyển từ App.tsx 722 dòng (hash routing, demo) sang **React Router + AuthProvider (session persist, hết văng login khi reload/back) + RoleGuard + AppLayout** — 14 feature page bọc component cam đỏ, nối API qua adapter. Thêm **BE endpoint** `GET /projects/{id}/claims` + `POST /projects/{id}/assign-claims` (gán claim cho annotator, bù D3) + trang **chi tiết project + gán nhân sự**. Import xong tự về /admin/projects. Pipeline LLM thật (OpenRouter gpt-4o-mini) verify chạy: bundle→6 claim, pre-score thật. Test: 152 PASS (+3), build FE xanh, navigation back/forward chuẩn. CÒN MỞ BE: per-project RBAC, pipeline dùng project LLM config)

**Trước đó:** Điều chỉnh SQ [ADR 0008 A+D]: tách SQ → rule engine (sq_engine.py), LLM chấm 5 chiều, composite vẫn 6 (BR-7.2).

**Trước đó:** Nhóm D — audit_log BR-10.1/10.2 (migration a7b8c9d0e1f2); exception handler AppError→ErrorResponse + 500; endpoint stream PDF /api/v1/files/{file_id}.

---

## 1. Tổng quan nhanh

| Hạng mục | Trạng thái |
|---|---|
| Giai đoạn | Scaffold base xong → bắt đầu implement nghiệp vụ |
| Stack | FastAPI + React/Vite + Postgres + MinIO + ARQ (đã chốt — [ADR 0001](adr/0001-tech-stack.md)) |
| Chạy được | `docker compose up` → 6 service OK; login 3 role; trang skeleton |
| Chưa làm | Toàn bộ logic nghiệp vụ (đánh dấu `TODO(<feature>)`) |

**Pipeline đang ở bước nào:**
```
Upload PDF → Parse → Claim Extract → Pre-score → Annotate → QA → Export
    ✅ BE      ✅ BE    ✅ BE         ✅ BE        ✅ BE      ✅ BE   ✅ BE
    ⬜ FE      ⬜ FE      ⬜           ⬜           ⬜ FE      ⬜ FE   ⬜ FE
```
→ **Toàn bộ BE pipeline xong** (OQ-002/003 đã chốt — [ADR 0007]: OpenRouter, claim extraction + pre-scoring 2 bước riêng). Integration + unit test pass (98 test, Docker).
→ Giai đoạn tiếp: **FE pages** (nhóm C). Còn manual test với OpenRouter key thật (user tự điền `.env`).

---

## 2. Trạng thái theo FEATURE × ROLE

**Ký hiệu:** ✅ xong · 🚧 đang làm · ⬜ TODO · 🔒 bị chặn (chờ quyết định)

| Feature | Backend (BE) | Frontend (FE) | Test | Ghi chú / Blocker |
|---|:---:|:---:|:---:|---|
| **auth** (login/RBAC) | ✅ login/refresh/change-password + bootstrap-admin (tự khóa) | ✅ LoginView nối `/auth/login` thật (lưu token + điều hướng role) | ✅ 19 test (mock + DB thật) + B2 RBAC (13 case 3 role) | Bcrypt. bootstrap-admin giải quyết chicken-and-egg. KHÔNG register/OAuth/MFA (BA hoãn) |
| **users** (Admin tạo user) | 🚧 create/list/get (RBAC ADMIN) | ⬜ | 🚧 RBAC test | Mật khẩu tạm; gán role per-project |
| **projects** (tạo/cấu hình LLM) | ✅ list/create/get/assign + LLM config | ⬜ skeleton | 🚧 unit test schema ✅ | Migration c3d4e5f6a7b8. LLM key Fernet. Integration test cần Docker |
| **import_bundle** (upload PDF) | ✅ upload/validate/preview/confirm/status; pdf_parser+ref_parser; cross-project check trước flush; ARQ enqueue thật (job process_bundle); migration d4e5f6a7b8c9 | ⬜ skeleton | ✅ B3 security (4 case: cross-project validate/preview/confirm + traversal) | OCR chờ OQ-PDF-004 |
| **pipeline** (parse→extract→score) | ✅ run_import_pipeline 6 bước; claim extraction PARSER-FIRST (LLM fallback); pre-score prompt theo domain (registry law/med/trv+default, band chi tiết); **SQ = rule engine (sq_engine.py), LLM chỉ chấm 5 chiều** [ADR 0008 Hướng A]; fact_check_status + sq signals→rationale_json; extract_json 4-strategy; idempotent/bundle_id; migration f6a7b8c9d0e1 | — | ✅ 2 integration + 24 unit (domain/json/registry/provider/sq_engine) | [ADR 0007/0008]. Manual test key thật chờ user điền `.env` |
| **annotation** (chấm 6 chiều) | ✅ my_tasks/get_task/autosave/submit; OQ-008 enforce; BR-6.1/6.2/7.2/7.3; justifications_json persist (migration e5f6a7b8c9d0); fix deadlock RETURNED→IN_ANNOTATION; fix Decimal/float trong needs_justification | ⬜ skeleton | ✅ 54/54 integration pass — B1 E2E (10 case) + B3 OQ-008/lock (4 case) | OQ-004 ngưỡng ±0.20 đã enforce |
| **qa_review** (approve/return) | ✅ queue/review_detail/approve/return; diff view; justifications_json trả về; BR-8.3 ghi audit_log (approve/return cùng transaction) | ⬜ skeleton | ✅ B1 E2E (approve/return/resubmit) pass | |
| **export** (CSV) | ✅ GET /{project_id}/download; 42 col §10; UTF-8 BOM; filter batch_id; SQL JOIN filter (không OOM); fix qa_decision stale cache; ghi audit_log (BR-9.3) | ⬜ skeleton | ✅ B1 E2E (CSV bytes, BOM, header, qa_decision) pass | ARQ async export TODO sau |
| **audit** (log) | ✅ write_audit_log (INSERT-only, cùng transaction) + GET /audit-logs phân trang/filter (ADMIN); ghi import/submit/approve/return/export; field BR-10.2 (user_role/description/client_ip, migration a7b8c9d0e1f2) | ⬜ skeleton | ✅ 3 test (ghi/list/immutable) | Immutable enforce bằng trigger (BR-10.1) |
| **files** (stream PDF) | ✅ GET /api/v1/files/{file_id} stream PDF gốc (ADMIN/ANNOTATOR/QA); resolve file_id→storage, không lộ path | — | ✅ 3 test (content/404/missing-storage) | RBAC per-project mở rộng sau |

**Hạ tầng & cross-cutting:**
| Hạng mục | Trạng thái | Ghi chú |
|---|:---:|---|
| docker-compose (6 service) | ✅ | verify chạy thật |
| 16 models + Alembic | ✅ | migration đầu đã generate |
| core (config/security/perm/crypto/...) | 🚧 | startup guard env (staging/prod) ✅; exception handler ✅; per-project RBAC còn TODO (require_project_role check global — #2) |
| Storage interface (local/S3) | ✅ | path-traversal validate ✅; stream PDF qua /api/v1/files/{file_id} ✅ |
| Exception handler | ✅ | AppError→ErrorResponse + handler 500 (ẩn stacktrace); request_id trong scope state |
| DB constraints | ✅ | CHECK score range + trigger immutable (audit/pre-score) |
| Quality gates (ruff/eslint/CI fail-on-error) | ✅ | ruff 0 lỗi, eslint config, bỏ `||true` |
| CI pipeline (GitHub Actions) | ✅ | backend lint+test + frontend build+test; trigger PR/push main/develop |
| `.env.example` backend | ✅ | template đầy đủ biến cho Vercel+Render+Supabase |
| LLM interface | ✅ | OpenRouterProvider + MockProvider; đổi model qua `.env` ([ADR 0007]); prompt registry theo domain ([ADR 0008], mở rộng = thêm entry) |
| ARQ worker + pipeline | ✅ | pipeline 6 bước thật; enqueue process_bundle (max_tries=3, timeout 600s) |
| i18n (vi/en) + theme OKLCH | ✅ | |
| Logging (JSON/request-id) | 🚧 | xem logging-and-observability |
| Test plan + test cases (QA) | ✅ | docs/06_test_qa/ — test plan, AC mapping, E2E, checklist, bug log template |

---

## 3. Quyết định mở đang CHỜ (chặn việc)

| ID | Chặn gì | Trạng thái |
|---|---|---|
| OQ-002 | LLM provider → pre-scoring | 🟢 chốt: OpenRouter (gateway OpenAI-compatible), đổi model qua `.env` ([ADR 0007]) |
| OQ-003 | Claim extraction tách/gộp pre-scoring | 🟢 chốt: 2 bước RIÊNG (extract_claims → pre_score) ([ADR 0007]) |
| OQ-004 | Ngưỡng ±0.20 nhập lý do | 🟡 draft |
| OQ-006 | Security baseline | 🟢 baseline đã làm (email/password + RBAC + bcrypt/JWT, ADR 0003/0006). MFA/OAuth/register hoãn theo BA |
| OQ-PDF-004 | OCR/scanned PDF có trong MVP? | 🔴 chờ |

Quyết định ĐÃ chốt → xem [docs/adr/](adr/). Quyết gì mới → **thêm ADR**, đừng để trôi.

---

## 4. Việc tiếp theo (gợi ý ưu tiên)

### Đã xong
1. ✅ Auth baseline (login/refresh/change-password + bootstrap-admin + Admin tạo user)
2. ✅ Projects API (list/create/get + LLM config + assign members, migration c3d4e5f6a7b8)
3. ✅ import_bundle BE (upload/validate/preview/confirm/status + security fixes + migration d4e5f6a7b8c9)
4. ✅ annotation BE (my_tasks/get_task/autosave/submit + OQ-008 + BR-7.2/7.3 + justifications_json)
5. ✅ qa_review BE (queue/diff/approve/return + justifications trả về QA)
6. ✅ export BE (CSV 42 col, UTF-8 BOM, SQL JOIN filter, migration e5f6a7b8c9d0)
7. ✅ **Nhóm A — Unblock pipeline**: OQ-002/003 chốt ([ADR 0007]), OpenRouterProvider, pipeline 6 bước, ARQ enqueue, migration f6a7b8c9d0e1
8. ✅ **Nhóm A vòng 2 — Làm giàu nghiệp vụ**: prompt pre-score theo domain ([ADR 0008]), claim extraction parser-first, fact_check_status, bảng tra SQ (115 test pass)

### Tiếp theo (theo ưu tiên)

**Nhóm A — Unblock pipeline ✅ HOÀN THÀNH**
- ✅ A1. OQ-002 chốt → `OpenRouterProvider` thật (đổi model qua `.env`, [ADR 0007])
- ✅ A2. OQ-003 chốt (2 bước riêng) → ARQ background job `process_bundle` + pipeline 6 bước
- ⏳ A3 (chờ user): manual test với OpenRouter API key thật — user tự điền `LLM_API_KEY` vào `.env`

**Nhóm B — Integration test ✅ HOÀN THÀNH (54/54 pass trong Docker)**
- ✅ B1. Test E2E pipeline: upload bundle → confirm → annotation → QA → export (pytest, `tests/integration/test_pipeline_e2e.py`, 10 case)
- ✅ B2. Test auth: login/refresh/RBAC cho 3 role (`tests/integration/test_rbac.py`, 13 case)
- ✅ B3. Test security: cross-project isolation, path-traversal, OQ-008, task lock (`tests/integration/test_security.py`, 8 case)
- Bug fix phát hiện qua test: deadlock autosave RETURNED, justification data loss, export OOM, Decimal/float compare, confirm_import partial-write, export stale cache

**Nhóm C — FE pages (không phụ thuộc OQ)** · nhánh `origin/fe`
> Trạng thái: scaffold UI **đủ component** (Login/Dashboard/ProjectSetup/Annotation/QaQueue/
> QaReview/Export/Users/Audit/ChangePassword) + `api/client.ts` + `types.ts`. **Mới `/auth/login`
> nối BE thật**; các view còn render từ state local rỗng. Hợp đồng API: `docs/api/API_Integration_Guide.md`.
> Việc còn lại = nối từng view vào endpoint + map snake_case(BE)↔camelCase(FE types).
- C1. Import UI: upload PDF bundle → validate → preview → confirm → poll status (`/import-bundles/*`)
- C2. Annotation workspace: `/tasks` list + `/tasks/{id}` (pre_score+sources) + autosave + submit (key `hr`, không gửi composite)
- C3. QA workspace: `/qa-reviews/queue` + `/qa-reviews/{id}` diff view + approve/return (qa_comment ≥10 ký tự khi return)
- C4. Admin: `/projects` list/create (llm_config), `/users` management, `/exports/{project}/download` (blob CSV), `/audit-logs`

**Nhóm D — Hoàn thiện BE còn thiếu**
- ✅ D1. Audit log (BR-10.1/10.2): INSERT-only, ghi import/submit/approve/return/export (cùng
  transaction); GET /audit-logs (ADMIN); migration a7b8c9d0e1f2
- ✅ D4. Exception handler: AppError→ErrorResponse + handler 500 (không lộ stacktrace) + fix
  request_id (scope state); D5. endpoint stream PDF /api/v1/files/{file_id}
- ⬜ D2. users BE: hoàn thiện create/list/get + RBAC test
- ⬜ D3. Assign tasks cho annotator (hiện claim.assigned_annotator_id cần set thủ công)
- ⬜ D6 (optional): per-project RBAC (permissions.py đọc USER_PROJECT_ROLE), export ARQ async

---

## 5. QUY ƯỚC CẬP NHẬT FILE NÀY (quan trọng)

**Khi nào cập nhật:** ngay khi trạng thái một feature/hạng mục đổi (xong 1 phần, bắt đầu
làm, bị chặn, hết chặn).

**Ai cập nhật ô nào** (theo role):
| Role | Làm xong gì | Cập nhật |
|---|---|---|
| **Backend dev** | xong endpoint/service của 1 feature | cột **BE** của feature đó (⬜→🚧→✅) |
| **Frontend dev** | xong 1 trang/feature UI | cột **FE** |
| **Test/QA** | xong test cho 1 feature | cột **Test** |
| **DevOps** | đổi hạ tầng/CI/deploy | mục Hạ tầng |
| **Ai chốt quyết định** | chốt 1 lựa chọn | mục §3 + thêm ADR |

**Cách cập nhật:**
1. Sửa ô trạng thái tương ứng + ghi chú nếu cần.
2. Đổi dòng "Cập nhật lần cuối" ở đầu file (ngày + tên/role).
3. Nếu là AI: làm việc này **tự động** sau khi hoàn thành — xem luật trong `CLAUDE.md` /
   `AGENTS.md`.
4. Chốt chặn: PR có checkbox "đã cập nhật PROJECT_STATE" — không tick không merge.

> File này là "sống". Stale 1 tuần là vô dụng. Cập nhật ngay, ngắn gọn, đúng ô.
