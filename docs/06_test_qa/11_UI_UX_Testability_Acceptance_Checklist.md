# UI/UX Testability Acceptance Checklist - MVP

**Source of truth:** `UI Testability — URL & Element Map (MVP).md`  
**Mục tiêu:** kiểm thử frontend đúng theo PRD UI/UX; ưu tiên bắt lỗi route, guard, `data-testid`, label, placeholder, text button, modal, tab, disabled state và download ngay trong một lần chạy.

---

## 0. Cách Dùng File Này Cho Dễ Hiểu

Bạn không cần đọc hết file từ đầu đến cuối. Khi test giao diện hôm nay, làm theo thứ tự này là được:

1. Mở app frontend trên browser.
2. Chuẩn bị 3 tài khoản: Admin, Annotator, QA.
3. Đi thẳng xuống section **6. Manual Test Cases - Thao Tác Để Chạy**.
4. Chạy từng dòng từ `UIUX-MAN-001` đến `UIUX-MAN-020`.
5. Sau mỗi case, điền kết quả vào section **9. Test Execution - Điền Kết Quả Khi Chạy**.
6. Nếu đúng như cột **Kết quả đúng**, ghi `Pass`.
7. Nếu sai như cột **Báo bug khi**, ghi `Fail`, chụp screenshot, tạo bug và điền `Bug ID`.
8. Nếu chưa chạy được vì thiếu data, thiếu account hoặc app lỗi trước đó, ghi `Blocked`.

Nói ngắn gọn: **section 6, 7, 8 là nơi bạn xem phải thao tác gì; section 9 là nơi bạn điền kết quả.**

### Luồng Test Chính Cần Hình Dung

| Giai đoạn | Bạn sẽ làm gì trên giao diện | Test case tương ứng |
|---|---|---|
| 1. Login và phân quyền | Đăng nhập sai, đăng nhập đúng từng role, thử vào trang không đúng quyền. | `UIUX-MAN-001` -> `UIUX-MAN-004` |
| 2. Admin setup/import | Admin tạo project, upload PDF, gán role file, validate, preview, confirm import. | `UIUX-MAN-005` -> `UIUX-MAN-009` |
| 3. Annotator chấm điểm | Annotator mở task, kiểm form, sửa claim/score, kiểm autosave, submit lên QA. | `UIUX-MAN-010` -> `UIUX-MAN-014` |
| 4. QA review | QA tìm task, mở review, kiểm read-only/delta, return hoặc approve. | `UIUX-MAN-015` -> `UIUX-MAN-019` |
| 5. Export | Admin/QA vào export, kiểm nút download, tải CSV, kiểm history. | `UIUX-MAN-020` |
| 6. Trường hợp ngách | Thử các lỗi dễ phát sinh: refresh/back, double click, file sai, empty state, lỗi API, không có data. | `UIUX-EDGE-001` -> `UIUX-EDGE-020` |
| 7. Kiểm UI/UX mở rộng | Thử responsive, keyboard, accessibility cơ bản, menu theo role, nhiều tab, download, copy và layout. | `UIUX-EXT-001` -> `UIUX-EXT-020` |

### Cách Điền Kết Quả

| Nếu gặp tình huống | Điền Status | Điền thêm gì |
|---|---|---|
| Màn hình đúng như mô tả. | `Pass` | Ghi ngắn ở `Actual result`, ví dụ: "Đúng như expected." |
| Màn hình sai, thiếu nút, sai URL, sai text, không thao tác được. | `Fail` | Ghi lỗi ở `Actual result`, tạo bug, điền `Bug ID`, đính kèm screenshot. |
| Không test được vì thiếu account, thiếu file PDF, thiếu data `CT-001`, app chưa deploy. | `Blocked` | Ghi lý do blocked ở `Notes`. |
| Case không áp dụng cho build hiện tại. | `N/A` | Ghi lý do vì sao không áp dụng. |

---

## 0.1. Checklist Trước Khi Bắt Đầu Test

Tick nhanh phần này trước khi chạy 60 case. Nếu thiếu mục nào, ghi `Blocked` cho case liên quan thay vì cố test tiếp.

| Hạng mục cần chuẩn bị | Đã có? | Ghi chú |
|---|---|---|
| URL frontend/staging đang truy cập được. |  |  |
| Backend/API đang chạy và login được. |  |  |
| Có account Admin. |  |  |
| Có account Annotator. |  |  |
| Có account QA. |  |  |
| Có test PDF bundle hợp lệ. |  |  |
| Có file non-PDF để test upload sai định dạng. |  |  |
| Có file PDF corrupt/invalid nếu cần chạy edge case. |  |  |
| Có project/test data `vivipedia-demo` hoặc mapping project tương đương. |  |  |
| Có claim/task `CT-001` hoặc mapping claim tương đương. |  |  |
| Biết nơi tạo bug và lấy `Bug ID`. |  |  |
| Biết nơi lưu screenshot/evidence. |  |  |

---

## 1. Nguyên Tắc Pass/Fail

