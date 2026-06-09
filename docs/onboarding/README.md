# Onboarding — Hướng dẫn theo vai trò (Dev / Ops / Test)

Tài liệu giúp **thành viên mới trong team** setup máy và chạy được dự án theo đúng vai trò
của mình. Đọc phần **Quickstart chung** trước, rồi rẽ sang guide của vai trò.

> Hướng dẫn cho **người dùng cuối** (Admin / Annotator / QA dùng app) nằm ở
> [docs/user-guide/](../user-guide/).

---

## 0. Quickstart chung (mọi role làm trước)

### Yêu cầu cài đặt
| Công cụ | Bắt buộc | Dùng để |
|---|---|---|
| **Docker Desktop** | ✅ mọi role | Chạy cả stack (postgres/redis/minio/api/worker/web) |
| **Git** | ✅ | Clone repo |
| Node 20+ | Frontend dev, Test/QA | Chạy/test FE ngoài docker |
| Python 3.12 + [uv](https://docs.astral.sh/uv/) | Backend dev, Test/QA | Chạy/test BE ngoài docker |

### Chạy lần đầu (3 lệnh)
```bash
git clone <repo-url>
cd ai_annotation_platform
cp .env.example .env          # điền secret nếu cần (xem mục dưới)
docker compose up -d          # build + chạy toàn bộ stack
```

Đợi ~1-2 phút build lần đầu. Kiểm tra:
```bash
docker compose ps             # tất cả phải "running"/"healthy"
```

### Truy cập
| Dịch vụ | URL | Đăng nhập |
|---|---|---|
| **Web (UI)** | http://localhost:5173 | tài khoản mock bên dưới |
| **API docs** | http://localhost:8000/docs | — |
| **API health** | http://localhost:8000/health | — |
| **MinIO console** | http://localhost:9001 | `minioadmin` / `minioadmin` |

### Tài khoản đăng nhập demo (mock — chỉ dev)
| Role | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@vsf.local` | `admin-demo-2026` |
| Annotator | `annotator@vsf.local` | `annotator-demo-2026` |
| QA | `qa@vsf.local` | `qa-demo-2026` |

> Mock login bật bằng `AUTH_MOCK_ENABLED=true` (mặc định ở dev). **Staging/prod phải tắt.**

### Lệnh hay dùng
```bash
# Unix/WSL/Git-bash:
make up            # khởi động
make down          # dừng
make logs s=api    # xem log 1 service (api/web/worker/postgres/redis/minio)
make migrate       # chạy DB migration
make seed          # seed 3 user mock
make test          # chạy toàn bộ test (pytest + vitest)

# Windows PowerShell (tương đương):
.\scripts\dev.ps1 up
.\scripts\dev.ps1 logs api
.\scripts\dev.ps1 seed
```

### Trạng thái dự án (quan trọng)
Đây là **scaffold base** — khung chạy được, nhưng **nghiệp vụ chưa implement**. Mọi chỗ
cần code đánh dấu `TODO(<feature>)` trỏ về `docs/03_ba/`. Login + điều hướng theo role đã
chạy; các trang nghiệp vụ là skeleton; API nghiệp vụ trả `501 Not Implemented`.

---

## 1. Rẽ theo vai trò của bạn

| Vai trò | Bạn làm gì | Guide |
|---|---|---|
| **Backend Developer** | API, models, services, jobs, pipeline LLM | [backend-dev.md](backend-dev.md) |
| **Frontend Developer** | UI React, feature pages, i18n, theme | [frontend-dev.md](frontend-dev.md) |
| **Test / QA Engineer** | pytest, Vitest, Playwright E2E, viết test case | [test-qa.md](test-qa.md) |
| **DevOps / Infra** | docker, env, secret, deploy, CI/CD | [devops.md](devops.md) |

## 1b. Tài liệu chung (mọi role đọc)

| Tài liệu | Tác dụng |
|---|---|
| **[docs/PROJECT_STATE.md](../PROJECT_STATE.md)** | ⭐ Giờ đang ở đâu (cái gì xong/TODO). Đọc đầu phiên |
| [CONVENTIONS.md](../../CONVENTIONS.md) | Quy ước code thống nhất (naming, structure...) |
| [git-workflow.md](git-workflow.md) | Branch, commit, PR, review |
| [logging-and-observability.md](logging-and-observability.md) | Chuẩn log + cấm log secret |
| [troubleshooting.md](troubleshooting.md) | Sự cố thường gặp + cách sửa |
| [AGENTS.md](../../AGENTS.md) / [CLAUDE.md](../../CLAUDE.md) | Luật cho AI coding agent |

---

## 2. Cấu trúc repo (bản đồ nhanh)

```
ai_annotation_platform/
├── docker-compose.yml · .env.example · Makefile · scripts/dev.ps1
├── docs/                       # tài liệu (BA, ADR, tech-selection, onboarding, user-guide)
├── infra/                      # Dockerfile, postgres init
├── scripts/                    # dev.ps1, seed_dev.py
└── src/
    ├── backend/                # FastAPI + ARQ (feature-based) → backend-dev.md
    ├── frontend/web/           # React + Vite (co-locate)      → frontend-dev.md
    └── shared/                 # contracts dùng chung
```

## 3. Quy ước đặt tên
| Loại | Quy ước | Ví dụ |
|---|---|---|
| Python package/module | `snake_case` | `import_bundle`, `qa_review` |
| FE folder/route | `kebab-case` | `import-bundle`, `qa-review` |
| API path | `kebab-case` | `/api/v1/import-bundles` |

## 4. Quyết định kiến trúc
Vì sao chọn stack này — xem [docs/adr/](../adr/) và
[docs/05_architecture/tech-selection/](../05_architecture/tech-selection/).
