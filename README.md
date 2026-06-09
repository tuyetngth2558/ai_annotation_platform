# VSF AI Annotation Platform

VSF AI Annotation Platform là nền tảng nội bộ hỗ trợ chuẩn hóa quy trình đánh giá chất lượng đầu ra của mô hình ngôn ngữ lớn (LLM). Hệ thống được định hướng để thay thế cách làm thủ công trên spreadsheet bằng một workflow có cấu trúc, dễ theo dõi và có khả năng mở rộng cho nhiều loại dự án annotation trong tương lai.

Trong giai đoạn MVP hiện tại, dự án tập trung vào một use case duy nhất là **Vivipedia**, với một modality duy nhất là **text**. Mục tiêu là xây dựng được một luồng chạy end-to-end đủ dùng thực tế:

`Import PDF Bundle -> Claim Extraction -> LLM Pre-scoring -> Annotator Review -> QA Review -> Export CSV`

## Mục tiêu MVP

- Chuẩn hóa quy trình annotation theo workflow rõ ràng
- Giảm thao tác thủ công khi review output của LLM
- Cho phép annotator và QA làm việc trên giao diện tập trung
- Xuất dữ liệu sạch phục vụ downstream processing
- Tạo nền tảng để mở rộng sang đa dự án và đa modality trong các phase tiếp theo

## Phạm vi hiện tại

MVP 4 tuần chỉ triển khai:

- `text annotation`
- `PDF Bundle import` (answer + source ref + source content — input chính, OQ-001)
- `claim-level review`
- `QA Approve / Return`
- `CSV export`

Các hạng mục như dispute workflow, policy center, analytics nâng cao, audio/image workspace và security hardening đầy đủ sẽ được xem xét ở giai đoạn sau.

## Định hướng mở rộng

Mặc dù MVP chỉ build hẹp cho text, hệ thống được định hướng để về sau có thể hỗ trợ:

- nhiều loại dự án annotation
- nhiều loại input như `audio`, `image`
- cấu hình workflow linh hoạt hơn
- tích hợp analytics, policy management và quality control nâng cao

## Cấu trúc thư mục

```text
.
├── .github/                # Template hỗ trợ review và cộng tác
├── docs/                   # Tài liệu dự án (BA, ERD, ADR...)
│   └── adr/                # Architecture Decision Records
├── infra/                  # Dockerfile, postgres init, hạ tầng
├── scripts/                # dev.ps1, seed_dev.py
├── docker-compose.yml      # dev stack: postgres+redis+minio+api+worker+web
├── .env.example            # template biến môi trường
├── src/
│   ├── backend/            # FastAPI + ARQ worker (feature-based)
│   │   ├── app/
│   │   │   ├── core/       # config, security, permissions, exceptions, middleware
│   │   │   ├── models/     # 16 entity SQLAlchemy (bám ERD)
│   │   │   ├── features/   # auth, projects, import_bundle, annotation, qa_review, export, audit
│   │   │   ├── integrations/  # storage (S3/MinIO), llm (interface)
│   │   │   ├── jobs/       # ARQ worker + tasks + pipelines
│   │   │   └── api/v1/     # router versioned
│   │   └── tests/          # pytest: unit, integration, fixtures
│   ├── frontend/
│   │   ├── prototype/      # 4 HTML tham chiếu (giữ nguyên)
│   │   └── web/            # React + Vite + TS (feature-based co-locate)
│   │       └── src/
│   │           ├── app/        # router, layouts, providers (Theme/Auth)
│   │           ├── features/   # mỗi feature: components/hooks/pages/locales
│   │           ├── shared/     # ui, lib, hooks, types
│   │           ├── i18n/       # config + locales/common (namespace theo feature)
│   │           └── styles/     # tokens.css (OKLCH), base.css
│   └── shared/             # contracts dùng chung (api types generate sau)
```

## Development

> 📖 **Onboarding theo vai trò** — hướng dẫn chi tiết setup/chạy/code/test:
> - [Backend Dev](docs/onboarding/backend-dev.md) · [Frontend Dev](docs/onboarding/frontend-dev.md) · [Test/QA](docs/onboarding/test-qa.md) · [DevOps](docs/onboarding/devops.md)
> - Tổng quan + quickstart: [docs/onboarding/](docs/onboarding/)
> - Hướng dẫn người dùng (Admin/Annotator/QA): [docs/user-guide/](docs/user-guide/)

### Yêu cầu
- Docker Desktop (chạy toàn bộ stack)
- (tùy chọn, để dev ngoài docker) Node 20+, Python 3.12 + [uv](https://docs.astral.sh/uv/)

### Chạy nhanh
```bash
cp .env.example .env        # điền secret nếu cần (vd SECRET_ENCRYPTION_KEY)
docker compose up -d        # hoặc: make up  /  .\scripts\dev.ps1 up
```

| Dịch vụ | URL |
|---|---|
| Web (UI) | http://localhost:5173 |
| API | http://localhost:8000 · `/health` · `/docs` |
| MinIO console | http://localhost:9001 (`minioadmin`/`minioadmin`) |

**Đăng nhập demo** (mock, chỉ dev — `AUTH_MOCK_ENABLED=true`):

| Role | Email | Password |
|---|---|---|
| Admin | admin@vsf.local | admin-demo-2026 |
| Annotator | annotator@vsf.local | annotator-demo-2026 |
| QA | qa@vsf.local | qa-demo-2026 |

### Lệnh hay dùng
```bash
make migrate        # Alembic upgrade head
make test           # pytest + vitest
make e2e            # Playwright smoke
make logs s=api     # xem log 1 service
# Windows: .\scripts\dev.ps1 <lệnh>
```

### Trạng thái
Đây là **scaffold base** — khung chạy được, mọi màn theo role có skeleton, nội dung
nghiệp vụ đánh dấu `TODO(<feature>)` trỏ về `docs/03_ba/`. Chưa implement logic.

### Quy ước đặt tên
| Loại | Quy ước | Ví dụ |
|---|---|---|
| Python package/module | `snake_case` | `import_bundle`, `qa_review` |
| FE folder/route | `kebab-case` | `import-bundle`, `qa-review` |
| API path | `kebab-case` | `/api/v1/import-bundles`, `/api/v1/qa-reviews` |

### Kiến trúc & quyết định
Xem [docs/adr/](docs/adr/) cho lý do các lựa chọn (stack, storage, auth, worker, cấu trúc).


