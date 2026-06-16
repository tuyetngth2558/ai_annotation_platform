# **UI Testability — URL & Element Map (MVP)**

**Phiên bản:** v0.2 (reviewed)  
**Ngày:** 2026-06-15  
**Owner:** Nhung · Hưng (review) · Trí (implement data-testid) · Tuyết (chốt text)

## 1\. Quy ước data-testid

| Quy tắc | Ví dụ |
| :---- | :---- |
| Format | {màn}-{vùng}-{thành-phần} — kebab-case, tiếng Anh |
| Duy nhất trong trang | Không trùng id giữa các màn; dynamic id dùng suffix :claimId trong doc, code dùng giá trị thật |
| Input bắt buộc | data-testid \+ \<label htmlFor\> hoặc aria-label |
| Button / link | data-testid \+ **text hiển thị cố định** (không qua i18n động trong E2E v1) |
| Modal | Root dialog: data-testid="{màn}-modal-{tên}" |
| Bảng hàng động | data-testid="annotator-tasks-row-{claimId}" |

**Playwright ưu tiên:**

*// Ưu tiên 1*

page.getByTestId("login-email-input");

*// Ưu tiên 2 (fallback / accessibility)*

page.getByLabel("Email");

page.getByRole("button", { name: "Đăng nhập" });

## 2\. Bản đồ URL (canonical — src/frontend/web)

**Quy ước URL:** Tài liệu này dùng **role-based prefix** (/admin/\*, /annotator/\*, /qa/\*) — khớp với routes.tsx thực tế. IA (01\_Information\_Architecture.md) dùng URL phẳng (/projects/\*, /tasks/\*, /qa/\*) ở cấp gợi ý. **Bảng dưới đây là source of truth cho E2E test.**

| \# | Màn MVP | URL | Role | Guard | Component đích (FE) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| 0 | Login | /login | Public | — | LoginPage |
| 1 | Import PDF Bundle | /admin/import | ADMIN | RoleGuard | ImportBundlePage |
| 1b | Project setup (tiền đề) | /admin/projects/new | ADMIN | RoleGuard | ProjectSetupPage |
| 2 | Danh sách task annotator | /annotator/tasks | ANNOTATOR | RoleGuard | MyTasksPage |
| 3 | Annotation workspace | /annotator/tasks/:claimId | ANNOTATOR | RoleGuard | AnnotationWorkspacePage |
| 4a | QA queue | /qa/queue | QA | RoleGuard | QaQueuePage |
| 4b | QA review | /qa/review/:claimId | QA | RoleGuard | QaReviewWorkspacePage |
| 5 | Export CSV | /admin/export | ADMIN, QA | RoleGuard | ExportPage |

**Landing sau login** (đã có E2E e2e/auth.spec.ts):

| Role | URL landing |
| :---- | :---- |
| ADMIN | /admin/dashboard |
| ANNOTATOR | /annotator/tasks |
| QA | /qa/queue |

**Tham số động E2E (happy path):**

| Param | Giá trị mock gợi ý |
| :---: | :---: |
| :claimId | CT-001 (annotator submit) · CT-002 (QA review submitted) |

## 3\. Luồng E2E happy path (URL sequence)

### 3.1. Happy path — Approve

/login

  → (ADMIN) /admin/projects/new → /admin/import

  → parse preview → confirm import

  → (ANNOTATOR) /annotator/tasks → /annotator/tasks/CT-001

  → submit annotation

  → (QA) /qa/queue → /qa/review/CT-001

  → approve

  → (ADMIN) /admin/export → download CSV

### 3.2. Return → Re-annotate → Approve

 → (QA) /qa/queue → /qa/review/CT-001

  → return (modal: chọn error type \+ comment)

  → (ANNOTATOR) /annotator/tasks — CT-001 status "Returned"

  → /annotator/tasks/CT-001 — returned banner hiển thị

  → sửa score / claim text → submit lại

  → (QA) /qa/queue — CT-001 xuất hiện lại

  → /qa/review/CT-001 — tab "Lịch sử chỉnh sửa" có log

  → approve

## 4\. Màn 0 — Login (/login)

**Page test id:** login-page

| Element | data-testid | Label (cố định) | Placeholder (cố định) | Text button / ghi chú |
| :---: | :---: | :---: | :---: | :---: |
| Form | login-form | — | — | — |
| Email input | login-email-input | Email | Nhập email... | type="email", required |
| Password input | login-password-input | Mật khẩu | Nhập mật khẩu... | type="password", required |
| Submit | login-submit-button | — | — | Text: **Đăng nhập** |
| Error message | login-error-message | — | — | Chỉ hiện khi lỗi auth |
| Demo note (read-only) | login-demo-note | — | — | Không click trong E2E regression |

