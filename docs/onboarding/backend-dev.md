# Onboarding — Backend Developer

Hướng dẫn chi tiết cho dev backend (FastAPI + ARQ + Postgres). Đọc
[README.md](README.md) (quickstart chung) trước.

---

## 1. Bạn phụ trách gì

| Phần | Thư mục | Mô tả |
|---|---|---|
| API endpoints | `src/backend/app/features/*/routes.py` | REST theo feature, versioned `/api/v1` |
| Business logic | `src/backend/app/features/*/service.py` | Logic nghiệp vụ từng feature |
| Data models | `src/backend/app/models/` | 16 entity SQLAlchemy (bám ERD) |
| Schemas | `src/backend/app/features/*/schemas.py` | Pydantic request/response |
| Background jobs | `src/backend/app/jobs/` | ARQ worker, tasks, pipeline LLM |
| Integrations | `src/backend/app/integrations/` | Storage (S3/MinIO), LLM provider |
| Core | `src/backend/app/core/` | config, security, permissions, exceptions... |

---

## 2. Setup môi trường dev backend

### Cách A — chạy trong docker (khuyến nghị, giống prod nhất)
```bash
docker compose up -d api worker postgres redis minio
docker compose logs -f api        # xem log, hot-reload tự động khi sửa code
```
Code mount qua volume → sửa file `.py` là uvicorn tự reload.

### Cách B — chạy backend ngoài docker (debug sâu)
Cần Python 3.12 + uv. DB/Redis/MinIO vẫn dùng docker:
```bash
docker compose up -d postgres redis minio
cd src/backend
uv sync                            # cài deps vào .venv
# Sửa .env: đổi host từ tên-service sang localhost
#   DATABASE_URL=postgresql+asyncpg://vsf:vsf@localhost:5432/vsf_annotation
#   REDIS_URL=redis://localhost:6379/0
#   S3_ENDPOINT_URL=http://localhost:9000
uv run uvicorn app.main:app --reload --port 8000
# Worker (terminal khác):
uv run arq app.jobs.worker.WorkerSettings
```

---

## 3. Cấu trúc backend (feature-based)

```
src/backend/app/
├── main.py                  # app factory: mount /api/v1, CORS, middleware
├── core/
│   ├── config.py            # Pydantic Settings — đọc .env (singleton `settings`)
│   ├── security.py          # hash/verify password (bcrypt), tạo/verify JWT
│   ├── permissions.py       # require_role / require_project_role (RBAC per-project)
│   ├── crypto.py            # Fernet — mã hóa LLM API key at-rest (BR-1.2)
│   ├── exceptions.py        # AppError + subclass (NotFound/PermissionDenied/...)
│   ├── middleware.py        # request id + map AppError → ErrorResponse
│   ├── pagination.py        # page_params dependency
│   └── logging.py
├── db/
│   ├── base.py              # Base + UUIDPkMixin + TimestampMixin
│   └── session.py           # async engine + get_db dependency
├── models/                  # 16 entity — xem ERD docs/03_ba/dan/01_ERD...
├── schemas/common.py        # ErrorResponse, Page, PageMeta, HealthResponse
├── constants.py             # Role, Dimension (6 chiều), enum status/decision
├── features/                # MỖI feature: routes.py, schemas.py, service.py
│   ├── auth/                # login (mock chạy được), me (TODO)
│   ├── projects/  import_bundle/  annotation/  qa_review/  export/  audit/
├── integrations/
│   ├── storage/             # FileStorage interface + local + s3
│   └── llm/                 # LLMProvider interface + MockProvider
├── jobs/
│   ├── worker.py            # WorkerSettings (entrypoint ARQ)
│   ├── settings.py          # redis settings
│   ├── tasks/               # process_bundle, build_export
│   └── pipelines/           # import_pipeline (parse→claim→map→pre-score)
└── api/v1/
    ├── router.py            # gom router các feature
    └── health.py
```

---

## 4. Workflow code một feature (ví dụ: implement `projects`)

Endpoint hiện trả `501`. Để implement, sửa theo thứ tự:

1. **Schema** (`features/projects/schemas.py`): định nghĩa request/response Pydantic.
2. **Service** (`features/projects/service.py`): viết logic, nhận `AsyncSession`.
3. **Route** (`features/projects/routes.py`): bỏ `_todo()`, gọi service, gắn RBAC:
   ```python
   from fastapi import Depends
   from app.core.permissions import require_role
   from app.constants import Role

   @router.post("", dependencies=[Depends(require_role(Role.ADMIN))])
   async def create_project(payload: ProjectCreate, db: AsyncSession = Depends(get_db)):
       return await service.create_project(db, payload)
   ```
4. **Test** (`tests/integration/`): viết test cho endpoint (xem [test-qa.md](test-qa.md)).

> Mỗi route có docstring trỏ docs (US/AC/VR) + comment `# TODO(<feature>)`. Đọc docs
> nghiệp vụ liên quan trước khi code (link trong docstring).

