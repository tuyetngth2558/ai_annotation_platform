# **Chốt Scope & Phân Công — VSF AI Annotation Platform MVP**

**Dự án:** VSF AI Annotation Platform  
**Thời gian:** 4 tuần  
**Ngày chốt:** 2026-06-08

## **1\. Mục tiêu 4 tuần**

**MVP đạt yêu cầu khi:**

* Dữ liệu thật đi qua được toàn bộ pipeline từ đầu đến cuối  
* Hệ thống nhận đầu vào bằng **PDF bundle**  
* Annotator có thể review và submit kết quả trên giao diện thực tế  
* QA có thể approve hoặc return task  
* Kết quả export được ra **CSV claim-level**  
* Demo ổn định được nội bộ với mentor/stakeholder

**Luồng MVP:**  
PDF Bundle Upload → PDF Parsing / Text Extraction → Internal Normalization → Claim Extraction → LLM Pre-scoring → Annotator Review → QA Review → Export CSV

## **2\. Nguyên tắc cốt lõi**

| \# | Nguyên tắc |
| :---- | :---- |
| 1 | Chỉ **1 modality**: text — implement thật trong 4 tuần |
| 2 | Chỉ **1 use case**: Vivipedia |
| 3 | Chỉ **desktop web** — không làm mobile trong MVP |
| 4 | Chỉ **1 LLM provider** đã chốt sẵn |
| 5 | Chỉ **1 format input chính**: PDF bundle |
| 6 | Không yêu cầu user/BA convert thủ công PDF thành CSV/JSON trước khi import |
| 7 | Chỉ **QA cơ bản**: Approve / Return — chưa mở dispute |
| 8 | Chỉ **security baseline** — chưa full compliance |
| 9 | **Design rộng, build hẹp**: data model & tài liệu phải support mở rộng audio, image về sau |

## **3\. Scope — Sẽ build trong 4 tuần**

**Tính năng BẮT BUỘC phải có**

| Hạng mục | Mô tả |
| :---- | :---- |
| Project setup | Tạo project MVP cho Vivipedia, cấu hình LLM cơ bản, phân công Annotator/QA |
| PDF bundle import | Upload answer PDF \+ source reference PDF \+ source content PDF |
| Upload validation | Kiểm tra đủ file bắt buộc, đúng role file, đúng định dạng PDF |
| PDF parsing / text extraction | Parse text thô từ PDF ở mức MVP, lưu raw và normalized text |
| Internal normalization | Chuẩn hóa metadata, answer text, source list để tạo dữ liệu nội bộ có cấu trúc |
| Claim extraction | Ở mức cơ bản từ normalized answer text |
| Source mapping / validation | Cơ bản theo source order, source title, citation marker và source status |
| LLM pre-scoring | 1 provider cố định |
| Annotator workspace | 6 tiêu chí hard-code; sửa claim text, cập nhật source status, ghi chú |
| QA workflow | Approve và Return |
| Export | CSV claim-level |
| RBAC | Cơ bản theo vai trò |
| Audit log | Mức tối thiểu cho các action chính |

## **4\. Scope — Chỉ design, chưa build**

Những mục này phải được **thiết kế đúng ngay từ đầu** để không phải đập lại về sau — nhưng **không cần code đầy đủ trong 4 tuần**.

* Mô hình đa dự án, đa modality (audio, image)  
* ERD có khả năng mở rộng  
* Import abstraction cho nhiều loại input  
* Generic task lifecycle  
* Cấu trúc asset storage/reference  
* Workspace theo từng modality  
* Parser architecture đủ chỗ cho OCR hoặc advanced extraction về sau  
* Rubric configurability cho phase sau

## **5\. Scope — Hoãn lại, làm sau**

* Dispute workflow đầy đủ  
* Policy Center & guideline editor  
* In-app notification  
* Risk-based sampling engine  
* IAA tự động & Gold standard injection  
* Dashboard analytics nâng cao  
* SLA tracking chi tiết  
* Dynamic watermark, Network allowlist  
* MFA bắt buộc 100%, Anomaly detection  
* Audit immutable/WORM  
* Export XLSX/JSON đầy đủ, bulk ZIP  
* Team performance dashboard, Workload management  
* Global search, Bulk operations  
* Audio/Image annotation (player, timeline, bounding box, waveform...)  
* Rubric riêng cho từng modality  
* Pipeline xử lý media lớn  
* OCR đầy đủ cho scan/image PDF phức tạp

## **6\. Kế hoạch 4 tuần**

**Tuần 1 — Chốt nền tảng**

* \[ \] Chốt scope MVP với stakeholder/mentor  
* \[ \] Chốt đầu vào chính thức là **PDF bundle**  
* \[ \] Chốt cấu trúc bundle: answer PDF, source reference PDF, source content PDF  
* \[ \] Chốt LLM provider  
* \[ \] Chốt claim extraction flow  
* \[ \] Chốt parser MVP mức tối thiểu: parse text, metadata, source list  
* \[ \] Thiết kế data model mở rộng đa modality  
* \[ \] Thiết kế user flow và wireframe chính  
* \[ \] Setup môi trường dev/staging  
* \[ \] Setup auth và RBAC cơ bản