| Rule | Pass | Fail và cách báo lỗi |
|---|---|---|
| Canonical URL | URL dùng đúng role prefix trong PRD: `/admin/*`, `/annotator/*`, `/qa/*`. | Sai URL, redirect sai, hoặc dùng state-only navigation: báo bug `P0` nếu chặn luồng chính; báo `P1` nếu chỉ ảnh hưởng automation. |
| RoleGuard | User chỉ vào được màn hình đúng role. | Lộ dữ liệu hoặc vào được trang trái quyền: báo bug `P0`. |
| Page root test ID | Mỗi page có đúng 1 root `data-testid`. | Thiếu/trùng root test ID: báo bug `P0` với màn chính; báo `P1` với màn phụ. |
| Element test ID | Tất cả element trong PRD có `data-testid` trên DOM khi visible/applicable. | Thiếu/sai test ID: báo bug `P0` nếu automation không thao tác được happy path; ngược lại báo `P1`. |
| Fixed UI copy | Button, tab, modal label và placeholder khớp PRD. | Text sai làm Playwright role/label fail: báo bug `P1`; sai nghĩa nghiệp vụ: báo `P0/P1` theo tác động. |
| Disabled/enabled state | Nút Next/Confirm/Submit/Download bị khóa/mở đúng điều kiện. | Mở sai làm sai data/state: báo bug `P0`; chỉ sai UX feedback: báo `P1/P2`. |
| Modal/tab behavior | Modal có role dialog; Cancel không đổi data; tab không làm mất draft. | Đổi data sai hoặc mất draft: báo bug `P0`; render sai hoặc không accessible: báo `P1`. |
| Error visibility | Lỗi auth/validation/API hiển thị rõ, không blank page. | Blank/crash/không có lỗi: báo bug `P0`; message mơ hồ: báo `P2`. |

---

## 2. Test Data Bắt Buộc

| Key | Giá trị gợi ý | Dùng cho |
|---|---|---|
| Admin account | `admin@vsf.local` | Login, project setup, import, export. |
| Annotator account | `annotator@vsf.local` | My Tasks, Annotation Workspace. |
| QA account | `qa@vsf.local` | QA Queue, QA Review. |
| Claim happy path | `CT-001` | Submit, return, approve. |
| Claim QA submitted | `CT-002` | QA review/read-only/delta. |
| Project | `vivipedia-demo` | Import/export. |
| Warning code | `SOURCE_URL_MISSING` | Parse preview warning. |

Nếu seed data khác PRD, ghi rõ mapping trong test report trước khi chạy.

---

## 3. Route Và Guard Contract

| ID | Role | URL | Expected page/root test ID | Must assert |
|---|---|---|---|---|
| UIUX-ROUTE-001 | Public | `/login` | `login-page` | Login form visible; protected nav hidden. |
| UIUX-ROUTE-002 | ADMIN | `/admin/projects/new` | Project setup page root, nếu đã implement. | Annotator/QA direct URL bị chặn. |
| UIUX-ROUTE-003 | ADMIN | `/admin/import` | `import-bundle-page` | Wizard visible từ step upload/role mapping flow. |
| UIUX-ROUTE-004 | ANNOTATOR | `/annotator/tasks` | `annotator-tasks-page` | Chỉ task được assign visible. |
| UIUX-ROUTE-005 | ANNOTATOR | `/annotator/tasks/CT-001` | `annotation-workspace-page` | QA/Admin-only action hidden. |
| UIUX-ROUTE-006 | QA | `/qa/queue` | `qa-queue-page` | Chỉ queue QA visible. |
| UIUX-ROUTE-007 | QA | `/qa/review/CT-001` | `qa-review-page` | Score/claim read-only. |
| UIUX-ROUTE-008 | ADMIN/QA allowed | `/admin/export` | `export-page` | Download disabled đến khi chọn project. |
| UIUX-ROUTE-009 | Each role | Sau login | Role landing đúng PRD. | ADMIN vào `/admin/dashboard`; ANNOTATOR vào `/annotator/tasks`; QA vào `/qa/queue`. |

---

## 4. Selector Và UI Copy Contract

### 4.1 Login

| ID | Element | Required selector/copy | Fail condition |
|---|---|---|---|
| UIUX-LOGIN-001 | Page | `login-page`. | Root missing/trùng. |
| UIUX-LOGIN-002 | Form | `login-form`. | Form không visible. |
| UIUX-LOGIN-003 | Email | `login-email-input`, label `Email`, placeholder `Nhập email...`, required, type email. | Sai label/placeholder/type/required. |
| UIUX-LOGIN-004 | Password | `login-password-input`, label `Mật khẩu`, placeholder `Nhập mật khẩu...`, required, type password. | Sai label/placeholder/type/required. |
| UIUX-LOGIN-005 | Submit | `login-submit-button`, text `Đăng nhập`. | Text sai hoặc click không submit. |
| UIUX-LOGIN-006 | Auth error | `login-error-message`. | Login sai không hiện lỗi. |

### 4.2 Project Setup

| ID | Element group | Required selectors | Fail condition |
|---|---|---|---|
| UIUX-PRJ-001 | Required fields | `project-setup-name-input`, `project-setup-description-input`, `project-setup-deadline-input`. | Thiếu selector/label hoặc validation không rõ. |
| UIUX-PRJ-002 | Modality | `project-setup-modality-select`, option Text only. | Chọn được audio/image trong MVP. |
| UIUX-PRJ-003 | LLM config | `project-setup-llm-url-input`, `project-setup-api-key-input`, `project-setup-prompt-textarea`. | Thiếu field hoặc API key hiện plain text sau save. |
| UIUX-PRJ-004 | Continue | `project-setup-next-button`, text `Tiếp tục (Upload PDF)`. | Mở khi form invalid hoặc không route sang import. |

### 4.3 Import PDF Bundle

