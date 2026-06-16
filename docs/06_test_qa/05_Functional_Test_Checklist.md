# Functional Test Checklist — VSF AI Annotation Platform MVP

**Owner:** QA Team  
**Phiên bản:** v1.0

---

## 1. Auth / RBAC

| ID | Checklist | Status | Notes |
|---|---|---|---|
| FT-AUTH-001 | Admin login thành công và thấy menu đúng quyền | Not Run | |
| FT-AUTH-002 | Annotator login thành công và chỉ thấy Dashboard/My Tasks | Not Run | |
| FT-AUTH-003 | QA login thành công và thấy QA Queue/Export nếu được cấp quyền | Not Run | |
| FT-AUTH-004 | User chưa login bị redirect về Login | Not Run | |
| FT-AUTH-005 | Annotator không truy cập được Project Setup/User Management/Audit | Not Run | |
| FT-AUTH-006 | QA không sửa được project/users nếu không có quyền Admin | Not Run | |
| FT-AUTH-007 | Login sai email/password bị block và hiển thị lỗi rõ | Not Run | |
| FT-AUTH-008 | Logout xóa session và không mở lại được trang protected bằng back/direct URL | Not Run | |
| FT-AUTH-009 | Session hết hạn hoặc token invalid bị redirect về Login/401 | Not Run | |
| FT-AUTH-010 | Inactive/disabled user không login được nếu hệ thống có trạng thái này | Not Run | |
| FT-AUTH-011 | Error message login không tiết lộ user/email nào tồn tại | Not Run | |
| FT-AUTH-012 | API auth không trả password/API key/secret trong response user/session | Not Run | |

---

## 2. Project Setup

| ID | Checklist | Status | Notes |
|---|---|---|---|
| FT-PRJ-001 | Tên project bắt buộc, 3-100 ký tự | Not Run | |
| FT-PRJ-002 | Mô tả tối đa 500 ký tự | Not Run | |
| FT-PRJ-003 | Modality cố định `Text`, không cho chọn audio/image trong MVP | Not Run | |
| FT-PRJ-004 | Deadline optional và không được nhỏ hơn ngày hiện tại | Not Run | |
| FT-PRJ-005 | LLM Endpoint bắt buộc và phải là URL `https://` hợp lệ | Not Run | |
| FT-PRJ-006 | API Key bắt buộc và được mask sau khi lưu | Not Run | |
| FT-PRJ-007 | Prompt template bắt buộc, tối thiểu 10 ký tự | Not Run | |
| FT-PRJ-008 | Prompt template có biến `{{claim_text}}` và `{{source_context}}` nếu backend áp dụng BR | Not Run | |
| FT-PRJ-009 | Assignment yêu cầu tối thiểu 1 Annotator và 1 QA | Not Run | |

---

## 3. PDF Bundle Import

| ID | Checklist | Status | Notes |
|---|---|---|---|
| FT-IMP-001 | Upload zone nhận nhiều PDF | Not Run | |
| FT-IMP-002 | Block file không phải PDF | Not Run | |
| FT-IMP-003 | Block PDF corrupt/invalid | Not Run | |
| FT-IMP-004 | Block file vượt max size cấu hình | Not Run | |
| FT-IMP-005 | `bundle_name` bắt buộc | Not Run | |
| FT-IMP-006 | Mỗi bundle phải có đúng 1 `answer_pdf` | Not Run | |
| FT-IMP-007 | Mỗi bundle phải có đúng 1 `source_ref_pdf` | Not Run | |
| FT-IMP-008 | Mỗi bundle phải có ít nhất 1 `source_content_pdf` | Not Run | |
| FT-IMP-009 | File role chỉ gồm `answer_pdf`, `source_ref_pdf`, `source_content_pdf` | Not Run | |
| FT-IMP-010 | Parse preview hiển thị article_code/title/category/tier nếu parse được | Not Run | |
| FT-IMP-011 | Parse preview hiển thị source order/title/tier | Not Run | |
| FT-IMP-012 | Missing source URL chỉ warning, không block | Not Run | |
| FT-IMP-013 | Cannot extract answer text thì bundle invalid | Not Run | |
| FT-IMP-014 | Confirm import tạo batch, PDF bundle và trigger pipeline | Not Run | |
| FT-IMP-015 | Duplicate `bundle_id` trong batch bị block nếu backend expose ID | Not Run | |