---

## 5. Database & Migration (Alembic)

```bash
# Tạo migration sau khi sửa/thêm model:
docker compose exec api alembic revision --autogenerate -m "mô tả thay đổi"
# Áp dụng migration:
docker compose exec api alembic upgrade head        # hoặc: make migrate
# Xem trạng thái:
docker compose exec api alembic current
docker compose exec api alembic history
```

**Lưu ý models:**
- 16 entity đã có sẵn (bám ERD), PK uuid + `created_at/updated_at` + FK + index + unique.
- Thêm model mới → import vào `models/__init__.py` để Alembic autogenerate thấy.
- Audit log INSERT-only (BR-10.1) — migration sau sẽ `REVOKE UPDATE,DELETE` (xem
  `infra/postgres/init.sql`).
- 6 chiều điểm: cột non-hallucination là `hr` (nhãn UI là `NH`) — xem `constants.py`.

### Xem DB trực tiếp
```bash
docker compose exec postgres psql -U vsf -d vsf_annotation
# \dt   liệt kê bảng   |   \d claim_task   xem cấu trúc bảng
```

---

## 6. Background jobs (ARQ)

Pipeline import chạy nền sau khi Admin Confirm Import:
```
process_bundle (task) → run_import_pipeline (pipeline):
  parse PDF → normalize → extract sources → claim extraction
  → source mapping → LLM pre-scoring
```

- Task ở `jobs/tasks/`, pipeline ở `jobs/pipelines/import_pipeline.py` (các bước là TODO).
- Enqueue từ API: `await redis.enqueue_job("process_bundle", str(bundle_id))`.
- Worker async (ARQ) → dùng được `await` cho LLM call, SQLAlchemy async session.
- Khi gọi LLM: cấu hình `max_tries`/`job_timeout` trong `WorkerSettings` (EC-LLM-004).

---

## 7. Tích hợp Storage & LLM (qua interface — không lock-in)

**Storage** (`integrations/storage/`):
```python
from app.integrations.storage import get_storage
storage = get_storage()           # tự chọn local/s3 theo STORAGE_BACKEND
key = await storage.put("bundles/x.pdf", data, "application/pdf")
url = await storage.presigned_url(key)
```
⚠️ Khi nối route đọc file: **validate `key` chống path traversal** (`../`) trước khi dùng.

**LLM** (`integrations/llm/`):
```python
from app.integrations.llm.factory import get_llm_provider
llm = get_llm_provider()          # hiện trả MockProvider (OQ-002 chưa chốt)
result = await llm.pre_score(claim_text, source_context, prompt_version="pre_score_v1")
```
Cắm provider thật: thêm class implement `LLMProvider` vào `factory._REGISTRY`. Prompt phải
có `{{claim_text}}` + `{{source_context}}` (BR-1.3). Xem
[docs/05_architecture/tech-selection/08-llm-provider.md](../05_architecture/tech-selection/08-llm-provider.md).

---

## 8. Auth & RBAC (đang là khung)

- **Mock login** (`features/auth/service.py`): 3 user demo, khóa bằng `AUTH_MOCK_ENABLED`.
- **Login thật**: TODO — verify password DB + JWT.
- **RBAC per-project**: `require_role` (global) / `require_project_role` (theo project) ở
  `core/permissions.py` — hiện là khung, cần nối `get_current_user`.
- **API key LLM**: mã hóa Fernet at-rest (`core/crypto.py`, BR-1.2), không lưu plain.

---

## 9. Chạy test backend
```bash
docker compose exec api pytest                 # hoặc: make test-be
docker compose exec api pytest tests/unit/     # chỉ unit
docker compose exec api pytest -k scoring -v   # 1 nhóm test
```
Chi tiết: [test-qa.md](test-qa.md).

---

## 10. Lint & format
```bash
docker compose exec api ruff check .           # lint
docker compose exec api ruff format .          # format
```

## 11. Checklist trước khi push
- [ ] Endpoint có RBAC (`Depends(require_role(...))`) đúng role theo Screen Spec
- [ ] Validate input bằng Pydantic schema
- [ ] Lỗi nghiệp vụ ném `AppError` (không trả lỗi tùy tiện)
- [ ] Có migration nếu đổi model
- [ ] Có test (unit/integration)
- [ ] `ruff check` sạch, `pytest` pass

## Tham chiếu nghiệp vụ
- ERD: [docs/03_ba/dan/01_ERD_MVP_and_Extensible.md](../03_ba/dan/01_ERD_MVP_and_Extensible.md)
- Validation: [docs/03_ba/dan/03_Validation_Rules.md](../03_ba/dan/03_Validation_Rules.md)
- AC & Business Rules: [docs/03_ba/quang/...AC_and_Business_Rules.md](../03_ba/quang/VSF_AI_Annotation_Platform_AC_and_Business_Rules.md)