| ID | Step | Required assertions | Fail condition |
|---|---|---|---|
| UIUX-IMP-001 | Step 3 upload | `import-step-3`, `import-upload-dropzone`, `import-upload-file-input`, staged chip `import-staged-file-{filename}`, `import-step3-next-button`. | Không upload/multiple PDF được hoặc chip không hiện filename. |
| UIUX-IMP-002 | Step 4 role/validate | `import-step-4`, role rows `import-role-row-answer-pdf`, `import-role-row-source-ref-pdf`, `import-role-row-source-content-{n}`. | Thiếu row, badge role sai, hoặc next không disabled trước validate. |
| UIUX-IMP-003 | Validate success/warning | `import-validate-bundle-button`, `import-validation-success`, `import-validation-warning`. | Success/warning không hiện đúng, hoặc `SOURCE_URL_MISSING` block import. |
| UIUX-IMP-004 | Step 5 preview | `import-step-5`, `import-parse-preview-panel`, `import-preview-article-code`, `import-preview-title`, `import-preview-source-{order}`, `import-preview-warning`, `import-step5-confirm-button`. | Metadata/source/warning missing hoặc confirm mở trước preview. |
| UIUX-IMP-005 | Step 6 confirm | `import-step-6`, `import-pipeline-status`, `import-pipeline-step-done-{slug}`, `import-step6-next-button`. | Pipeline status không rõ hoặc không có done step. |

### 4.4 Annotator Tasks Và Workspace

| ID | Screen | Required assertions | Fail condition |
|---|---|---|---|
| UIUX-ANN-001 | Tasks list | `annotator-tasks-page`, `annotator-tasks-heading`, `annotator-tasks-table`, row `annotator-tasks-row-CT-001`, action `annotator-tasks-open-CT-001`. | Row/action missing hoặc click không vào `/annotator/tasks/CT-001`. |
| UIUX-ANN-002 | Workspace header | `annotation-workspace-page`, `annotation-status-badge`, `annotation-returned-banner` khi Returned. | Status sai hoặc returned banner missing. |
| UIUX-ANN-003 | Claim/scoring | `annotation-claim-text`, `annotation-claim-reset-button`, 6 score inputs SF/SC/NH/SQ/REL/COMP, `annotation-composite-score`. | Reset không khôi phục, hoặc composite không update. |
| UIUX-ANN-004 | Required notes/source | `annotation-reason-textarea`, `annotation-notes-textarea`, `annotation-source-status-select`, `annotation-source-note-textarea`. | Delta/source issue không bắt note. |
| UIUX-ANN-005 | Autosave/submit | `annotation-autosave-indicator`, `annotation-submit-button`. | Mất draft sau reload hoặc submit invalid vẫn được. |
| UIUX-ANN-006 | Tabs | `annotation-tab-rubric`, `annotation-tab-guideline`, `annotation-tab-examples`. | Đổi tab mất draft hoặc content không render. |

### 4.5 QA Queue Và QA Review

| ID | Screen | Required assertions | Fail condition |
|---|---|---|---|
| UIUX-QA-001 | Queue | `qa-queue-page`, `qa-queue-search-input`, `qa-queue-filter-submitted`, `qa-queue-filter-returned`, `qa-queue-filter-approved`. | Search/filter sai kết quả. |
| UIUX-QA-002 | Queue row | `qa-queue-row-CT-001`, `qa-queue-review-CT-001`. | Click không vào `/qa/review/CT-001`. |
| UIUX-QA-003 | Review nav/tabs | `qa-review-page`, `qa-review-back-button`, `qa-review-tab-review`, `qa-review-tab-history`. | Back/tab sai route hoặc history missing sau return/resubmit. |
| UIUX-QA-004 | Diff/read-only | `qa-review-llm-scores`, `qa-review-annotator-scores`, `qa-review-delta-scores`, delta highlight cho SF/SC/NH/SQ/REL/COMP. | Delta >= 0.20 không highlight hoặc field edit được. |
| UIUX-QA-005 | Approve | `qa-review-approve-button`. | Approve không về queue hoặc không đổi status Approved. |
| UIUX-QA-006 | Return modal | `qa-review-return-button`, `qa-return-modal`, `qa-return-error-type-select`, `qa-return-comment-textarea`, `qa-return-cancel-button`, `qa-return-confirm-button`. | Confirm cho phép thiếu error/comment; cancel lại đổi status. |

### 4.6 Export

| ID | Element | Required assertions | Fail condition |
|---|---|---|---|
| UIUX-EXP-001 | Page/form | `export-page`, `export-heading`, `export-project-select`, `export-batch-select`, `export-status-note`. | Status note missing hoặc project select không bắt buộc. |
| UIUX-EXP-002 | Download button | `export-download-button` disabled khi chưa chọn project; enabled khi project hợp lệ. | Download mở sai lúc hoặc không tạo `.csv`. |
| UIUX-EXP-003 | Export history | `export-history-table`, `export-history-row-{exportId}`, `export-history-download-{exportId}`. | History thiếu filename/date/user/claim count hoặc re-download tạo duplicate job. |

---

## 5. One-Shot Run Order

1. Login sai credentials, assert `login-error-message`.
2. Login đúng từng role, assert landing URL theo PRD.
3. Direct URL protected bằng sai role, assert blocked/redirect.
4. Admin tạo/check project, assert Project Setup selectors.
5. Admin import PDF Bundle từ step 3 đến step 6, assert disabled state, warning, preview, pipeline.
6. Annotator mở `/annotator/tasks`, click `CT-001`, assert workspace selectors.
7. Annotation: đổi score, assert composite; đổi tab, assert draft còn; submit valid.
8. QA mở queue, search/filter, mở review, assert diff/read-only.
9. QA return với thiếu error/comment, assert blocked; cancel modal, assert status chưa đổi.
10. QA return hợp lệ; Annotator resubmit; QA xem history; approve.
11. Admin/QA export, assert button disabled/enabled, file `.csv`, history re-download.
12. Chụp screenshot/trace cho bất kỳ fail nào và tạo bug theo severity ở section 1.