**Gap ui\_src hiện tại:** label Email hệ thống / Mật khẩu; button Vào Workspace; không placeholder; không data-testid.  
**Khớp app chính:** features/auth/locales/vi.json — cần bổ sung key emailPlaceholder, passwordPlaceholder.

**Playwright mẫu:**

await page.goto("/login");

await page.getByTestId("login-email-input").fill("annotator@vsf.local");

await page.getByTestId("login-password-input").fill("annotator-demo-2026");

await page.getByTestId("login-submit-button").click();

await expect(page).toHaveURL(/\\/annotator\\/tasks/);

## 5\. Màn 1 — Import PDF Bundle (/admin/import)

**Page test id:** import-bundle-page  
**Wizard steps** (khớp ui\_src \+ Screen Spec §2): dùng data-testid="import-step-{n}" trên panel nội dung.

| Bước | Tiêu đề hiển thị (cố định) | data-testid step |
| :---: | :---: | :---: |
| 3 | Upload PDF | import-step-3 |
| 4 | Gán role / Validate | import-step-4 |
| 5 | Preview parse | import-step-5 |
| 6 | Confirm import | import-step-6 |

### 5.1. Upload zone (bước 3\)

| Element | data-testid | Label / mô tả | Placeholder / text cố định |
| :---: | :---: | :---: | :---: |
| Upload dropzone | import-upload-dropzone | — | Heading: **Thả file PDF Bundle tại đây** |
| File input | import-upload-file-input | — | accept=".pdf", multiple |
| Staged file chip (động) | import-staged-file-{filename} | — | VD: answer\_oda\_001.pdf |
| Next | import-step3-next-button | — | Text: **Tiếp tục (Gán role)** |

### 5.2. Validate bundle (bước 4\)

| Element | data-testid | Label | Text button |
| :---: | :---: | :---: | :---: |
| Role mapper table | import-bundle-role-mapper | — | — |
| Row answer\_pdf | import-role-row-answer-pdf | — | Badge text: answer\_pdf |
| Row source\_ref\_pdf | import-role-row-source-ref-pdf | — | Badge text: source\_ref\_pdf |
| Row source\_content (×N) | import-role-row-source-content-{n} | — | Badge text: source\_content\_pdf |
| Validate button | import-validate-bundle-button | — | **Chạy xác thực PDF Bundle** |
| Validation success | import-validation-success | — | Chứa text: Xác thực hoàn tất |
| Validation warning | import-validation-warning | — | VD: SOURCE\_URL\_MISSING |
| Next | import-step4-next-button | — | **Tiếp tục (Preview parse)** — disabled khi chưa validate |

### 5.3. Parse preview (bước 5\)

| Element | data-testid | Nội dung read-only (assert) |
| :---: | :---: | :---: |
| Preview panel | import-parse-preview-panel | — |
| article\_code | import-preview-article-code | VD: ODA-001 |
| title | import-preview-title | — |
| Source row | import-preview-source-{order} | VD: source \[1\] |
| Warning row | import-preview-warning | SOURCE\_URL\_MISSING |
| Confirm next | import-step5-confirm-button | Text: **Xác nhận import** |

### 5.4. Confirm import (bước 6\)

| Element | data-testid | Text / state |
| :---: | :---: | :---: |
| Pipeline status list | import-pipeline-status | Items: Uploaded Bundle, Parsing PDF, Claim Extraction… |
| Done step | import-pipeline-step-done-{slug} | State text: Done |
| Continue assignment | import-step6-next-button | **Tiếp tục (Phân công)** |

### 5.5. Project setup tiền đề (/admin/projects/new) — tùy chọn E2E v1

| Element | data-testid | Label | Placeholder |
| :---: | :---: | :---: | :---: |
| Project name | project-setup-name-input | Tên dự án | Nhập tên dự án... |
| Description | project-setup-description-input | Mô tả mục tiêu dự án | Nêu rõ yêu cầu chỉ định... |
| Deadline | project-setup-deadline-input | Hạn chót thẩm định | — |
| Modality | project-setup-modality-select | Modality type | Option cố định: Text (Văn bản) |
| LLM URL | project-setup-llm-url-input | LLM Pre-score Endpoint URL | https://... |
| API Key | project-setup-api-key-input | API Key bảo mật | — |
| Prompt template | project-setup-prompt-textarea | Prompt template phân tích | — |
| Next to import | project-setup-next-button | — | **Tiếp tục (Upload PDF)** |

## 6\. Màn 2 — Annotator tasks (/annotator/tasks)

**Page test id:** annotator-tasks-page

