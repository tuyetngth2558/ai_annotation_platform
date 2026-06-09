# VSF AI Annotation Platform
## Tài liệu Phân nhóm Tính năng, Kiểm soát Phạm vi & Phân công Vai trò (MVP 4 tuần)

- **Phiên bản:** 1.1
- **Ngày cập nhật:** 04/06/2026
- **Mục đích:** Chốt rõ những gì sẽ xây dựng thực tế (Must-Have), những phần chỉ thiết kế (Design-Only) và những phần hoãn lại (Postponed) trong MVP 4 tuần để kiểm soát phạm vi dự án và đảm bảo tiến độ.

---

## 1. Tổng quan chiến lược kiểm soát scope

Tài liệu này phân loại toàn bộ tính năng của VSF AI Annotation Platform thành 3 nhóm:
- **Must-Have**: Bắt buộc phải phát triển hoàn thiện trong 4 tuần.
- **Design-Only**: Chỉ cần thiết kế cơ sở dữ liệu và kiến trúc đúng, chưa lập trình trong 4 tuần.
- **Postponed**: Hoãn lại hoàn toàn cho các giai đoạn tiếp theo.

### Nguyên tắc cốt lõi: Build hẹp - Design rộng
- **Build hẹp (MVP 4 tuần):** 
  - Chỉ hỗ trợ **1 modality là text**.
  - Chỉ phục vụ cho **1 use case là Vivipedia**.
  - Chỉ chạy trên **Desktop Web** (không làm Mobile).
  - Chỉ sử dụng **1 LLM provider cố định** để lấy pre-score.
  - Quy trình QA tối giản: chỉ có **Approve** (Duyệt) và **Return** (Trả về kèm phân loại lỗi).
  - Bảo mật ở mức **baseline cơ bản**.
- **Design rộng (Tương lai):** 
  - Mô hình dữ liệu (data model), dự án (project model) và tài liệu kỹ thuật phải đủ mở để sau này dễ dàng tích hợp thêm các modality khác như `audio`, `image` và nhiều loại project khác mà không phải thay đổi kiến trúc cốt lõi.

---

## 2. Mục tiêu & Tiêu chí nghiệm thu MVP 4 tuần

Mục tiêu duy nhất của MVP 4 tuần là bàn giao một hệ thống chạy được end-to-end ổn định theo luồng:

```
[Import PDF Bundle] ➔ [PDF Parsing] ➔ [Claim Extraction] ➔ [LLM Pre-scoring] ➔ [Annotator Review] ➔ [QA Review] ➔ [Export CSV]
```

### Tiêu chí nghiệm thu (UAT Success Criteria):
- Dữ liệu thật chạy trơn tru qua toàn bộ pipeline từ đầu đến cuối.
- Annotator có thể chỉnh sửa claim, đánh giá nguồn và submit kết quả trên giao diện thực tế.
- QA có thể duyệt (Approve) hoặc trả lại (Return) task kèm comment bắt buộc.
- Hệ thống xuất được dữ liệu sạch ra định dạng CSV ở cấp độ claim (claim-level).
- Bản demo hoạt động ổn định trên môi trường staging để nghiệm thu với mentor và stakeholder.

---

## 3. Bảng tóm tắt phân nhóm phạm vi (Scope Matrix)