---

## 6. Manual Test Cases - Thao Tác Để Chạy

Dùng bảng này khi test tay. Mỗi dòng là một test case có thể chạy độc lập nếu đã có account/test data.

Cách đọc một dòng test:

- **Mục tiêu:** case này kiểm cái gì.
- **Thao tác test:** bạn làm gì trên màn hình, theo đúng thứ tự.
- **Kết quả đúng:** nếu app đúng thì bạn phải nhìn thấy gì.
- **Báo bug khi:** nếu gặp các dấu hiệu này thì ghi `Fail` và tạo bug.

Ví dụ: với `UIUX-MAN-001`, bạn mở `/login`, nhập sai tài khoản, bấm `Đăng nhập`. Nếu app hiện lỗi và vẫn ở trang login thì `Pass`; nếu app không hiện lỗi hoặc cho đăng nhập luôn thì `Fail`.

| Test case | Mục tiêu | Thao tác test | Kết quả đúng | Báo bug khi |
|---|---|---|---|---|
| UIUX-MAN-001 | Kiểm login sai có báo lỗi. | 1. Mở `/login`. 2. Nhập email/password sai. 3. Click `Đăng nhập`. | Vẫn ở login; hiện `login-error-message`; không tạo session. | Không hiện lỗi, login vào được, blank page, hoặc lỗi console làm form hỏng. |
| UIUX-MAN-002 | Kiểm login đúng từng role. | 1. Login Admin. 2. Logout. 3. Login Annotator. 4. Logout. 5. Login QA. | Admin vào `/admin/dashboard`; Annotator vào `/annotator/tasks`; QA vào `/qa/queue`. | Landing sai URL, role thấy menu không đúng, hoặc bị redirect lung tung. |
| UIUX-MAN-003 | Kiểm chặn truy cập sai role. | 1. Login Annotator. 2. Gõ trực tiếp `/admin/import`. 3. Gõ `/qa/queue`. 4. Login QA và gõ `/admin/projects/new`. | Bị chặn/redirect về trang phù hợp; không lộ data admin/QA. | Annotator/QA vào được màn không đúng quyền hoặc thấy dữ liệu trái quyền. |
| UIUX-MAN-004 | Kiểm Login UI đúng PRD. | Mở `/login`, nhìn/click form login. | Có email, password, label, placeholder, required, nút `Đăng nhập`, error area khi sai credentials. | Thiếu field, sai text, nút không click được, placeholder/label khác PRD. |
| UIUX-MAN-005 | Kiểm Project Setup. | Login Admin, mở `/admin/projects/new`, nhập lần lượt field bắt buộc và bỏ trống từng field để xem validation. | Có name, description, deadline, modality Text, LLM URL, API key, prompt, nút tiếp tục; invalid thì không cho tiếp. | Thiếu field/test id, nút tiếp tục mở khi form sai, modality chọn được audio/image. |
| UIUX-MAN-006 | Kiểm Upload PDF step 3. | Login Admin, mở `/admin/import`, upload nhiều PDF test. | Dropzone/file input đúng; mỗi file hiện chip tên file; nút step 3 đi tiếp hoạt động sau upload hợp lệ. | Upload không được, không hiện file, nhận non-PDF không báo lỗi, hoặc nút next sai trạng thái. |
| UIUX-MAN-007 | Kiểm Role mapping step 4. | Gán role `answer_pdf`, `source_ref_pdf`, `source_content_pdf`, bấm validate. Thử một lần thiếu/trùng role. | Thiếu/trùng role bị báo lỗi; đủ role thì hiện validation success; nút next chỉ mở sau validate pass. | Import cho đi tiếp khi chưa validate, sai role mà vẫn pass, hoặc lỗi không rõ. |
| UIUX-MAN-008 | Kiểm Preview parse step 5. | Sau validate pass, mở preview parse. Kiểm article code, title, source rows, warning nếu có. | Preview hiện metadata/source; warning `SOURCE_URL_MISSING` hiện nhưng không block confirm. | Preview thiếu data, warning block sai, hoặc confirm mở khi preview chưa load. |
| UIUX-MAN-009 | Kiểm Confirm import step 6. | Click confirm import và quan sát pipeline status. | Hiện status list, các step done, có nút tiếp tục/phân công nếu spec có. | Confirm xong blank page, không có status, hoặc không biết pipeline đang chạy hay done. |
| UIUX-MAN-010 | Kiểm Annotator task list. | Login Annotator, mở `/annotator/tasks`, tìm task `CT-001`, click mở/chỉnh sửa. | Chỉ thấy task được giao; click vào `/annotator/tasks/CT-001`. | Thấy task không được giao, không có row/action, hoặc click sai URL. |
| UIUX-MAN-011 | Kiểm Annotation form. | Trong workspace, xem claim, 6 score SF/SC/NH/SQ/REL/COMP, reason, notes, source status/note. | Các field đầy đủ; status badge đúng; submit chỉ được khi data hợp lệ. | Thiếu dimension, nhập score sai vẫn submit được, hoặc status hiện sai. |
| UIUX-MAN-012 | Kiểm composite/reset/tabs. | Sửa claim và score, bấm reset claim, đổi tab Rubric/Guideline/Examples. | Reset khôi phục claim gốc; composite score cập nhật; đổi tab không mất draft. | Reset không đúng, composite sai, hoặc đổi tab mất nội dung đã nhập. |
| UIUX-MAN-013 | Kiểm autosave/draft. | Sửa score/note, đổi focus hoặc chờ autosave, reload page. | Hiện autosave indicator; reload vẫn còn draft vừa nhập. | Mất draft, indicator không hiện, hoặc autosave báo saved nhưng data mất. |
| UIUX-MAN-014 | Kiểm submit annotation. | Chọn source status hợp lệ, nhập score/note hợp lệ, click submit. | Task sang `Submitted`, biến mất khỏi active queue annotator, xuất hiện trong QA Queue. | Submit không đổi status, queue không cập nhật, hoặc invalid data vẫn submit. |
| UIUX-MAN-015 | Kiểm QA Queue search/filter. | Login QA, mở `/qa/queue`, search `CT-001`, bấm filter Submitted/Returned/Approved. | Kết quả lọc đúng; click review vào `/qa/review/CT-001`. | Search/filter sai, row không mở review, hoặc hiện sai status. |
| UIUX-MAN-016 | Kiểm QA Review read-only/delta. | Mở review task submitted, xem LLM score, annotator score, delta, claim/source. Thử click/sửa score/claim. | Score/claim read-only; delta >= 0.20 được highlight; tab history mở được. | QA sửa được score/claim, delta sai/không highlight, hoặc history không hiện. |
| UIUX-MAN-017 | Kiểm QA Return validation/cancel. | Bấm return, để trống error type/comment, thử confirm; sau đó nhập dữ liệu và bấm cancel. | Thiếu error/comment bị chặn; cancel đóng modal và task vẫn `Submitted`. | Confirm được khi thiếu data, hoặc cancel lại đổi status/tạo history. |
| UIUX-MAN-018 | Kiểm Return -> Resubmit -> History. | QA return hợp lệ. Login Annotator mở task Returned, sửa và resubmit. Login QA mở history. | Annotator thấy banner/comment; resubmit đưa lại QA Queue; history có return/resubmit. | Không thấy comment, task không quay lại queue, hoặc history thiếu log. |
| UIUX-MAN-019 | Kiểm QA Approve. | Mở review task Submitted, bấm approve. | Task sang `Approved`, quay về queue hoặc hiện success đúng UX. | Approve fail, không đổi status, hoặc approve được task không Submitted. |
| UIUX-MAN-020 | Kiểm Export disabled/download/history. | Login Admin/QA được quyền, mở `/admin/export`. Không chọn project, xem button. Chọn project, download CSV, xem history. | Chưa chọn project thì download disabled; chọn project thì tải `.csv`; history có row và re-download. | Download mở khi chưa chọn project, file không phải CSV, hoặc history thiếu/sai. |