---

## 4. Background Pipeline

| ID | Checklist | Status | Notes |
|---|---|---|---|
| FT-PIP-001 | PDF parse lưu raw text và normalized text | Not Run | |
| FT-PIP-002 | Metadata parse warning không block nếu non-critical | Not Run | |
| FT-PIP-003 | Source reference phải có source_order và source_title | Not Run | |
| FT-PIP-004 | Claim extraction tạo ít nhất 1 claim cho parent task hợp lệ | Not Run | |
| FT-PIP-005 | Claim giữ đúng `claim_order` bắt đầu từ 1 | Not Run | |
| FT-PIP-006 | Citation marker map được với source order tương ứng | Not Run | |
| FT-PIP-007 | Claim không map được source vào `Source Mapping Required` | Not Run | |
| FT-PIP-008 | LLM pre-score success tạo đủ 6 score | Not Run | |
| FT-PIP-009 | LLM output sai schema đưa task vào `Pre-scoring Failed` | Not Run | |
| FT-PIP-010 | LLM baseline read-only/immutable | Not Run | |
| FT-PIP-011 | Normalization tạo Parent Task trace được về `bundle_id` và PDF filenames | Not Run | |
| FT-PIP-012 | Source content parse status đúng: `parsed`, `unparsed`, hoặc `ocr_required` | Not Run | |

---

## 5. Annotation Workspace

| ID | Checklist | Status | Notes |
|---|---|---|---|
| FT-ANN-001 | Annotator chỉ thấy task được giao | Not Run | |
| FT-ANN-002 | Workspace hiển thị answer context, metadata và PDF trace | Not Run | |
| FT-ANN-003 | Workspace hiển thị claim original/final và citation markers | Not Run | |
| FT-ANN-004 | Workspace hiển thị source order/title/tier/url/text/file ref/parse status | Not Run | |
| FT-ANN-005 | Pre-score hiển thị như AI Draft | Not Run | |
| FT-ANN-006 | Annotator có thể sửa claim text, original vẫn được giữ | Not Run | |
| FT-ANN-007 | Score chỉ nhận 0.00-1.00, tối đa 2 decimals | Not Run | |
| FT-ANN-008 | Composite score tính trung bình 6 dimension và round 2 decimals | Not Run | |
| FT-ANN-009 | Delta >= 0.20 bắt buộc justification note >= 15 ký tự | Not Run | |
| FT-ANN-010 | Source unparsed/inaccessible bắt buộc source note | Not Run | |
| FT-ANN-011 | Submit disabled/blocked khi thiếu dimension | Not Run | |
| FT-ANN-012 | Submit valid chuyển task sang `Submitted` | Not Run | |
| FT-ANN-013 | Auto-save chạy mỗi 30 giây hoặc blur event | Not Run | |
| FT-ANN-014 | Returned task hiển thị banner/comment/error type và cho resubmit | Not Run | |

---

## 6. QA Review

