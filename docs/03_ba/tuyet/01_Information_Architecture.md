# Information Architecture — VSF AI Annotation Platform MVP

**Owner:** Tuyết  
**Phiên bản:** 2.0  
**Ngày:** 03/06/2026  
**Trạng thái:** Ready for cross-review  

---

## 1. Mục đích tài liệu

Tài liệu này mô tả cấu trúc thông tin tổng thể của VSF AI Annotation Platform MVP, thể hiện:

- cách tổ chức module và màn hình
- quyền truy cập theo vai trò
- luồng điều hướng chính của người dùng
- ranh giới giữa phạm vi `build now`, `design now`, `build later`

Tài liệu này là input trực tiếp cho:

- Screen Flow
- Screen Specification
- Wireframe/Prototype
- kế hoạch build của dev

---

## 2. Phạm vi MVP được áp dụng trong IA

### 2.1. Build now

- 1 modality duy nhất: `text`
- 1 use case duy nhất: `Vivipedia`
- desktop web
- import thủ công bằng `CSV/JSON`
- annotation workspace cho claim-level review
- QA review cơ bản với `Approve` và `Return`
- export `CSV` claim-level
- RBAC cơ bản
- audit log mức tối thiểu

### 2.2. Design now, chưa build

- mô hình đa dự án
- mô hình đa modality (`audio`, `image`)
- cấu trúc module có thể mở rộng cho dispute, policy, analytics
- data model mở rộng cho asset đa loại

### 2.3. Build later

- dispute workflow
- policy center
- analytics nâng cao
- notification center
- audio/image workspace

---

## 3. Thuật ngữ dùng thống nhất

| Thuật ngữ | Ý nghĩa trong MVP |
|---|---|
| Project | Một dự án annotation thuộc 1 use case |
| Batch | Một lần import dữ liệu vào project |
| Work Item | Đơn vị nghiệp vụ gốc, tương ứng một câu trả lời LLM đầu vào |
| Claim Task | Đơn vị annotation chính trong MVP |
| Annotation Workspace | Màn hình annotator chấm và submit claim |
| QA Review Workspace | Màn hình QA review kết quả annotator |
| Approved | Trạng thái task đủ điều kiện export |
| Returned | Task bị QA trả lại cho annotator |

> **Quy ước dùng tài liệu:** Trong UI có thể hiển thị ngắn là `Task`, nhưng trong BA/spec nên hiểu task annotation chính của MVP là `Claim Task`.

---

## 4. Người dùng và vai trò trong MVP

| Vai trò | Viết tắt | Quyền truy cập chính |
|---|---|---|
| Admin / Program Manager | ADMIN | Quản lý project, import, phân công, export, user, audit |
| Annotator | ANN | Xem task được giao, mở workspace, submit, resubmit |
| QA Specialist | QA | Xem QA queue, review, approve, return, export trong phạm vi được cấp |

> **Ngoài phạm vi MVP:** Policy Analyst chưa có module riêng. Dispute workflow bị hoãn.

---

## 5. Sơ đồ Information Architecture tổng thể

```text
VSF AI Annotation Platform
│
├── Auth
│   ├── Login
│   └── Đổi mật khẩu
│
├── Dashboard / Home
│   ├── Dashboard Admin
│   ├── Dashboard Annotator
│   └── Dashboard QA
│
├── Projects [ADMIN]
│   ├── Project List
│   ├── Project Setup
│   ├── Project Detail
│   ├── Import Dataset
│   ├── Batch List
│   └── Team Assignment
│
├── My Tasks [ANN]
│   ├── Task List
│   └── Annotation Workspace
│
├── QA Queue [QA, ADMIN]
│   ├── QA Task List
│   └── QA Review Workspace
│
├── Export [ADMIN, QA]
│   ├── Create Export Job
│   └── Export History
│
├── User Management [ADMIN]
│   ├── User List
│   └── Role Assignment
│
└── Audit Log [ADMIN]
    ├── Audit List
    └── Audit Detail
```

---

## 6. Phân cấp màn hình MVP

### 6.1. Cấp 0 — Platform Shell

- header toàn cục
- user menu
- role-based sidebar
- breadcrumb

### 6.2. Cấp 1 — Module chính

| Module | URL gợi ý | Vai trò | MVP |
|---|---|---|---|
| Dashboard | `/dashboard` | ALL | Build |
| Projects | `/projects` | ADMIN | Build |
| My Tasks | `/tasks` | ANN | Build |
| QA Queue | `/qa` | QA, ADMIN | Build |
| Export | `/export` | ADMIN, QA | Build |
| Users | `/users` | ADMIN | Build |
| Audit Log | `/audit` | ADMIN | Build |
| Policies | `/policies` | N/A | Chưa build |
| Analytics | `/analytics` | N/A | Chưa build |
| Disputes | `/disputes` | N/A | Chưa build |

### 6.3. Cấp 2 — Sub-module