Mẹo ghi bug nhanh: title dùng mẫu `[UI Contract][Tên màn] Lỗi ...`; đính kèm screenshot và ghi selector/text/URL đang sai so với PRD.

---

## 7. Edge Cases - Trường Hợp Ngách Dễ Lỗi

Chạy thêm phần này sau khi 20 case chính đã ổn. Đây là các case hay bắt được lỗi UI dù happy path chạy được.

| Test case | Màn/Luồng | Thao tác test | Kết quả đúng | Báo bug khi |
|---|---|---|---|---|
| UIUX-EDGE-001 | Login | Mở `/login`, bấm `Đăng nhập` khi email/password đang trống. | Form không submit; field required báo rõ. | Vẫn submit request, không báo lỗi, hoặc lỗi hiển thị khó hiểu. |
| UIUX-EDGE-002 | Login | Nhập email sai format, ví dụ `abc`, rồi submit. | Email bị chặn bởi validation; không tạo session. | Login request vẫn gửi hoặc báo lỗi sai ngữ cảnh. |
| UIUX-EDGE-003 | Login/session | Login xong, refresh trang landing. | Vẫn giữ session và ở đúng trang theo role. | Bị logout bất ngờ, blank page, hoặc về sai route. |
| UIUX-EDGE-004 | Protected route | Logout xong, bấm Back trên browser để quay về trang protected. | Không thấy dữ liệu protected; bị redirect/chặn lại. | Dữ liệu protected vẫn hiện sau logout. |
| UIUX-EDGE-005 | Global loading | Mở màn có gọi API chậm hoặc reload trang trong lúc load. | Có loading state; không blank trắng quá lâu. | Blank page, layout vỡ, hoặc không biết app đang loading. |
| UIUX-EDGE-006 | Global API error | Tắt/mock API lỗi nếu test env hỗ trợ, rồi mở queue/import/export. | UI hiện lỗi dễ hiểu; không crash toàn app; không lộ secret. | Crash, blank page, lỗi kỹ thuật thô hoặc lộ token/API key. |
| UIUX-EDGE-007 | Import upload | Upload file không phải PDF, ví dụ `.txt`, `.png`, `.docx`. | File bị chặn hoặc báo lỗi rõ; không vào staged list như PDF hợp lệ. | Nhận file sai định dạng hoặc không có lỗi. |
| UIUX-EDGE-008 | Import upload | Upload PDF corrupt/không đọc được nếu có test file. | Báo file invalid/corrupt; không cho confirm import. | Pipeline vẫn chạy hoặc fail im lặng. |
| UIUX-EDGE-009 | Import upload | Upload 2 file cùng tên hoặc upload lại cùng file. | UI xử lý rõ: chặn duplicate hoặc hiển thị không gây nhầm lẫn. | Duplicate làm mất file, sai role, hoặc hiển thị trùng khó hiểu. |
| UIUX-EDGE-010 | Import validate | Click validate nhiều lần liên tục/double click. | Chỉ xử lý một lần hoặc button loading/disabled; không tạo request/trạng thái trùng. | Tạo nhiều request, status nhảy sai, hoặc lỗi race condition. |
| UIUX-EDGE-011 | Import wizard | Đang ở preview/confirm thì bấm Back/Next nhanh hoặc reload trang. | Không mất dữ liệu quan trọng; nếu mất thì có cảnh báo hoặc quay về step hợp lý. | Mất staged files/role mapping im lặng hoặc step bị lệch. |
| UIUX-EDGE-012 | Annotator empty state | Login Annotator không có task assigned. | My Tasks hiện empty state rõ ràng. | Blank table không thông báo, lỗi crash, hoặc hiện task của người khác. |
| UIUX-EDGE-013 | Annotation score boundary | Nhập score `0`, `1`, `0.00`, `1.00`. | Giá trị biên hợp lệ được chấp nhận. | Chặn sai giá trị hợp lệ. |
| UIUX-EDGE-014 | Annotation invalid score | Nhập `-0.01`, `1.01`, `0.123`, chữ cái, hoặc để trống một dimension. | Submit bị chặn; field lỗi rõ. | Submit được data invalid hoặc lỗi không chỉ field nào sai. |
| UIUX-EDGE-015 | Annotation delta reason | Đổi score lệch >= 0.20 nhưng bỏ trống reason; sau đó nhập reason ngắn dưới rule. | Submit bị chặn đến khi reason đủ điều kiện. | Cho submit khi thiếu reason hoặc rule không nhất quán. |
| UIUX-EDGE-016 | Annotation source note | Chọn source status lỗi như inaccessible/unparsed/ocr_required nhưng bỏ trống source note. | Submit bị chặn; yêu cầu source note. | Cho submit thiếu source note. |
| UIUX-EDGE-017 | Annotation submit | Double click nút submit hoặc click nhiều lần khi đang submit. | Chỉ tạo một lần submit; button loading/disabled. | Task bị submit nhiều lần, tạo duplicate history, hoặc lỗi status. |
| UIUX-EDGE-018 | QA queue | Search keyword không tồn tại. | Hiện empty state/no result rõ. | Blank không thông báo, filter kẹt, hoặc vẫn hiện data cũ. |
| UIUX-EDGE-019 | QA return modal | Nhập comment toàn khoảng trắng hoặc dưới 10 ký tự, rồi confirm. | Confirm bị chặn; validation rõ. | Return được với comment rỗng/quá ngắn. |
| UIUX-EDGE-020 | Export | Chọn project không có approved claim, rồi export. | UI báo không có dữ liệu hoặc xuất header-only theo quyết định implementation. | Tải file sai dữ liệu, crash, hoặc không có feedback. |

