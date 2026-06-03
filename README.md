# VSF AI Annotation Platform

Repository này dùng để quản lý tập trung:

- tài liệu sản phẩm và BA
- thiết kế luồng và sơ đồ hệ thống
- mã nguồn frontend/backend
- hạ tầng và script hỗ trợ
- test artifacts và tài liệu vận hành

## Mục tiêu repository

Trong giai đoạn MVP 4 tuần, repository này giúp team:

- theo dõi scope, tài liệu và quyết định đã chốt
- push code và docs vào đúng chỗ
- giảm tình trạng tài liệu nằm rải rác
- giúp mentor và team dễ review tiến độ

## Cấu trúc thư mục

```text
.
├── .github/                # Template hỗ trợ review và cộng tác
├── docs/                   # Tài liệu dự án
├── infra/                  # Hạ tầng, deploy, env setup
├── scripts/                # Script hỗ trợ import/export/dev
├── src/
│   ├── backend/            # API, services, business logic
│   ├── frontend/           # Web UI
│   └── shared/             # Shared contracts / schemas / constants
├── BA_Tuyết/               # Tài liệu BA hiện tại của Tuyết (giữ nguyên tạm thời)
├── PRD_VSF_AI_Annotation_Platform.md
├── Chốt Scope & Phân Công — VSF AI Annotation Platform MVP.md
└── ...
```

## Quy ước team nên dùng

### 1. Code

- Frontend đặt trong `src/frontend`
- Backend đặt trong `src/backend`
- Shared schemas, DTOs, constants đặt trong `src/shared`

### 2. Docs

- Tài liệu tổng quan đặt trong `docs/`
- Tài liệu BA theo người hoặc theo chủ đề đặt trong `docs/03_ba/`
- Sơ đồ, PDF, ảnh workflow đặt trong `docs/04_diagrams/`
- Tài liệu test/QA đặt trong `docs/06_test_qa/`
- Tài liệu DevOps đặt trong `docs/07_devops/`

### 3. Naming

- Ưu tiên tên file ASCII, dùng `_` thay vì khoảng trắng khi tạo file mới
- Ví dụ:
  - `mvp_scope_v1.md`
  - `annotation_workspace_flow.md`
  - `import_schema_v1.md`

### 4. Branching gợi ý

- `main`: nhánh ổn định
- `dev`: nhánh tích hợp
- feature branch:
  - `feature/frontend-annotation-workspace`
  - `feature/backend-import-pipeline`
  - `docs/ba-screen-spec`

## Tài liệu hiện có

### Scope và planning

- [PRD gốc](./PRD_VSF_AI_Annotation_Platform.md)
- [Chốt scope và phân công MVP](./Chốt%20Scope%20%26%20Ph%C3%A2n%20C%C3%B4ng%20%E2%80%94%20VSF%20AI%20Annotation%20Platform%20MVP.md)
- [Báo cáo điều chỉnh scope 4 tuần](./Bao_cao_dieu_chinh_scope_4_tuan.md)

### BA research

- [BA Research Plan](./BA_Research_Plan_MVP.md)
- [Bộ câu hỏi khảo sát nghiệp vụ + cost research](./Bộ%20câu%20hỏi%20khảo%20sát%20nghiệp%20vụ%20%2B%20cost%20research.md)

### BA của Tuyết

- [Thư mục BA_Tuyết](./BA_Tuyết/)

### Diagram và artifacts

- [Workflow diagram](./workflow_diagram.png)
- [Scope breakdown PDF](./VSF_AI_Annotation_Platform_Scope_Breakdown.pdf)
- [Context diagram PDF](./VSF_AI_Annotation_Platform_Context_Diagram.pdf)

## Bước tiếp theo team nên làm

1. Tạo codebase frontend/backend trong `src/frontend` và `src/backend`
2. Chuyển dần tài liệu từ root vào `docs/` theo từng nhóm
3. Thống nhất branch strategy và quy trình PR
4. Tạo issue/task map với ClickUp hoặc GitHub Issues

## Remote repository

Remote dự kiến:

`https://github.com/tuyetngth2558/ai_annotation_platform.git`

## Lệnh git nên chạy khi khởi tạo chính thức

```bash
git init
git branch -M main
git remote add origin https://github.com/tuyetngth2558/ai_annotation_platform.git
git add .
git commit -m "chore: initialize repository structure"
git push -u origin main
```

> Hiện tại môi trường làm việc này bị chặn ghi hoàn chỉnh vào `.git/config`, nên cấu trúc repo đã được chuẩn bị ở mức thư mục và tài liệu; phần lệnh git nên chạy lại trực tiếp trên máy khi kết nối remote chính thức.