| Hạng mục tính năng | Must-Have | Design-Only | Postponed |
| :--- | :---: | :---: | :---: |
| **Project Setup** (Cấu hình dự án & Gán nhân sự) | ✅ | | |
| **Import PDF Bundle** (Answer PDF + Source Reference PDF + Source Content PDF) | ✅ | | |
| **PDF Parsing & Normalization** (Parse PDF thành dữ liệu nội bộ) | ✅ | | |
| **Claim Extraction** (Tách claim tự động & Sửa thủ công) | ✅ | | |
| **Source Mapping & Validation cơ bản** (source order/title/text, URL optional) | ✅ | | |
| **LLM Pre-scoring** (Lấy điểm pre-score tự động từ 1 provider) | ✅ | | |
| **Annotator Workspace** (Giao diện đánh giá & Override score) | ✅ | | |
| **Structured Evaluation** (Bộ 6 tiêu chí Vivipedia, composite score) | ✅ | | |
| **QA Review cơ bản** (Approve / Return task) | ✅ | | |
| **Export** (Xuất CSV cấp độ claim cho task Approved) | ✅ | | |
| **RBAC cơ bản** (Phân quyền Admin, Annotator, QA) | ✅ | | |
| **Audit Log tối thiểu** (Ghi log các thao tác nghiệp vụ chính) | ✅ | | |
| **Multi-project model** (Mô hình đa dự án) | | ✅ | |
| **Multi-modality model** (Mô hình hỗ trợ Audio, Image) | | ✅ | |
| **Import abstraction** (Lớp import trừu tượng cho nhiều nguồn) | | ✅ | |
| **Extensible task lifecycle** (Vòng đời task có thể mở rộng) | | ✅ | |
| **Workspace extensibility** (Kiến trúc workspace đa modality) | | ✅ | |
| **Rubric configurability** (Cơ chế cấu hình rubric động) | | ✅ | |
| **Dispute workflow** (Quy trình giải quyết tranh chấp) | | | ❌ |
| **Policy Center** (Trung tâm quản lý chính sách và guideline) | | | ❌ |
| **In-app & Email notification** (Thông báo trong app & email) | | | ❌ |
| **Sampling engine** (Cơ chế lấy mẫu kiểm tra chất lượng) | | | ❌ |
| **MFA / Watermark / Allowlist** (Bảo mật nâng cao) | | | ❌ |
| **XLSX / JSON / Bulk Export** (Xuất file nâng cao) | | | ❌ |
| **Audio / Image annotation** (Trình chơi audio, bounding box...) | | | ❌ |

---

## 4. Chi tiết các hạng mục tính năng trong MVP

### 4.1. Nhóm Must-Have (Bắt buộc phát triển)

- **Project Setup:**
  - Tạo project mới kèm tên, mô tả. Modality mặc định cố định là `text`.
  - Cấu hình LLM endpoint, API key và prompt template.
  - Thực hiện gán nhân sự (Annotator và QA Specialist) vào dự án.
  - Xem danh sách và trạng thái tổng quan các project.
- **Import PDF Bundle:**
  - Import dữ liệu thủ công bằng PDF bundle gồm đúng 1 `answer_pdf`, đúng 1 `source_ref_pdf`, và ít nhất 1 `source_content_pdf`.
  - Kiểm tra file role, định dạng PDF, file lỗi/corrupt, thiếu/trùng role và giới hạn dung lượng.
  - Cho phép xem trước metadata parse, source list, source content mapping và parse warnings trước khi import.
  - Tự động tạo batch, PDF bundle, parent task và kích hoạt pipeline nền từ tệp PDF nguồn.
- **PDF Parsing & Normalization:**
  - Parse Answer PDF để lấy `answer_text_raw`, `answer_text_normalized`, metadata bài và citation markers.
  - Parse Source Reference PDF để lấy `source_order`, `source_title`, `source_tier`; `source_url` là optional vì PDF có thể không expose URL.
  - Parse Source Content PDF để lấy `source_text_extract` phục vụ LLM pre-scoring và annotator review.
  - Lưu parser version, parse status, warnings và trace về file PDF gốc.
- **Claim Extraction:**
  - Hệ thống tự động tách claim từ `answer_text_normalized` sau khi parse Answer PDF.
  - Mỗi claim sau khi tách trở thành một `Claim Task` độc lập.
  - Đảm bảo giữ nguyên thứ tự xuất hiện của các claim trong câu trả lời gốc.
  - Cho phép annotator sửa đổi claim text nếu thuật toán tự động tách chưa chính xác.
- **Source Mapping & Validation cơ bản:**
  - Mỗi claim bắt buộc phải có ít nhất 1 source candidate dựa trên citation marker/source order.
  - Task không map được source sẽ tự động chuyển trạng thái `Source Mapping Required` và tạm thời không vào hàng đợi của Annotator.
  - Annotator ưu tiên đối chiếu source text parse từ PDF; nếu có URL thì có thể mở ngoài để xác minh thêm.
  - Source URL không parse được chỉ là warning, không block import nếu có source order/title/text đủ dùng.
  - Source content không parse được hoặc cần OCR phải có ghi chú khi annotator submit.
