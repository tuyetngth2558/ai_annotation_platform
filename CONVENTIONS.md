# CONVENTIONS — Quy ước code thống nhất

> Quy ước để **mọi người + AI viết code giống nhau**, tránh mỗi người một kiểu khi
> vibe-code. Bản tóm tắt cho AI ở [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md).
> Ném file này vào để đồng bộ style.

---

## 1. Đặt tên (Naming)

| Loại | Quy ước | Ví dụ đúng | Ví dụ sai |
|---|---|---|---|
| Python package/module/biến/hàm | `snake_case` | `import_bundle`, `claim_text` | `importBundle` |
| Python class | `PascalCase` | `ClaimTask`, `LlmPreScore` | `claim_task` |
| FE folder/route | `kebab-case` | `import-bundle`, `qa-review` | `importBundle` |
| FE component/type | `PascalCase` | `AnnotationWorkspacePage` | `annotationPage` |
| FE biến/hàm | `camelCase` | `defaultRouteForRole` | `default_route` |
| API path | `kebab-case` | `/api/v1/import-bundles` | `/api/v1/importBundles` |
| Hằng số | `UPPER_SNAKE` | `JUSTIFICATION_THRESHOLD` | |
| File env | `.env` (gitignore), `.env.example` (commit) | | |

---

## 2. Cấu trúc — Feature-based co-locate

**Code mới đặt đúng feature**, không gom phẳng.

**Backend** (`src/backend/app/features/<feature>/`):
```
features/<feature>/
├── routes.py      # endpoint (RBAC + gọi service)
├── schemas.py     # Pydantic request/response
├── service.py     # logic nghiệp vụ
└── deps.py        # (nếu cần) dependency riêng feature
```
Cross-cutting (config, security, exceptions...) → `app/core/`. Model → `app/models/`.

**Frontend** (`src/frontend/web/src/features/<feature>/`):
```
features/<feature>/
├── pages/         # màn hình
├── components/    # UI riêng feature
├── hooks/         # (nếu cần)
├── locales/{vi,en}.json   # i18n namespace = tên feature
└── types.ts
```
Dùng chung → `src/shared/`. Router/layout/provider → `src/app/`.

---

## 3. Backend — quy ước viết

### Route
```python
from fastapi import APIRouter, Depends
from app.core.permissions import require_role
from app.constants import Role

@router.post("", dependencies=[Depends(require_role(Role.ADMIN))])
async def create_project(payload: ProjectCreate, db: AsyncSession = Depends(get_db)):
    """Tạo project. AC-1.1, BR-1.2 (encrypt key)."""   # docstring trỏ docs
    return await service.create_project(db, payload)
```
- **Luôn gắn RBAC** đúng role theo Screen Spec.
- **Validate input bằng Pydantic schema**, không tự parse.
- **Lỗi nghiệp vụ ném `AppError`** (hoặc subclass), không trả dict lỗi tùy tiện.
- Docstring trỏ mã docs (US/AC/VR/BR).

### Service
- Nhận `AsyncSession`; không gọi `print`, dùng logger (`get_logger`).
- Tách logic khỏi route; route chỉ điều phối.

### Model
- Kế thừa `UUIDPkMixin` + `TimestampMixin` (trừ khi ERD khác).
- Đổi/thêm model → **tạo Alembic migration** (`alembic revision --autogenerate`).
- Import model mới vào `models/__init__.py`.
- **Bám ERD** — không tự thêm field ngoài ERD (vd `created_by` — đã có AUDIT_LOG).

### Async
- I/O (DB, LLM, HTTP) phải `await`; không block event loop.

---

## 4. Frontend — quy ước viết

- **Label qua i18n** (`t("key")`), KHÔNG hardcode chữ.
- **Màu qua semantic token** (`var(--primary)`), KHÔNG hardcode hex.
- **Gọi API qua `apiClient`** (`apiFetch`), xử lý `ApiError`.
- Route mới có `RoleGuard` đúng role.
- Component dùng theme/i18n → bọc provider khi test.
- Type API generate từ OpenAPI (`npm run gen:api`), không viết tay khi đã có endpoint.

---

## 5. Đánh dấu việc chưa làm

- Chỗ chưa implement: `# TODO(<feature>): mô tả` (Python) / `{/* TODO(<feature>) */}` (TSX).
- Trỏ docs nghiệp vụ liên quan trong TODO khi có thể.
- Route nghiệp vụ chưa làm → trả `501`.

---

## 6. Test

- Backend: pytest, data test ở `tests/fixtures/`, không nhồi vào test file.
- Frontend: Vitest + Testing Library; E2E Playwright.
- Viết test bám **Validation Rules (VR-*)** và **Acceptance Criteria (AC-*)**.

---

## 7. Commit & PR

- Conventional Commits: `<type>(<scope>): <mô tả>` — xem
  [git-workflow](docs/onboarding/git-workflow.md).
- Không push thẳng `main`; dùng feature branch.
- PR phải tick checklist (gồm "đã cập nhật PROJECT_STATE").

---

## 8. Bảo mật (bắt buộc)

- **Không commit secret** — chỉ `.env.example` có placeholder.
- **Không log secret/PII** (JWT, password, API key) — xem
  [logging](docs/onboarding/logging-and-observability.md).
- API key LLM mã hóa at-rest (Fernet, BR-1.2).
- Validate `key` chống path traversal khi đọc file storage.

---

## 9. Khi nghi ngờ

1. Đọc [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) — đang ở đâu.
2. Đọc [docs/adr/](docs/adr/) — đã quyết gì.
3. Đọc docs nghiệp vụ liên quan (`docs/03_ba/`).
4. Hỏi, đừng đoán rồi làm lệch.