| Element | data-testid | Text / ghi chú |
| :---: | :---: | :---: |
| Page heading | annotator-tasks-heading | **Nhiệm vụ được giao** |
| Task table | annotator-tasks-table | — |
| Task row | annotator-tasks-row-{claimId} | — |
| Open workspace | annotator-tasks-open-{claimId} | Text: **Mở chấm điểm** (Returned: **Chỉnh sửa**) |

**Playwright:**

await page.getByTestId("annotator-tasks-open-CT-001").click();

await expect(page).toHaveURL(/\\/annotator\\/tasks\\/CT-001/);

## 7\. Màn 3 — Annotation workspace (/annotator/tasks/:claimId)

**Page test id:** annotation-workspace-page

### 7.1. Header & trạng thái

| Element | data-testid | Text / assert |
| :---: | :---: | :---: |
| Status badge | annotation-status-badge | In Annotation | Returned | Submitted |
| QA return banner | annotation-returned-banner | Chỉ khi Returned |

### 7.2. Claim & scoring (panel giữa)

| Element | data-testid | Label | Placeholder |
| :---: | :---: | :---: | :---: |
| Claim textarea | annotation-claim-text | Nội dung nhận định (Claim text) | Điều chỉnh nhận định nếu AI viết chưa sát... |
| Reset claim | annotation-claim-reset-button | — | **Khôi phục bản gốc** |
| Score SF | annotation-score-sf-input | SF | — |
| Score SC | annotation-score-sc-input | SC | — |
| Score NH | annotation-score-nh-input | NH | — |
| Score SQ | annotation-score-sq-input | SQ | — |
| Score REL | annotation-score-rel-input | REL | — |
| Score COMP | annotation-score-comp-input | COMP | — |
| Composite display | annotation-composite-score | Composite score | — |
| Reason (bắt buộc nếu delta \> 0.20) | annotation-reason-textarea | Lý do thay đổi | Báo cáo lý do nếu chấm lệch score quá lớn (delta \> ±0.20)... |
| Notes | annotation-notes-textarea | Ghi chú bổ sung (Notes) | Ghi chú thêm thông tin cho QA Specialist... |
| Source status | annotation-source-status-select | Đánh giá trạng thái nguồn (Source status) | Option đầu: \--- Chọn kết luận nguồn \--- |
| Source note | annotation-source-note-textarea | Ghi chú nguồn (Source note) | Ghi chú chi tiết nếu không truy cập được link hoặc phát sinh lỗi mapping... |
| Auto-save indicator | annotation-autosave-indicator | — | Text: **Đã lưu nháp** / **Đang lưu...** — cập nhật tự động |
| Submit | annotation-submit-button | — | **Gửi đánh giá lên QA Queue** |

### 7.3. Rubric tabs (panel phải)

| Element | data-testid | Text tab |
| :---: | :---: | :---: |
| Tab rubric | annotation-tab-rubric | **Tiêu chí Rubric** |
| Tab guideline | annotation-tab-guideline | **Hướng dẫn** |
| Tab examples | annotation-tab-examples | **Bài mẫu ví dụ** |

**Playwright happy path (rút gọn):**

await page.goto("/annotator/tasks/CT-001");

await page.getByTestId("annotation-source-status-select").selectOption("source\_text\_parsed");

await page.getByTestId("annotation-submit-button").click();

await expect(page.getByTestId("annotation-status-badge")).toHaveText("Submitted");

## 8\. Màn 4a — QA Queue (/qa/queue)

**Page test id:** qa-queue-page

| Element | data-testid | Label / text |
| :---: | :---: | :---: |
| Search | qa-queue-search-input | Placeholder: **Tìm kiếm theo mã task, annotator hoặc mã bài viết...** |
| Filter submitted | qa-queue-filter-submitted | **Chờ duyệt** |
| Filter returned | qa-queue-filter-returned | **Đã trả về** |
| Filter approved | qa-queue-filter-approved | **Đã duyệt** |
| Row | qa-queue-row-{claimId} | — |
| Open review | qa-queue-review-{claimId} | **Mở thẩm định** |

## 9\. Màn 4b — QA Review (/qa/review/:claimId)

**Page test id:** qa-review-page

### 9.1. Navigation & tabs

| Element | data-testid | Text |
| :---: | :---: | :---: |
| Back to queue | qa-review-back-button | **Quay lại hàng đợi** |
| Tab review | qa-review-tab-review | **Chi tiết chấm điểm** |
| Tab history | qa-review-tab-history | **Lịch sử chỉnh sửa** |

### 9.2. Diff panels (read-only assert)