- **LLM Pre-scoring:**
  - Gọi API sang một LLM provider cố định để tính điểm pre-score cho 6 dimension.
  - Lưu trữ kết quả pre-score làm baseline đối chứng (bất biến).
  - Hiển thị thông báo và trạng thái lỗi chi tiết cho Admin nếu kết nối API thất bại.
- **Annotation Workspace:**
  - Hiển thị ngữ cảnh đầy đủ của câu trả lời (answer context) và claim text (có thể sửa).
  - Hiển thị điểm số gợi ý từ AI làm nhãn gợi ý ("AI Draft").
  - Cho phép annotator giữ nguyên hoặc thay thế (override) điểm số của từng dimension.
  - Hỗ trợ cập nhật trạng thái nguồn và nhập ghi chú bắt buộc cho từng claim.
  - Tự động lưu bản nháp định kỳ (auto-save) để tránh mất mát dữ liệu khi đang gán nhãn.
- **Structured Evaluation (Đánh giá cấu trúc):**
  - Sử dụng bộ 6 dimension hard-code cho Vivipedia:
    - **SF** — Độ trung thành với nguồn (Source Faithfulness)
    - **SC** — Độ bao phủ của nguồn (Source Coverage)
    - **HR** — Mức độ rủi ro hallucination / xác nhận bên ngoài (Hallucination Risk)
    - **SQ** — Chất lượng nguồn (Source Quality)
    - **REL** — Mức độ liên quan (Relevance)
    - **COMP** — Độ đầy đủ (Completeness)
  - Thang điểm đánh giá từ `0.00` đến `1.00`, độ chính xác tối đa 2 chữ số thập phân.
  - Tính điểm tổng hợp `Composite Score` theo công thức trung bình cộng đều (weight = 1).
  - Yêu cầu nhập lý do bắt buộc nếu annotator sửa đổi điểm số lệch quá ngưỡng so với pre-score gợi ý của LLM.
- **QA Review cơ bản:**
  - Giao diện cho phép QA xem lại chi tiết task đã submit bởi Annotator.
  - Hiển thị phần so sánh chênh lệch (diff) giữa điểm của Annotator và pre-score của AI.
  - Xem lại lịch sử các lần submit/return của task.
  - QA thực hiện 2 thao tác chính:
    - **Approve:** Chuyển trạng thái task sang Approved (đủ điều kiện export).
    - **Return:** Trả task về hàng đợi của Annotator (yêu cầu chọn phân loại lỗi và nhập ghi chú lý do).
- **Export:**
  - Xuất dữ liệu sạch ra tệp tin định dạng `CSV` ở cấp độ claim (claim-level).
  - Chỉ xuất các dữ liệu đã được QA duyệt (`Approved`).
  - Ghi nhận nhật ký audit log cho mỗi lượt xuất dữ liệu.
- **RBAC cơ bản:**
  - Hỗ trợ phân quyền 3 vai trò: Admin, Annotator và QA.
  - *Annotator:* Chỉ thấy và làm việc trên các task được chỉ định gán cho mình.
  - *QA:* Chỉ thấy hàng đợi kiểm duyệt được phân công.
  - *Admin:* Toàn quyền quản lý project, tài khoản, import và export.
  - Cơ chế phân quyền được áp dụng đồng bộ trên cả giao diện (UI) và API bảo mật.
- **Audit Log tối thiểu:**
  - Ghi nhận lịch sử cho các sự kiện cốt lõi: *import, claim edit, submit, approve, return, export*.
  - Lưu trữ thông tin cơ bản: User thực hiện, Timestamp, Action type, Object ID.

### 4.2. Nhóm Design-Only (Chỉ thiết kế, chưa lập trình)

