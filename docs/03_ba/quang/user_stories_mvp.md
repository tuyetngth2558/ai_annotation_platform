# VSF AI Annotation Platform - MVP User Stories

Tài liệu này đặc tả chi tiết danh sách User Stories kèm Tiêu chí nghiệm thu (Acceptance Criteria - AC) và Quy tắc nghiệp vụ (Business Rules) cho 4 phân hệ cốt lõi của VSF AI Annotation Platform MVP (4 tuần), được xây dựng dựa trên định hướng tại tài liệu [VSF_AI_Annotation_Platform_Scope_Breakdown.md](file:///d:/BA/VSF_AI_Annotation_Platform_Scope_Breakdown.md).

---

## 1. Phân quyền & Vai trò trong MVP (RBAC Baseline)

Trong phạm vi MVP, hệ thống thực thi phân quyền cơ bản cho 3 vai trò trên cả giao diện (UI) và API:
- **Admin**: Quản lý dự án, tài khoản, Import dataset, Export kết quả, giám sát hệ thống.
- **Annotator (Người gán nhãn)**: Chỉ có quyền xem và gán nhãn các task được giao trực tiếp cho mình.
- **QA Specialist (Người kiểm duyệt)**: Chỉ có quyền xem và phê duyệt (Approve) hoặc trả lại (Return) các task thuộc dự án được phân công.

---

## 2. Luồng Import Dataset (Import Flow)

### US-01: Import Dataset thủ công (Admin)
- **Mô tả:**
  - **As an** Admin,
  - **I want to** upload a PDF Bundle (ZIP archive containing PDF files or multiple PDF files directly),
  - **So that** the system can extract the text contents and sources from the PDFs and prepare them for the annotation pipeline.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  1. Giao diện Setup/Import cho phép Admin kéo thả hoặc chọn tệp tin từ máy tính (chấp nhận định dạng `.zip` chứa các file `.pdf` hoặc chọn đồng thời nhiều file `.pdf`).
  2. Hệ thống kiểm tra tính hợp lệ của tệp tin đầu vào (validate ZIP/PDF):
     - Tệp tin tải lên phải là file `.zip` hoặc các file `.pdf` hợp lệ, không bị lỗi cấu trúc hoặc hỏng.
     - Nếu tệp tin không hợp lệ, bị hỏng hoặc chứa file không phải PDF bên trong ZIP, hệ thống hiển thị thông báo lỗi chi tiết (ví dụ: *"File 'document_abc.pdf' bị hỏng hoặc không thể đọc"* hoặc *"Định dạng tệp tin tải lên không hỗ trợ"*).
  3. Hệ thống hiển thị phần xem trước (Preview) danh sách tối đa 5 file PDF đầu tiên đọc từ bundle (hiển thị Tên file, Kích thước, và 200 ký tự đầu tiên trích xuất từ nội dung PDF) để Admin xác nhận trước khi thực hiện import chính thức.
  4. Sau khi Admin bấm "Confirm Import", hệ thống xử lý giải nén (nếu là ZIP), trích xuất toàn bộ nội dung văn bản và các liên kết URL nguồn từ mỗi file PDF, tự động tạo một Batch mới và các công việc tương ứng.
  5. Nhật ký hệ thống (Audit Log) ghi nhận hành động: `import` (Admin ID, Tên file bundle/ZIP, Số lượng file PDF import thành công, Batch ID, Timestamp).

### US-02: Tự động tách Claim (Claim Extraction) & Tạo Task (System)
- **Mô tả:**
  - **As an** Admin/System,
  - **I want the system to** automatically split the extracted PDF text into separate claims and generate tasks,
  - **So that** the data is structured at a granular claim level for annotators to review.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  1. Ngay sau khi PDF Bundle được import thành công, hệ thống tự động trích xuất toàn bộ văn bản từ từng file PDF và kích hoạt tiến trình tách claim từ nội dung văn bản này.
  2. Mỗi claim sau khi tách được lưu trữ dưới dạng một `Claim Task` độc lập trong cơ sở dữ liệu.
  3. Hệ thống phải đảm bảo giữ nguyên thứ tự xuất hiện gốc của các claim trong nội dung văn bản trích xuất từ PDF gốc thông qua chỉ số thứ tự (`claim_index`).
  4. Các `Claim Task` này phải liên kết trực tiếp với file PDF nguồn gốc (tên file/đường dẫn PDF phục vụ việc xem trực tiếp) và danh sách URL nguồn trích xuất được từ PDF đó.
  5. **Quy tắc kiểm tra nguồn (Source Checking Rule):**
     - Nếu file PDF nguồn không trích xuất được bất kỳ URL nguồn nào bên trong, hệ thống tự động chuyển trạng thái của task đó thành `Source Mapping Required` và tạm thời **không** đưa vào hàng đợi làm việc (queue) của Annotator.

### US-03: Gọi LLM Pre-scoring lấy điểm gợi ý (System)
- **Mô tả:**
  - **As an** Admin/System,
  - **I want the system to** query a designated LLM provider to pre-score each claim across 6 dimensions,
  - **So that** the annotators have a baseline suggestion ("AI Draft") when they start working.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  1. Với mỗi `Claim Task` có nguồn hợp lệ, hệ thống tự động gọi API tới 1 LLM provider cố định đã cấu hình trong dự án.
  2. Gửi request kèm theo prompt template, claim text và nội dung/URL nguồn để LLM đánh giá điểm cho 6 dimension của Vivipedia.
  3. Hệ thống lưu trữ các điểm số pre-score này vào cơ sở dữ liệu làm **baseline bất biến** (không cho phép bất kỳ ai chỉnh sửa bản ghi baseline này).
  4. Hiển thị điểm số gợi ý này trên màn hình gán nhãn dưới nhãn "AI Draft" cho từng dimension.
  5. Trường hợp kết nối API tới LLM thất bại (timeout, sai key, v.v.), hệ thống phải ghi nhận lỗi chi tiết, gắn trạng thái `Pre-scoring Failed` của task để Admin tiện theo dõi và cung cấp nút bấm "Retry" thủ công cho Admin.

---

## 3. Luồng Gán nhãn (Annotator Flow)

### US-04: Truy cập hàng đợi công việc cá nhân (Annotator)
- **Mô tả:**
  - **As an** Annotator,
  - **I want to** view only my assigned tasks on the dashboard,
  - **So that** I can easily access my work and start the annotation process.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  1. Annotator đăng nhập thành công sẽ được điều hướng trực tiếp đến trang Dashboard cá nhân.
  2. Danh sách công việc chỉ hiển thị các task được phân công cho Annotator đó (Assignee = Current User) ở các trạng thái: `Assigned` (Mới được gán) hoặc `Returned` (Bị QA trả về).
  3. Giao diện hỗ trợ bộ lọc nhanh theo trạng thái (`Assigned`, `Returned`) hoặc tìm kiếm theo ID.
  4. Bấm vào một task trong danh sách sẽ mở ra giao diện làm việc chi tiết (Annotation Workspace).

### US-05: Đánh giá và xác nhận trạng thái URL nguồn (Annotator)
- **Mô tả:**
  - **As an** Annotator,
  - **I want to** inspect each source URL associated with the claim and evaluate its accessibility,
  - **So that** I can flag invalid or broken sources.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  1. Tại Workspace, hệ thống hiển thị danh sách các URL nguồn liên kết với claim đang thực hiện.
  2. Với từng URL, Annotator bắt buộc phải chọn một trong bốn trạng thái:
     - `Accessible` (Truy cập được)
     - `Inaccessible` (Không truy cập)
     - `Partially supported` (Hỗ trợ một phần)
     - `Irrelevant` (Không liên quan)
  3. **Quy tắc nghiệp vụ tự động (Automated Business Rule):**
     - Nếu Annotator đánh dấu trạng thái nguồn là `Inaccessible`, hệ thống tự động gán điểm của chiều đánh giá `SC` (Source Coverage) = `0.00` và khóa (disable) trường nhập điểm của chiều này.
     - Annotator bắt buộc phải nhập ghi chú lý do tại nguồn bị hỏng đó thì hệ thống mới cho phép lưu/submit.

### US-06: Đánh giá 6 chiều tiêu chí Vivipedia & Sửa đổi Claim (Annotator)
- **Mô tả:**
  - **As an** Annotator,
  - **I want to** edit the claim text (if extracted poorly), view AI suggestions, and input scores for the 6 dimensions,
  - **So that** I can complete the evaluation of the claim's quality.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  1. Annotator được phép chỉnh sửa nội dung văn bản của claim (`claim_text`) trong một ô nhập liệu nếu thuật toán tự động tách chưa chuẩn.
  2. Giao diện hiển thị trực quan điểm số gợi ý từ AI ("AI Draft") kế bên mỗi chiều đánh giá để tham chiếu.
  3. Ô nhập điểm cho 6 chiều (SF, SC, NH, SQ, REL, COMP) chỉ chấp nhận giá trị số từ `0.00` đến `1.00`, độ chính xác tối đa 2 chữ số thập phân.
  4. Hệ thống tự động tính toán điểm tổng hợp `Composite Score` bằng công thức trung bình cộng đều (tất cả trọng số bằng 1) và hiển thị kết quả ngay lập tức trên UI khi có sự thay đổi điểm.
  5. **Quy tắc bắt buộc giải trình (Justification Rule):**
     - Nếu Annotator nhập điểm lệch quá ngưỡng quy định (ví dụ: lệch quá $\pm 0.20$ so với AI Pre-score), hệ thống bắt buộc Annotator phải điền lý do vào ô "Ghi chú giải trình thay đổi điểm" cho dimension đó.
  6. Hệ thống thực hiện kiểm tra tính hợp lệ trước khi cho phép gửi: toàn bộ 6 chiều điểm phải được điền đầy đủ (trừ SC bị khóa tự động ở US-05), trạng thái nguồn được xác nhận, và claim text không được để trống.

### US-07: Tự động lưu bản nháp (Auto-save) & Gửi công việc (Annotator)
- **Mô tả:**
  - **As an** Annotator,
  - **I want the system to** automatically save my workspace inputs periodically, and allow me to submit the task once completed,
  - **So that** I don't lose my work and can send my evaluation to the QA queue.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  1. Trong quá trình Annotator thao tác trên Workspace, hệ thống tự động lưu bản nháp (auto-save) dữ liệu lên server mỗi 30 giây hoặc khi Annotator di chuyển con trỏ ra khỏi ô nhập liệu (blur event).
  2. Giao diện hiển thị thông báo nhỏ trạng thái dạng *"Đã lưu nháp lúc HH:MM:SS"*.
  3. Nút "Submit" chỉ hoạt động (enabled) khi tất cả các tiêu chí validation bắt buộc ở US-05 và US-06 đã được thỏa mãn.
  4. Khi bấm "Submit":
     - Trạng thái task chuyển sang `Submitted`.
     - Task biến mất khỏi hàng đợi làm việc của Annotator và chuyển vào hàng đợi kiểm duyệt của QA.
     - Nhật ký hệ thống ghi nhận hành động: `submit` (Annotator ID, Task ID, Timestamp).

---

## 4. Luồng Kiểm duyệt (QA Flow)

### US-08: Truy cập hàng đợi kiểm duyệt (QA Specialist)
- **Mô tả:**
  - **As a** QA Specialist,
  - **I want to** access a list of submitted tasks,
  - **So that** I can review the annotations and ensure quality control.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  1. QA Specialist đăng nhập thành công và truy cập trang QA Dashboard.
  2. Hàng đợi hiển thị danh sách các task có trạng thái là `Submitted` thuộc các dự án được giao cho QA đó.
  3. QA hỗ trợ bộ lọc nhanh theo Tên Annotator, Batch ID hoặc tìm kiếm trực tiếp theo Task ID.
  4. Bấm vào một task trong danh sách sẽ mở ra giao diện kiểm duyệt chi tiết (QA Review Workspace).

### US-09: Đối chiếu điểm số & Xem lịch sử Task (QA Specialist)
- **Mô tả:**
  - **As a** QA Specialist,
  - **I want to** compare the Annotator's scores with the AI Pre-score and review the task's history,
  - **So that** I can spot anomalies and verify the annotator's reasoning.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  1. Giao diện QA Review hiển thị đầy đủ thông tin: answer context, claim text, trạng thái nguồn, điểm số của Annotator và các ghi chú giải trình đi kèm.
  2. Hệ thống hiển thị phần so sánh chênh lệch (diff score) trực quan giữa điểm của Annotator và điểm AI Pre-score gốc (ví dụ: bôi đỏ/vàng nếu chênh lệch lớn hơn $\pm 0.20$).
  3. QA có thể xem tab "Lịch sử Task" (Task History) hiển thị nhật ký các lần submit, return của task này ở quá khứ (bao gồm thời gian, người thực hiện và lý do trả về trước đó nếu có).

### US-10: Thực hiện Duyệt (Approve) hoặc Trả về (Return) (QA Specialist)
- **Mô tả:**
  - **As a** QA Specialist,
  - **I want to** approve or return a task with specific feedback,
  - **So that** approved tasks are marked clean, and erroneous tasks are sent back to the annotator for correction.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  1. Tại màn hình QA Review, hệ thống hiển thị hai nút hành động nổi bật: **Approve** (Duyệt) và **Return** (Trả lại).
  2. Khi QA bấm **Approve**:
     - Hệ thống chuyển trạng thái task sang `Approved` (đủ điều kiện export).
     - Nhật ký hệ thống ghi nhận hành động: `approve` (QA ID, Task ID, Timestamp).
  3. Khi QA bấm **Return**:
     - Hệ thống hiển thị modal/pop-up bắt buộc QA phải:
       - **Chọn phân loại lỗi (Error Category)** từ danh sách cố định: *Sai điểm số (Wrong Score)*, *Thiếu ghi chú (Missing Notes)*, *Sai trạng thái nguồn (Incorrect Source Status)*, *Sai claim text (Bad Claim Text)*.
       - **Nhập ghi chú lý do trả về (QA Comment)**: Ô nhập text bắt buộc (tối thiểu 10 ký tự).
     - Sau khi QA xác nhận gửi:
       - Trạng thái task chuyển thành `Returned`.
       - Task tự động quay lại hàng đợi của Annotator đã thực hiện trước đó kèm theo phân loại lỗi và comment của QA hiển thị nổi bật.
       - Nhật ký hệ thống ghi nhận hành động: `return` (QA ID, Task ID, Phân loại lỗi, Comment, Timestamp).

---

## 5. Luồng Xuất dữ liệu (Export Flow)

### US-11: Xuất dữ liệu Approved ra CSV (Admin)
- **Mô tả:**
  - **As an** Admin,
  - **I want to** export all approved claim annotations as a CSV file,
  - **So that** I can retrieve clean, validated data for training/evaluation models.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  1. Nút "Export CSV" tại màn hình quản lý dự án chỉ hiển thị và cho phép nhấn đối với người dùng có vai trò Admin.
  2. Hệ thống thực hiện truy vấn và chỉ xuất dữ liệu từ những task có trạng thái là `Approved`.
  3. Dữ liệu xuất ra ở định dạng CSV phẳng cấp độ claim (claim-level - mỗi dòng trong file CSV tương ứng với một claim đã duyệt).
  4. File CSV xuất ra chứa đầy đủ các trường thông tin sau:
     - `task_id` (Mã định danh của Claim Task)
     - `parent_task_id` (Mã định danh của file PDF gốc)
     - `pdf_filename` (Tên file PDF nguồn gốc)
     - `extracted_text` (Nội dung văn bản trích xuất từ PDF gốc)
     - `claim_text` (Nội dung claim đã duyệt)
     - `source_urls` (Danh sách URL nguồn trích xuất từ PDF hoặc do Admin bổ sung)
     - `source_statuses` (Trạng thái tương ứng của các URL nguồn)
     - Điểm số chi tiết 6 chiều: `score_sf`, `score_sc`, `score_nh`, `score_sq`, `score_rel`, `score_comp`
     - `composite_score` (Điểm tổng hợp trung bình)
     - `annotator_id` (Mã người gán nhãn)
     - `qa_id` (Mã người kiểm duyệt)
     - `approved_at` (Thời gian phê duyệt)
  5. Nhật ký hệ thống (Audit Log) ghi nhận hành động: `export` (Admin ID, Tên file, Số dòng xuất ra, Timestamp).

---

## 6. Ma trận Trạng thái Task (Task State Matrix) trong MVP

Để các User Stories trên vận hành nhất quán, vòng đời của một Task được thiết kế với các trạng thái sau:

```mermaid
state-diagram-v2
    [*] --> Source_Mapping_Required : Import (Không có URL)
    [*] --> Pre_scoring_Pending : Import (Có URL)
    
    Pre_scoring_Pending --> Pre_scoring_Failed : Lỗi gọi API LLM
    Pre_scoring_Failed --> Pre_scoring_Pending : Admin bấm Retry
    
    Pre_scoring_Pending --> Assigned : LLM Pre-score thành công
    Source_Mapping_Required --> Assigned : Đã bổ sung URL nguồn
    
    Assigned --> Submitted : Annotator bấm Submit (Đã lưu nháp)
    Returned --> Submitted : Annotator sửa & bấm Submit lại
    
    Submitted --> Approved : QA bấm Approve
    Submitted --> Returned : QA bấm Return (Kèm lý do & loại lỗi)
    
    Approved --> [*] : Được xuất trong Export CSV
```

| Trạng thái | Ý nghĩa | Vai trò tác động |
| :--- | :--- | :--- |
| `Source Mapping Required` | Task bị thiếu URL nguồn, cần Admin bổ sung trước khi gán nhãn. | Admin |
| `Pre-scoring Pending` | Đang đợi hệ thống gọi LLM lấy điểm gợi ý. | System |
| `Pre-scoring Failed` | Gọi API LLM lỗi, chờ Admin cấu hình lại hoặc bấm retry. | System / Admin |
| `Assigned` | Đã gán cho Annotator, đang trong hàng đợi gán nhãn hoặc lưu nháp. | Annotator |
| `Submitted` | Annotator đã hoàn thành và gửi đi, đang chờ QA duyệt. | Annotator ➔ QA |
| `Returned` | QA phát hiện lỗi và trả lại task yêu cầu sửa đổi. | QA ➔ Annotator |
| `Approved` | QA đã duyệt thông qua, sẵn sàng để xuất dữ liệu sạch. | QA ➔ Admin |