---

## 8. Extended UI/UX Cases - Kiểm Mở Rộng

Chạy phần này nếu còn thời gian hoặc trước khi bàn giao/UAT. Nhóm này bắt các lỗi không nằm trực tiếp trong happy path nhưng ảnh hưởng trải nghiệm người dùng và khả năng test automation.

| Test case | Màn/Luồng | Thao tác test | Kết quả đúng | Báo bug khi |
|---|---|---|---|---|
| UIUX-EXT-001 | Responsive desktop | Mở các màn chính ở độ rộng desktop phổ biến, ví dụ 1366px và 1920px. | Layout không vỡ, không che nút, không mất panel quan trọng. | Text/nút bị cắt, bảng tràn, panel đè nhau, hoặc action chính bị khuất. |
| UIUX-EXT-002 | Responsive tablet | Mở các màn chính ở độ rộng tablet, ví dụ 768px. | Layout vẫn thao tác được; bảng/form có scroll hợp lý. | Không thao tác được, nút biến mất, hoặc nội dung bị đè. |
| UIUX-EXT-003 | Responsive mobile smoke | Mở Login, My Tasks, Annotation, QA Queue, Export ở mobile width nếu MVP hỗ trợ. | Không crash; nội dung chính vẫn đọc và thao tác được. | Blank page, horizontal overflow nặng, hoặc không thể bấm action chính. |
| UIUX-EXT-004 | Keyboard navigation | Dùng phím Tab đi qua Login form, Import buttons, Annotation fields, QA modal. | Focus đi theo thứ tự hợp lý; có thể submit/cancel bằng keyboard khi phù hợp. | Focus mất, kẹt, nhảy sai, hoặc không thấy focus indicator. |
| UIUX-EXT-005 | Enter key submit | Ở Login, nhập đủ email/password rồi bấm Enter. | Form submit đúng như click `Đăng nhập`. | Enter không làm gì, submit sai, hoặc submit khi field invalid. |
| UIUX-EXT-006 | Escape key modal | Mở QA return modal, bấm Escape. | Modal đóng nếu UX cho phép, hoặc không đóng nhưng không đổi data; behavior nhất quán. | Modal đóng và mất dữ liệu ngoài ý muốn, hoặc đổi task status. |
| UIUX-EXT-007 | Required labels | Kiểm các input bắt buộc trên Login, Project Setup, Annotation, Return modal. | Có label hoặc aria-label rõ; người test biết phải nhập gì. | Field không có label, label sai nghĩa, hoặc placeholder là nguồn mô tả duy nhất. |
| UIUX-EXT-008 | Button loading state | Click các action có gọi API: validate, confirm import, submit, approve, return, export. | Button có loading/disabled state; user biết request đang xử lý. | Không có feedback, user có thể click lặp nhiều lần. |
| UIUX-EXT-009 | Toast/message consistency | Thực hiện submit, approve, return, export thành công. | Có feedback thành công rõ hoặc chuyển màn hợp lý. | Không có feedback, user không biết action đã xong chưa. |
| UIUX-EXT-010 | Error copy readability | Gây lỗi validation ở Login, Import, Annotation, QA Return. | Message ngắn, dễ hiểu, chỉ đúng field/lỗi. | Message kỹ thuật, tiếng Anh/Việt lẫn lộn khó hiểu, hoặc không chỉ lỗi ở đâu. |
| UIUX-EXT-011 | Menu theo role | Login từng role và kiểm menu/sidebar/header. | Admin/Annotator/QA chỉ thấy menu đúng quyền. | Menu sai quyền, thấy link không dùng được, hoặc thiếu link chính. |
| UIUX-EXT-012 | Direct URL after role switch | Login Admin rồi logout; login Annotator; gõ lại URL admin cũ. | Annotator bị chặn; không dùng cache session Admin. | Vẫn thấy data/admin page do cache hoặc session cũ. |
| UIUX-EXT-013 | Multi-tab status sync | Mở cùng task ở 2 tab. Tab 1 submit/approve; tab 2 refresh hoặc thao tác tiếp. | Tab 2 cập nhật/không cho action sai status. | Tab 2 vẫn submit/approve lại hoặc ghi đè status cũ. |
| UIUX-EXT-014 | Browser refresh in workspace | Đang nhập annotation draft rồi refresh. | Draft đã autosave thì còn; chưa autosave thì có cảnh báo hoặc mất dữ liệu có thể hiểu được. | Mất dữ liệu im lặng sau khi UI báo đã lưu. |
| UIUX-EXT-015 | Browser back after submit | Submit annotation xong, bấm Back. | Không sửa lại task Submitted như task active; status hiển thị đúng. | Quay lại form cũ và submit/sửa tiếp được sai trạng thái. |
| UIUX-EXT-016 | Download filename | Export CSV và xem tên file tải về. | Filename có đuôi `.csv`, không rỗng, dễ nhận biết project/date nếu implementation có. | Filename sai đuôi, rỗng, hoặc download không có tên hợp lệ. |
| UIUX-EXT-017 | CSV Vietnamese smoke | Export claim có tiếng Việt nếu có data. | File mở không lỗi font cơ bản; nội dung tiếng Việt không bị hỏng. | Tiếng Việt lỗi encoding hoặc ký tự bị mất. |
| UIUX-EXT-018 | Long text layout | Dùng claim/comment/source note dài, có xuống dòng. | Textarea/panel hiển thị và scroll hợp lý; không đè nút. | Layout vỡ, text tràn, nút bị che, hoặc mất nội dung. |
| UIUX-EXT-019 | Special characters | Nhập note/comment có dấu phẩy, quote, xuống dòng, ký tự tiếng Việt. | UI lưu/hiển thị lại đúng; không phá layout. | Mất ký tự, lỗi render, hoặc export sai nghiêm trọng. |
| UIUX-EXT-020 | Console error smoke | Khi chạy full flow, mở DevTools Console nếu có thể và quan sát lỗi đỏ. | Không có lỗi JS breaking; warning nhỏ ghi nhận nếu không ảnh hưởng flow. | Có uncaught error, promise rejection lặp lại, hoặc lỗi làm UI mất chức năng. |