- **Mô hình đa dự án:** Thiết kế project model linh hoạt để cấu hình nhiều loại dự án gán nhãn khác nhau về sau.
- **Đa modality:** Cấu hình cấu trúc dữ liệu và mô hình asset sẵn sàng hỗ trợ đồng thời `text`, `audio`, và `image`.
- **Import abstraction:** Thiết kế lớp import trừu tượng hướng đến việc kết nối với nhiều nguồn API/kho lưu trữ khác.
- **Vòng đời task mở rộng:** Thiết kế trạng thái luồng (state machine) dự phòng cho các nhánh: dispute (tranh chấp), re-annotation (gán nhãn lại), và policy update (cập nhật chính sách).
- **Kiến trúc màn hình linh hoạt:** Thiết kế workspace dạng module để dễ dàng nhúng thêm trình xem audio/image sau này.
- **Cấu hình Rubric:** Thiết kế cơ chế định nghĩa động các dimension và thang điểm thay vì hard-code.

### 4.3. Nhóm Postponed (Hoãn lại hoàn toàn)

- **Quy trình chất lượng nâng cao:** Tranh chấp (Dispute), Trợ lý chính sách (Policy Analyst), IAA tự động, Lấy mẫu kiểm tra chất lượng (Risk-based sampling), Gán nhãn mẫu vàng (Gold standard injection).
- **Quản lý Guideline:** Bộ tài liệu hướng dẫn nghiệp vụ tích hợp, Editor soạn thảo guideline WYSIWYG.
- **Thông báo:** Hệ thống notification trong ứng dụng (In-app) và gửi Email thông báo.
- **Báo cáo & Quản trị:** Dashboard báo cáo hiệu suất, đo lường KPI/SLA, quản lý phân phối tải công việc (Workload).
- **Bảo mật nâng cao:** Đăng nhập 2 lớp (MFA), chèn Watermark động trên màn hình, cấu hình Network allowlist, Audit log bất biến (immutable/WORM).
- **Trình xuất nâng cao:** Xuất file Excel (.xlsx), định dạng JSON phức tạp, xuất hàng loạt dưới dạng file nén ZIP.
- **Modality nâng cao:** Trình phát nhạc (Audio player), Bounding box hình ảnh, Waveform, Timeline, Đa ngôn ngữ (Localization), Ứng dụng di động (Mobile App), Đăng nhập một lần (SSO).

---

## 5. Lộ trình triển khai MVP trong 4 tuần

### Tuần 1 — Xây dựng Nền tảng
- [ ] Thống nhất và chốt biên giới scope MVP với mentor/stakeholder.
- [ ] Định nghĩa schema PDF Bundle Upload, PDF parse result và CSV export claim-level.
- [ ] Chốt LLM provider và kiểm tra tài khoản/kết nối.
- [ ] Thiết kế kiến trúc nghiệp vụ tự động tách claim (claim extraction flow).
- [ ] Xây dựng sơ đồ dữ liệu ERD hỗ trợ cấu trúc mở rộng đa modality.
- [ ] Thiết kế sơ đồ luồng người dùng (User Flow) và Wireframes cho các màn hình chính.
- [ ] Thiết lập môi trường phát triển (Dev) & môi trường chạy thử (Staging).
- [ ] Triển khai phân hệ Authentication và RBAC phân quyền cơ bản.

### Tuần 2 — Hiện thực hóa Luồng Gán nhãn (Annotation Flow)
- [ ] Phát triển API và giao diện Import PDF Bundle (validate file roles + parse preview).
- [ ] Hiện thực tính năng tự động tách claim (Claim extraction).
- [ ] Kết nối API và tích hợp cơ chế LLM pre-scoring lưu baseline.
- [ ] Xây dựng màn hình làm việc của Annotator (Annotation Workspace), tích hợp xem ngữ cảnh và chỉnh sửa claim.
- [ ] Thiết lập các quy định validation bắt buộc (điểm số, trạng thái nguồn, ghi chú).
- [ ] Phát triển tính năng tự động lưu nháp (auto-save) và luồng submit task.

### Tuần 3 — Hiện thực hóa Luồng QA & Trình xuất dữ liệu
- [ ] Phát triển màn hình duyệt của QA (QA review screen) hiển thị so sánh chênh lệch (diff score) và lịch sử task.
- [ ] Cài đặt các action nghiệp vụ của QA: Approve (phê duyệt) và Return (trả lại kèm comment/phân loại lỗi).
- [ ] Tích hợp ghi nhật ký hệ thống (Audit log) tối thiểu cho các tác vụ cốt lõi.
- [ ] Xây dựng tính năng xuất dữ liệu sạch ra tệp tin CSV cấp độ claim.
- [ ] Tối ưu hóa UI/UX các màn hình chính.
- [ ] Thực hiện kiểm thử tích hợp end-to-end nội bộ vòng 1.