| ID | Checklist | Status | Notes |
|---|---|---|---|
| FT-QA-001 | QA Queue chỉ hiển thị task `Submitted` thuộc scope được giao | Not Run | |
| FT-QA-002 | QA Review hiển thị claim/source/annotator output/pre-score | Not Run | |
| FT-QA-003 | Diff view tính delta và highlight delta >= 0.20 | Not Run | |
| FT-QA-004 | History tab hiển thị submit/return/approve history | Not Run | |
| FT-QA-005 | Approve chuyển task sang `Approved` và tạo audit/history | Not Run | |
| FT-QA-006 | Return bắt buộc chọn error type | Not Run | |
| FT-QA-007 | Return bắt buộc comment tối thiểu 10 ký tự | Not Run | |
| FT-QA-008 | Return chuyển task sang `Returned` và quay lại queue annotator | Not Run | |
| FT-QA-009 | QA không sửa trực tiếp score/claim text | Not Run | |
| FT-QA-010 | QA không review task chưa `Submitted` | Not Run | |

---

## 7. Export

| ID | Checklist | Status | Notes |
|---|---|---|---|
| FT-EXP-001 | Export form yêu cầu chọn project | Not Run | |
| FT-EXP-002 | Status mặc định/chỉ cho `Approved` trong MVP | Not Run | |
| FT-EXP-003 | Format duy nhất là CSV claim-level | Not Run | |
| FT-EXP-004 | Export chỉ lấy task `Approved` | Not Run | |
| FT-EXP-005 | CSV có `bundle_id`, `answer_pdf_filename`, `source_ref_pdf_filename` | Not Run | |
| FT-EXP-006 | CSV có claim/source/pre-score/annotator/QA/status fields theo schema | Not Run | |
| FT-EXP-007 | CSV UTF-8, không lỗi tiếng Việt | Not Run | |
| FT-EXP-008 | Text có comma/newline/quote được escape đúng | Not Run | |
| FT-EXP-009 | Multiple sources join bằng delimiter thống nhất | Not Run | |
| FT-EXP-010 | Export action ghi audit log | Not Run | |

---

## 8. Audit Log

| ID | Checklist | Status | Notes |
|---|---|---|---|
| FT-AUD-001 | Log `import` khi confirm import | Not Run | |
| FT-AUD-002 | Log `claim_edit` khi sửa claim | Not Run | |
| FT-AUD-003 | Log `submit` khi annotator submit | Not Run | |
| FT-AUD-004 | Log `approve` khi QA approve | Not Run | |
| FT-AUD-005 | Log `return` khi QA return | Not Run | |
| FT-AUD-006 | Log `export` khi tạo export job | Not Run | |
| FT-AUD-007 | Chỉ Admin xem được Audit Log | Not Run | |

---

## 9. Environment / Storage / Config

| ID | Checklist | Status | Notes |
|---|---|---|---|
| FT-ENV-001 | Staging URL truy cập được sau deploy | Not Run | |
| FT-ENV-002 | Migration đã chạy, schema cần cho PDF bundle/workflow tồn tại | Not Run | |
| FT-ENV-003 | Env/config thiếu hoặc sai hiển thị lỗi rõ, không crash trắng | Not Run | |
| FT-ENV-004 | Error/log không lộ API key hoặc secret | Not Run | |
| FT-ENV-005 | Build/deploy pipeline chạy được lặp lại và smoke check pass sau deploy | Not Run | |
| FT-ENV-006 | Migration process có rollback/dry-run cơ bản hoặc cách khôi phục khi schema lỗi | Not Run | |
| FT-ENV-007 | Release checklist trước UAT có verify route/chức năng chính, backup config và người support fix nóng | Not Run | |
| FT-ENV-008 | Local/dev setup doc có env sample, cách run service và quy ước lưu PDF local/dev | Not Run | |
| FT-STO-001 | File PDF upload lưu được với metadata `bundle_id`, filename, file_role | Not Run | |
| FT-STO-002 | Source file reference hiển thị đúng trong source viewer hoặc task detail | Not Run | |
| FT-STO-003 | Export CSV trace đúng về `bundle_id`, PDF filenames và source file refs | Not Run | |
| FT-STO-004 | Storage path/naming convention và retention tạm thời được ghi rõ | Not Run | |
| FT-STO-005 | File PDF trên staging truy xuất được theo quyền hợp lệ, không broken link | Not Run | |