---

## 9. Test Execution - Điền Kết Quả Khi Chạy

Quy ước `Status`: `Not Run`, `Pass`, `Fail`, `Blocked`, `N/A`.

| Test case | Status | Actual result | Bug ID | Evidence/Screenshot | Tester | Notes |
|---|---|---|---|---|---|---|
| UIUX-MAN-001 | Not Run |  |  |  |  |  |
| UIUX-MAN-002 | Not Run |  |  |  |  |  |
| UIUX-MAN-003 | Not Run |  |  |  |  |  |
| UIUX-MAN-004 | Not Run |  |  |  |  |  |
| UIUX-MAN-005 | Not Run |  |  |  |  |  |
| UIUX-MAN-006 | Not Run |  |  |  |  |  |
| UIUX-MAN-007 | Not Run |  |  |  |  |  |
| UIUX-MAN-008 | Not Run |  |  |  |  |  |
| UIUX-MAN-009 | Not Run |  |  |  |  |  |
| UIUX-MAN-010 | Not Run |  |  |  |  |  |
| UIUX-MAN-011 | Not Run |  |  |  |  |  |
| UIUX-MAN-012 | Not Run |  |  |  |  |  |
| UIUX-MAN-013 | Not Run |  |  |  |  |  |
| UIUX-MAN-014 | Not Run |  |  |  |  |  |
| UIUX-MAN-015 | Not Run |  |  |  |  |  |
| UIUX-MAN-016 | Not Run |  |  |  |  |  |
| UIUX-MAN-017 | Not Run |  |  |  |  |  |
| UIUX-MAN-018 | Not Run |  |  |  |  |  |
| UIUX-MAN-019 | Not Run |  |  |  |  |  |
| UIUX-MAN-020 | Not Run |  |  |  |  |  |
| UIUX-EDGE-001 | Not Run |  |  |  |  |  |
| UIUX-EDGE-002 | Not Run |  |  |  |  |  |
| UIUX-EDGE-003 | Not Run |  |  |  |  |  |
| UIUX-EDGE-004 | Not Run |  |  |  |  |  |
| UIUX-EDGE-005 | Not Run |  |  |  |  |  |
| UIUX-EDGE-006 | Not Run |  |  |  |  |  |
| UIUX-EDGE-007 | Not Run |  |  |  |  |  |
| UIUX-EDGE-008 | Not Run |  |  |  |  |  |
| UIUX-EDGE-009 | Not Run |  |  |  |  |  |
| UIUX-EDGE-010 | Not Run |  |  |  |  |  |
| UIUX-EDGE-011 | Not Run |  |  |  |  |  |
| UIUX-EDGE-012 | Not Run |  |  |  |  |  |
| UIUX-EDGE-013 | Not Run |  |  |  |  |  |
| UIUX-EDGE-014 | Not Run |  |  |  |  |  |
| UIUX-EDGE-015 | Not Run |  |  |  |  |  |
| UIUX-EDGE-016 | Not Run |  |  |  |  |  |
| UIUX-EDGE-017 | Not Run |  |  |  |  |  |
| UIUX-EDGE-018 | Not Run |  |  |  |  |  |
| UIUX-EDGE-019 | Not Run |  |  |  |  |  |
| UIUX-EDGE-020 | Not Run |  |  |  |  |  |
| UIUX-EXT-001 | Not Run |  |  |  |  |  |
| UIUX-EXT-002 | Not Run |  |  |  |  |  |
| UIUX-EXT-003 | Not Run |  |  |  |  |  |
| UIUX-EXT-004 | Not Run |  |  |  |  |  |
| UIUX-EXT-005 | Not Run |  |  |  |  |  |
| UIUX-EXT-006 | Not Run |  |  |  |  |  |
| UIUX-EXT-007 | Not Run |  |  |  |  |  |
| UIUX-EXT-008 | Not Run |  |  |  |  |  |
| UIUX-EXT-009 | Not Run |  |  |  |  |  |
| UIUX-EXT-010 | Not Run |  |  |  |  |  |
| UIUX-EXT-011 | Not Run |  |  |  |  |  |
| UIUX-EXT-012 | Not Run |  |  |  |  |  |
| UIUX-EXT-013 | Not Run |  |  |  |  |  |
| UIUX-EXT-014 | Not Run |  |  |  |  |  |
| UIUX-EXT-015 | Not Run |  |  |  |  |  |
| UIUX-EXT-016 | Not Run |  |  |  |  |  |
| UIUX-EXT-017 | Not Run |  |  |  |  |  |
| UIUX-EXT-018 | Not Run |  |  |  |  |  |
| UIUX-EXT-019 | Not Run |  |  |  |  |  |
| UIUX-EXT-020 | Not Run |  |  |  |  |  |