| Element | data-testid | Heading |
| :---: | :---: | :---: |
| LLM baseline | qa-review-llm-scores | LLM Baseline Scores |
| Annotator scores | qa-review-annotator-scores | Annotator Scores |
| Delta | qa-review-delta-scores | Độ lệch (Delta) |
| Delta highlight SF | qa-review-delta-highlight-sf | Highlight khi \` |
| Delta highlight SC | qa-review-delta-highlight-sc | Highlight khi \` |
| Delta highlight NH | qa-review-delta-highlight-nh | Highlight khi \` |
| Delta highlight SQ | qa-review-delta-highlight-sq | Highlight khi \` |
| Delta highlight REL | qa-review-delta-highlight-rel | Highlight khi \` |
| Delta highlight COMP | qa-review-delta-highlight-comp | Highlight khi \` |
| Claim text | qa-review-claim-text | — |
| Source status | qa-review-source-status | — |

### 9.3. Quyết định QA

| Element | data-testid | Text button |
| :---: | :---: | :---: |
| Approve | qa-review-approve-button | **Phê duyệt hồ sơ** |
| Return open | qa-review-return-button | **Trả lại xử lý** |

### 9.4. Modal Return

| Element | data-testid | Label | Placeholder |
| :---: | :---: | :---: | :---: |
| Modal root | qa-return-modal | — | role="dialog" |
| Error type | qa-return-error-type-select | Phân loại sai sót (Error type) | Option đầu: Chọn loại lỗi phát hiện |
| Comment | qa-return-comment-textarea | Ý kiến phản hồi | Nêu rõ lý do trả hàng và những điểm cần chỉnh sửa... |
| Cancel | qa-return-cancel-button | — | **Hủy bỏ** |
| Confirm | qa-return-confirm-button | — | **Xác nhận trả claim** |

**Playwright approve:**

await page.goto("/qa/review/CT-001");

await page.getByTestId("qa-review-approve-button").click();

await expect(page).toHaveURL(/\\/qa\\/queue/);

## 10\. Màn 5 — Export CSV (/admin/export)

**Page test id:** export-page

| Element | data-testid | Label | Text / Placeholder |
| :---: | :---: | :---: | :---: |
| Page heading | export-heading | — | **Xuất dữ liệu** |
| Project select | export-project-select | Chọn dự án | Option đầu: \--- Chọn dự án \--- |
| Batch filter (tùy chọn) | export-batch-select | Lọc theo batch | Option đầu: Tất cả batch |
| Status note (read-only) | export-status-note | — | Text: Chỉ xuất claim đã được Approved |
| Export button | export-download-button | — | **Tải xuống CSV** — disabled khi chưa chọn project |
| Export history table | export-history-table | — | — |
| History row | export-history-row-{exportId} | — | Cột: tên file, ngày, user, số claim |
| Download link | export-history-download-{exportId} | — | **Tải lại** |

**Playwright mẫu:**

await page.goto("/admin/export");

await page.getByTestId("export-project-select").selectOption("vivipedia-demo");

await page.getByTestId("export-download-button").click();

const download \= await page.waitForEvent("download");

expect(download.suggestedFilename()).toMatch(/\\.csv$/);

## 11\. Màn hình ngoài phạm vi E2E v1 (ghi nhận)

| Màn | URL (gợi ý IA) | Trạng thái E2E | Ghi chú |
| :---: | :---: | :---: | :---: |
| Admin Dashboard | /admin/dashboard | ⏳ E2E v2 | Landing page; Tom\_tat §7 không yêu cầu cho sprint hiện tại |
| User Management | /admin/users | ⏳ E2E v2 | RBAC cơ bản — seed user qua DB/CLI trong MVP |
| Audit Log | /admin/audit | ⏳ E2E v2 | Ghi log import/submit/approve/return — UI xem log chưa ưu tiên |

---

## 12\. Checklist Trí

Trước khi team Test mở rộng automation ngoài Login, cần **tick đủ**:

* \[ \] Router khớp bảng §2 (không dùng state activeView)  
* \[ \] Mỗi dòng trong §4–§10 có data-testid trên DOM  
* \[ \] Label \+ placeholder khớp cột "cố định" (vi-VN; không đổi giữa build)  
* \[ \] Text button khớp (chữ thường/hoa thống nhất — khuyến nghị: capitalize đầu câu như bảng trên)  
* \[ \] i18n: key vi là source truth cho E2E; en mirror nếu cần  
* \[ \] File Figma/spec pixel (ngoài phạm vi doc này) — Tuyết review

## 13\. Đối chiếu nhanh  → spec

| Hạng mục | Spec này |
| :---: | :---: |
| URL routing | ✅ Path RESTful |
| data-testid | ✅ \~75 id đề xuất |
| Login placeholder | ✅ Nhập email... |
| Login button | Đăng nhập |
| Import button validate | Chạy xác thực PDF Bundle |
| Annotator open task | Mở chấm điểm |
| QA review button | Mở thẩm định |
| Submit annotation | Gửi đánh giá lên QA Queue |

## 