| Sub-module | URL gợi ý | Vai trò | Ghi chú |
|---|---|---|---|
| Project Setup | `/projects/new` | ADMIN | Màn chính #1 |
| Project Detail | `/projects/:id` | ADMIN | Theo dõi tiến độ cơ bản |
| Import Dataset | `/projects/:id/import` | ADMIN | Màn chính #1 |
| Task List | `/tasks` | ANN | Danh sách claim task |
| Annotation Workspace | `/tasks/:id/annotate` | ANN | Màn chính #2 |
| QA Queue List | `/qa` | QA, ADMIN | Danh sách task cần review |
| QA Review Workspace | `/qa/:id/review` | QA, ADMIN | Màn chính #3 |
| Export Form | `/export/new` | ADMIN, QA | Màn phụ build trong MVP |

---

## 7. Vai trò và điều hướng chính

### 7.1. Luồng ADMIN

```text
Login → Dashboard → Project Setup → Import Dataset
→ Theo dõi xử lý → Export → Audit Log
```

### 7.2. Luồng ANNOTATOR

```text
Login → Dashboard / My Tasks → Chọn task
→ Annotation Workspace → Submit / Resubmit
```

### 7.3. Luồng QA

```text
Login → Dashboard / QA Queue → Chọn task
→ QA Review Workspace → Approve / Return
```

---

## 8. Mô tả module và nội dung chính

### 8.1. Dashboard / Home

**Mục tiêu MVP:** làm landing page đơn giản theo vai trò, không phải dashboard analytics nâng cao.

| Vai trò | Nội dung chính |
|---|---|
| ADMIN | Số lượng project, batch, task theo trạng thái cơ bản |
| ANN | Số task được giao, task đang làm, task bị return |
| QA | Số task đang chờ review, đã approve, đã return |

### 8.2. Projects

| Khu vực | Nội dung |
|---|---|
| Project List | Danh sách project, trạng thái, số batch, số task |
| Project Setup | Tạo project mới với modality cố định là text |
| Project Detail | Overview cơ bản, import entry point, batch list, team assignment |
| Import Dataset | Upload file, validate schema, preview, xác nhận import |

### 8.3. My Tasks

| Khu vực | Nội dung |
|---|---|
| Task List | Chỉ hiển thị task được giao cho annotator hiện tại |
| Filter | all / in-progress / submitted / returned |
| Sort | created time / updated time / deadline |
| Annotation Workspace | khu vực làm việc chính của annotator |

### 8.4. QA Queue

| Khu vực | Nội dung |
|---|---|
| QA Task List | Danh sách task được đưa vào QA queue |
| Filter | pending / in-review / approved / returned |
| QA Review Workspace | so sánh LLM baseline và annotator output, rồi approve/return |

### 8.5. Export

| Khu vực | Nội dung |
|---|---|
| Export Form | Chọn project, batch tùy chọn, trạng thái Approved, format CSV |
| Export History | Danh sách export job đã chạy |

### 8.6. User Management

| Khu vực | Nội dung |
|---|---|
| User List | Danh sách user, trạng thái, role |
| Role Assignment | Gán role cơ bản theo MVP |

### 8.7. Audit Log

| Khu vực | Nội dung |
|---|---|
| Audit List | Lọc theo user, action, thời gian |
| Audit Detail | Xem một action cụ thể |

---

## 9. Mapping màn hình với tính năng MVP

| Màn hình | Tính năng trong MVP | Chưa build |
|---|---|---|
| Project Setup / Import | Tạo project, nhập file, validate, chạy pipeline nền | multi-modality config |
| Annotation Workspace | review claim, chấm 6 dimension, source verification, submit | dispute, audio/image workspace |
| QA Review Workspace | review diff, approve, return | dispute, sampling engine UI nâng cao |
| Export | CSV claim-level | XLSX/JSON, bulk export |
| Dashboard | số đếm cơ bản theo role | analytics real-time |
| User Management | RBAC cơ bản | workload management |
| Audit Log | log action chính | immutable/WORM |

---

## 10. Nguyên tắc thiết kế IA

1. **Role-based navigation**  
Mỗi role chỉ nhìn thấy các module liên quan trực tiếp đến công việc.

2. **Task-first**  
Annotator và QA vào app là đi nhanh tới nơi làm việc chính trong tối đa 3 click.

3. **Context-first workspace**  
Workspace luôn giữ context của câu trả lời gốc và nguồn tham chiếu trong khi chấm điểm.

4. **Extensible structure**  
URL và module phải mở rộng được cho dispute, policies, analytics về sau mà không phá cấu trúc hiện tại.

5. **MVP-safe**  
Không đưa vào IA các module khiến team hiểu nhầm là phải build trong 4 tuần, trừ khi được đánh dấu rõ là future phase.

---

## 11. Hướng mở rộng sau MVP

| Hạng mục | MVP | Phase sau |
|---|---|---|
| Policy Center | Chưa build | Phase 2 |
| Dispute Management | Chưa build | Phase 2 |
| Analytics nâng cao | Chưa build | Phase 2 |
| Audio/Image Workspace | Chỉ design khung | Phase 2+ |
| Notification Center | Chưa build | Phase 2 |

---

## 12. Điểm cần review chéo

- **Quang:** kiểm tra IA có khớp workflow và state machine không
- **Đan:** kiểm tra thuật ngữ `Project / Batch / Work Item / Claim Task` có khớp data model không
- **Trí:** dùng tài liệu này để dựng wireframe và xác nhận độ sâu điều hướng

---

*Tài liệu này là input nền cho `02_Screen_Flow.md` và `03_Screen_Specification.md`.*