### Tổng Hợp Kết Quả

| Field | Value |
|---|---|
| Test date |  |
| Environment/build |  |
| Browser |  |
| Tester |  |
| Total cases | 60 |
| Pass |  |
| Fail |  |
| Blocked |  |
| N/A |  |
| Overall result |  |
| Sign-off note |  |

### Kết Luận Nhanh Sau Khi Test

Điền một trong các dòng dưới đây để báo lại lead/PO.

| Tình trạng sau khi chạy | Kết luận nên báo |
|---|---|
| 60/60 Pass, không có bug P0/P1. | UI/UX E2E MVP pass, sẵn sàng UAT/demo. |
| Case chính `UIUX-MAN-001` -> `UIUX-MAN-020` Pass, chỉ fail edge/extended mức P2. | Luồng E2E chính pass, còn lỗi nhỏ cần ghi nhận trước UAT. |
| Có fail ở login, role guard, import, submit, QA approve/return hoặc export. | Chưa pass E2E, cần fix trước khi sign-off. |
| Có case `Blocked` do thiếu account/data/env. | Chưa kết luận được, cần bổ sung điều kiện test và chạy lại case bị blocked. |
| Có lỗi lặp lại ở nhiều màn như blank page, crash, sai role, mất draft. | Cần ưu tiên bug P0/P1 vì ảnh hưởng toàn luồng UI. |

### Mẫu Báo Cáo Ngắn

```text
Đã chạy UI/UX E2E checklist theo PRD.
Tổng số case: 60.
Pass: ...
Fail: ...
Blocked: ...
Bug ID: ...
Kết luận: Pass/Fail/Blocked.
Ghi chú: ...
```

---

## 10. Bug Report Tối Thiểu Khi Fail UI/UX Contract

| Field | Nội dung bắt buộc |
|---|---|
| Title | `[UI Contract][Screen] Mô tả ngắn lỗi`. |
| Source | Link/ghi chú đến `UI Testability — URL & Element Map (MVP).md` section liên quan. |
| Environment | URL, build, browser, role, account. |
| Steps | Đường dẫn URL + selector/copy đang assert. |
| Expected | Giá trị đúng theo PRD. |
| Actual | Giá trị thực tế. |
| Evidence | Screenshot, Playwright trace/video, console/network error nếu có. |
| Severity | Theo bảng pass/fail section 1. |

---

## 11. Exit Criteria Cho Frontend MVP

| Điều kiện | Kết luận |
|---|---|
| Bất kỳ `P0` trong route/guard/happy path selector/submit/approve/export. | Không pass frontend readiness. |
| Còn `P1` về selector/copy trên màn E2E chính. | Không mở rộng automation, cần fix trước regression automation. |
| Chỉ còn `P2` copy/UX minor không ảnh hưởng route, data, automation. | Có thể pass có điều kiện nếu PO/QA chấp nhận. |
| Tất cả UIUX-ROUTE, UIUX-LOGIN, UIUX-IMP, UIUX-ANN, UIUX-QA, UIUX-EXP pass. | Frontend sẵn sàng UAT/demo. |