**Tuần 2 — Build luồng annotation chính**

* \[ \] PDF bundle upload  
* \[ \] Upload validation  
* \[ \] PDF parsing / text extraction  
* \[ \] Internal normalization  
* \[ \] Claim extraction  
* \[ \] LLM pre-scoring  
* \[ \] Annotator workspace  
* \[ \] Validate score/note/source status  
* \[ \] Submit flow cho annotator

**Tuần 3 — Build QA và output**

* \[ \] QA review screen (Approve / Return)  
* \[ \] Audit log tối thiểu  
* \[ \] Export CSV  
* \[ \] Polish UI luồng chính  
* \[ \] Test tích hợp end-to-end vòng 1  
* \[ \] Kiểm tra traceability từ export về PDF gốc

**Tuần 4 — Hoàn thiện và UAT**

* \[ \] Test với dữ liệu PDF thật  
* \[ \] Sửa bug ưu tiên cao  
* \[ \] Kiểm tra edge case chính: parse fail, source missing, source unparsed  
* \[ \] UAT nội bộ  
* \[ \] Ổn định staging/demo  
* \[ \] Chuẩn bị tài liệu bàn giao và bản demo

## **7\. Phân công vai trò**

### **BA — Tuyết \+ Quang \+ Đan**

| Thành viên | Vai trò | Đầu ra chính |
| :---: | :---- | :---- |
| **Tuyết** | Owner scope MVP, screen flow, đặc tả màn hình, kết nối BA ↔ UI/UX | Information Architecture, Screen Flow, Screen Specification, Feature-to-Screen Mapping |
| **Quang** | Owner workflow nghiệp vụ, acceptance criteria | Context Diagram, Use Case, Workflow/BPMN, State Diagram, User Stories, Business Rules |
| **Đan** | Owner data model, PDF import schema, validation rule | ERD, Data Dictionary, Import/Export Schema, Validation Rules, Edge Cases, Data Risk Notes |

**Đầu ra bắt buộc của BA:**

1. Scope MVP 4 tuần (build now / design now / build later)  
2. Context Diagram  
3. Use Case Diagram  
4. Workflow Diagram / BPMN  
5. Task State Diagram  
6. ERD có khả năng mở rộng  
7. Data Dictionary  
8. Feature list ưu tiên \+ User Stories  
9. Acceptance Criteria & Business Rules  
10. Validation Rules  
11. Screen Specification  
12. Open Questions / Assumptions / Dependencies log

**Lưu ý:** 

* Quang cần cập nhật workflow và use case theo hướng có bước PDF parsing / normalization  
* Đan là owner chính cho phần dữ liệu PDF-native: bundle, file role, parse result, traceability đến export

### **DevOps — Khải \+ Tuấn Anh**

| Thành viên | Vai trò | Đầu ra chính |
| :---: | :---- | :---- |
| **Khải** | Owner hạ tầng, môi trường dev/staging, secrets/config, logging | Dev/staging environment, secret management, logging cơ bản |
| **Tuấn Anh** | Owner CI/CD, database setup, storage, deploy & release | CI/CD pipeline, DB schema deploy, storage setup, release tuần 4 |

**Nhiệm vụ chính:**

* Setup và duy trì môi trường phát triển & staging  
* Chuẩn hóa biến môi trường và secret management cơ bản  
* Hỗ trợ database, storage và deployment pipeline  
* Hỗ trợ nơi lưu file PDF, naming/reference, logging, backup cơ bản và release tuần 4

### **UI/UX — Trí \+ Tuyết**

| Thành viên | Vai trò | Đầu ra chính |
| :---: | :---- | :---- |
| **Trí** | Thiết kế UI chính, wireframe, prototype | Wireframe/prototype cho 3 màn MVP chính |
| **Tuyết** | Đảm bảo UI bám đúng nghiệp vụ | Review usability, đồng bộ tài liệu |

**3 màn ưu tiên trong MVP:**

1. Project setup / PDF bundle upload  
2. Annotator workspace  
3. QA review

### **Test/QA — Nhung \+ Hưng**

| Thành viên | Vai trò | Đầu ra chính |
| :---: | :---- | :---- |
| **Nhung** | Owner test plan, test case, regression checklist, UAT | Test plan, test cases, UAT checklist |
| **Hưng** | Owner execution testing, functional test, API/UI sanity test | Test execution report, bug log, workflow export verification |

**Nhiệm vụ chính:**

* Viết test scenario theo luồng end-to-end  
* Kiểm tra validation: upload PDF, parse status, score, source status, submit, return  
* Test dữ liệu lỗi và edge case chính  
* Review acceptance criteria sớm cùng BA để không viết thiếu test case  
* Hỗ trợ UAT tuần 4