---

## 10. Logging / Debuggability

| ID | Checklist | Status | Notes |
|---|---|---|---|
| FT-LOG-001 | Upload log có actor, project/bundle ID, file role và kết quả validation | Not Run | |
| FT-LOG-002 | Parse log có parse status, warning/error code và bundle/file reference | Not Run | |
| FT-LOG-003 | Scoring log có provider/mock status, task ID và lỗi schema/timeout nếu có | Not Run | |
| FT-LOG-004 | Export log có actor, export ID, row count và trạng thái download | Not Run | |
| FT-LOG-005 | Log stream/dashboard cho Dev/Test debug được, không lộ secret/API key | Not Run | |

---

## 11. Frontend Testability / UI Contract

| ID | Checklist | Status | Notes |
|---|---|---|---|
| FT-UI-001 | URL canonical dùng đúng role prefix: `/admin/*`, `/annotator/*`, `/qa/*`; không phụ thuộc state-only navigation | Not Run | |
| FT-UI-002 | RoleGuard áp dụng cho direct URL vào Project Setup, Import, Annotator Tasks, Annotation Workspace, QA Queue, QA Review, Export | Not Run | |
| FT-UI-003 | Sau login, Admin vào `/admin/dashboard`, Annotator vào `/annotator/tasks`, QA vào `/qa/queue` | Not Run | |
| FT-UI-004 | Mỗi màn MVP có page-level `data-testid` đúng spec và không bị trùng trong DOM | Not Run | |
| FT-UI-005 | Login form có `data-testid`, label/placeholder cố định, input required, button text cố định và error message test ID | Not Run | |
| FT-UI-006 | Project Setup có test ID cho name, description, deadline, modality, LLM URL, API key, prompt template và next button | Not Run | |
| FT-UI-007 | Import wizard step 3-6 có test ID ổn định; next/confirm button disabled/enabled đúng theo validate/preview state | Not Run | |
| FT-UI-008 | Import staged file chip và role row động render theo filename/source index; role badge text đúng `answer_pdf`, `source_ref_pdf`, `source_content_pdf` | Not Run | |
| FT-UI-009 | Parse preview có test ID cho article code, title, source row, warning row và confirm button | Not Run | |
| FT-UI-010 | Pipeline confirm hiển thị status list, done step theo slug và nút tiếp tục phân công | Not Run | |
| FT-UI-011 | Annotator Tasks có heading, table, row `annotator-tasks-row-{claimId}` và open button `annotator-tasks-open-{claimId}` | Not Run | |
| FT-UI-012 | Annotation Workspace có test ID cho status badge, returned banner, claim textarea, reset button, 6 score inputs, composite, reason, notes, source status/note, autosave và submit | Not Run | |
| FT-UI-013 | Annotation tabs Rubric/Guideline/Examples đổi tab không làm mất draft dữ liệu đang nhập | Not Run | |
| FT-UI-014 | QA Queue có search, filter Submitted/Returned/Approved, row và review button theo claim ID | Not Run | |
| FT-UI-015 | QA Review có back button, review/history tabs, LLM/annotator/delta panels, claim/source read-only fields và delta highlight cho 6 dimension | Not Run | |
| FT-UI-016 | QA Return modal có role dialog, error type, comment, cancel và confirm; cancel không đổi trạng thái task | Not Run | |
| FT-UI-017 | Export có project select, batch select, status note, download button disabled trước khi chọn project, history table/row và re-download link | Not Run | |
| FT-UI-018 | Các label/button/tab/placeholder được automation dùng phải cố định theo vi-VN source of truth, không đổi theo build hoặc i18n động trong E2E v1 | Not Run | |
| FT-UI-019 | Tất cả input bắt buộc có label `htmlFor` hoặc `aria-label`; button/link có accessible name để Playwright fallback bằng role/label | Not Run | |