### Tuần 4 — Kiểm thử hệ thống, UAT & Nghiệm thu
- [ ] Thực hiện kiểm thử diện rộng trên dữ liệu Vivipedia thực tế.
- [ ] Tập trung khắc phục các lỗi có độ ưu tiên cao (High priority bugs) và xử lý các kịch bản lỗi biên (Edge cases).
- [ ] Tổ chức nghiệm thu nội bộ (Internal UAT) giữa các nhóm nghiệp vụ.
- [ ] Tối ưu hóa hiệu năng và đảm bảo tính ổn định tối đa của môi trường Staging.
- [ ] Chuẩn bị đầy đủ tài liệu bàn giao, tài liệu hướng dẫn vận hành và kịch bản demo cho buổi nghiệm thu chính thức.

---

## 6. Phân công vai trò & Đầu ra chi tiết của các nhóm

### 6.1. Nhóm Nghiệp Vụ (BA)
- **Nhân sự phụ trách:** Tuyết, Quang, Đan
- **Vai trò chi tiết:**
  - **Tuyết:** Scope Owner của MVP, thiết kế luồng màn hình (Screen Flow), đặc tả màn hình (Screen Specs), kết nối nghiệp vụ với UI/UX.
  - **Quang:** Owner luồng quy trình nghiệp vụ tổng quát, chịu trách nhiệm viết tiêu chí nghiệm thu (Acceptance Criteria) và các quy định nghiệp vụ (Business Rules).
  - **Đan:** Owner mô hình cơ sở dữ liệu, xây dựng từ điển dữ liệu (Data Dictionary), thiết kế schema import/export và các quy tắc kiểm tra dữ liệu đầu vào/ra (Validation Rules).
- **Danh sách đầu ra bắt buộc của BA:**
  1. Tài liệu phạm vi MVP 4 tuần (Scope Matrix).
  2. Sơ đồ ngữ cảnh hệ thống (Context Diagram).
  3. Sơ đồ ca sử dụng (Use Case Diagram).
  4. Quy trình nghiệp vụ chi tiết (Workflow/BPMN).
  5. Sơ đồ vòng đời task (Task State Diagram).
  6. Sơ đồ thực thể liên kết (ERD) mở rộng.
  7. Từ điển dữ liệu (Data Dictionary).
  8. Feature list ưu tiên và bộ User Stories chi tiết.
  9. Tiêu chí nghiệm thu (AC) & Business Rules.
  10. Quy tắc xác thực dữ liệu (Validation Rules).
  11. Đặc tả chi tiết các màn hình (Screen Specification).
  12. Nhật ký các câu hỏi mở, giả định và sự phụ thuộc nghiệp vụ.

### 6.2. Nhóm Phát Triển & Vận Hành (DevOps)
- **Nhân sự phụ trách:** Khởi, Tuấn Anh, Nhi
- **Vai trò chi tiết:**
  - **Khởi:** Chịu trách nhiệm thiết lập hạ tầng, cấu hình môi trường phát triển & staging, quản lý thông tin bảo mật (Secret Management/Config) và lưu log hệ thống.
  - **Tuấn Anh:** Thiết lập pipeline CI/CD tự động, deploy cơ sở dữ liệu, thiết lập storage lưu trữ, phụ trách đóng gói và release sản phẩm ở tuần 4.
  - **Nhi:** Setup và duy trì tính ổn định của môi trường dev/staging, quản lý biến môi trường, hỗ trợ database migration, storage và deployment. Phụ trách backup dữ liệu cơ bản.
- **Danh sách đầu ra bắt buộc của DevOps:**
  1. Môi trường Dev & Staging hoạt động ổn định.
  2. Hệ thống quản lý secret và cấu hình bảo mật.
  3. Pipeline CI/CD tự động.
  4. Cơ sở dữ liệu và hệ thống storage được deploy sẵn sàng.
  5. Hệ thống log trung tâm phục vụ việc giám sát hoạt động API/LLM.

### 6.3. Nhóm Thiết Kế (UI/UX)
- **Nhân sự phụ trách:** Trí, Tuyết
- **Vai trò chi tiết:**
  - **Trí:** Thực hiện thiết kế đồ họa chi tiết (UI), vẽ khung xương màn hình (Wireframes) và ráp luồng tương tác (Interactive Prototype).
  - **Tuyết:** Đảm bảo thiết kế bám sát logic nghiệp vụ, thực hiện review độ thân thiện người dùng (Usability Review) và đồng bộ spec màn hình.
- **Màn hình ưu tiên bắt buộc thiết kế trong MVP:**
  1. Giao diện Cài đặt dự án & Import PDF Bundle.
  2. Giao diện làm việc của Annotator (Annotation Workspace).
  3. Giao diện kiểm duyệt của QA (QA Review Screen).

### 6.4. Nhóm Kiểm Thử & QA Chuyên Môn
- **Nhân sự phụ trách:** Nhung, Hùng, Nhi
- **Vai trò chi tiết:**
  - **Nhung:** Lập tài liệu kế hoạch kiểm thử (Test Plan), viết kịch bản kiểm thử chi tiết (Test Case), danh sách regression test và bảng kiểm thử UAT Checklist.
  - **Hùng:** Thực thi chạy test chức năng, sanity test API và UI hệ thống, ghi chép lỗi và quản lý bug log trên Jira/Trello.
  - **Nhi:** Thiết kế kịch bản test luồng end-to-end hoàn chỉnh, chạy test các quy tắc validation dữ liệu, kiểm thử các kịch bản lỗi hệ thống và lỗi biên. Review AC cùng BA sớm để chuẩn bị test case.
- **Danh sách đầu ra bắt buộc của Test/QA:**
  1. Tài liệu Test Plan & bộ Test Cases đầy đủ.
  2. Kịch bản test luồng E2E & UAT Checklist cho tuần 4.
  3. Báo cáo kết quả chạy kiểm thử (Test Execution Report).
  4. Bug log cập nhật đầy đủ trạng thái và độ nghiêm trọng.

---

## 7. Các nguyên tắc tuyệt đối không được hiểu nhầm

- **MVP không phải là Phase 1 đầy đủ:** Bản MVP 4 tuần chỉ tập trung vào việc thông luồng dữ liệu thô qua 6 bước cốt lõi chạy được thực tế, không cam kết xây dựng các phần quản lý nâng cao hay giao diện tùy biến phức tạp.
- **Chỉ hỗ trợ Text Modality:** Mọi nỗ lực lập trình chỉ tập trung vào dữ liệu text. Các modality audio/image chỉ dừng lại ở phân tích thiết kế trên giấy tờ để đảm bảo kiến trúc mở. Tuyệt đối không lập trình UI/player cho audio/image.
- **Quy trình QA cực kỳ tối giản:** QA chỉ xem kết quả của annotator, so sánh chênh lệch với AI pre-score rồi chọn Approve hoặc Return (trả lại bắt buộc kèm comment lỗi). Không xây dựng Dispute workflow hay tính năng cho QA sửa trực tiếp điểm.
- **Chỉ xuất CSV claim-level:** Không hỗ trợ xuất XLSX, JSON hay tải file nén ZIP trong MVP 4 tuần để tối ưu thời gian phát triển.

---

## 8. Kết luận

Tài liệu này đóng vai trò là mốc ranh giới phạm vi (Scope Baseline) chính thức cho dự án VSF AI Annotation Platform MVP 4 tuần. Mọi đề xuất phát sinh tính năng mới trong quá trình phát triển cần được PM và BA đánh giá nghiêm ngặt qua 3 bước:
1. Có nằm trong luồng tối thiểu end-to-end hay không?
2. Có bắt buộc phải xây dựng ngay trong 4 tuần này không?
3. Có thể chuyển sang nhóm *Design-Only* hoặc *Postponed* không?

Chỉ những hạng mục thuộc nhóm **Must-Have** mới được duyệt đưa vào danh sách phát triển chính thức.
