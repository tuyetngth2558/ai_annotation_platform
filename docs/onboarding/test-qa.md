# Onboarding — Test / QA Engineer

Hướng dẫn cho Test/QA: chạy test, viết test case, dùng fixtures. Đọc
[README.md](README.md) (quickstart chung) trước.

> Phân biệt: **Test/QA Engineer** (vai trò này — kiểm thử phần mềm) khác với **QA
> Specialist** (vai trò nghiệp vụ — duyệt annotation, xem [user-guide/qa.md](../user-guide/qa.md)).

---

## 1. Bộ test có sẵn (khung đầy đủ)

| Loại | Công cụ | Vị trí | Chạy |
|---|---|---|---|
| Backend unit | pytest | `src/backend/tests/unit/` | `make test-be` |
| Backend integration | pytest + httpx | `src/backend/tests/integration/` | `make test-be` |
| Frontend unit | Vitest + Testing Library | `src/frontend/web/src/**/*.test.tsx` | `make test-fe` |
| E2E (browser) | Playwright | `test/e2e/` | `make e2e` |
| Fixtures (data test) | — | `tests/fixtures/`, `test/e2e/fixtures/` | (import) |

---

## 2. Chạy test

```bash
# Toàn bộ:
make test                                  # pytest + vitest

# Backend:
docker compose exec api pytest             # tất cả
docker compose exec api pytest tests/unit/         # chỉ unit
docker compose exec api pytest tests/integration/  # chỉ integration
docker compose exec api pytest -k auth -v          # nhóm test có "auth"
docker compose exec api pytest --tb=short          # traceback ngắn

# Frontend:
cd src/frontend/web
npm run test                               # Vitest 1 lần
npm run test:watch                         # watch mode khi dev

# E2E (cần web + api đang chạy):
npx playwright install chromium            # lần đầu: cài browser
npm run e2e                                # smoke + auth specs
npx playwright test --headed               # xem browser chạy
npx playwright test ../test/e2e/auth.spec.ts # 1 file
```

---

## 3. Backend test — pytest

### Cấu trúc
```
tests/
├── conftest.py          # fixtures chung: app (mock auth bật), client (httpx)
├── fixtures/
│   └── users.py         # MOCK_USERS — data test tách khỏi test file
├── unit/                # test logic thuần (không DB)
│   └── test_scoring.py  # MẪU: composite score, ngưỡng justification
└── integration/         # test qua API
    └── test_auth.py     # MẪU: health, mock login 3 role, sai pass 401
```

### Viết test mới (mẫu integration)
```python
# tests/integration/test_projects.py
from tests.fixtures.users import MOCK_USERS

async def test_list_projects_requires_admin(client):
    res = await client.get("/api/v1/projects")
    # ... assert theo nghiệp vụ
```
- Dùng fixture `client` (httpx AsyncClient gắn vào app — không cần chạy server thật).
- Mock auth đã bật trong `conftest.py` (`AUTH_MOCK_ENABLED=true`).
- Data test để ở `fixtures/`, không nhồi vào test file.

### Mapping test ↔ nghiệp vụ
Viết test bám **Validation Rules (VR-*)** và **Acceptance Criteria (AC-*)**:
- `docs/03_ba/dan/03_Validation_Rules.md` — 100+ rule (VR-UP, VR-ANN, VR-QA...).
- `docs/03_ba/quang/...AC_and_Business_Rules.md` — AC + BR từng feature.
- `docs/03_ba/dan/04_Edge_Cases.md` — 50+ edge case có priority.

Ví dụ: VR-ANN-002 "score 0.00–1.00" → viết test gửi score 1.5 → mong 422.

---

## 4. Frontend test — Vitest + Testing Library

### Mẫu (đã có): `features/auth/pages/LoginPage.test.tsx`
```tsx
import { render, screen } from "@testing-library/react";
// Bọc đủ provider: ThemeProvider + MemoryRouter
function renderLogin() {
  return render(<ThemeProvider><MemoryRouter><LoginPage /></MemoryRouter></ThemeProvider>);
}
it("hiển thị form đăng nhập", () => {
  renderLogin();
  expect(screen.getByRole("button", { name: /đăng nhập|sign in/i })).toBeInTheDocument();
});
```
**Lưu ý:** component dùng theme/i18n phải bọc `ThemeProvider`; jsdom thiếu `matchMedia` đã
được mock sẵn trong `src/test/setup.ts`.

---

## 5. E2E — Playwright

### Mẫu (đã có)
- `test/e2e/smoke.spec.ts` — login page load; route bảo vệ → redirect /login.
- `test/e2e/auth.spec.ts` — login 3 role → điều hướng đúng trang.
- `test/e2e/fixtures/{users,routes}.ts` — data test (USERS, LANDING_BY_ROLE).

### Viết E2E mới
```ts
import { test, expect } from "@playwright/test";
import { USERS } from "./fixtures/users";

test("admin mở được trang import", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(USERS.admin.email);
  await page.getByLabel(/mật khẩu|password/i).fill(USERS.admin.password);
  await page.getByRole("button", { name: /đăng nhập|sign in/i }).click();
  // ... assert
});
```
Cần `web` (:5173) + `api` (:8000) đang chạy. Báo cáo lỗi ở `playwright-report/`.

---

## 6. Quy trình QA đề xuất (theo docs)

| Đầu ra Test/QA (Scope §6.4) | Nguồn |
|---|---|
| Test Plan + Test Cases | từ AC & Business Rules |
| Kịch bản E2E + UAT Checklist tuần 4 | từ pipeline end-to-end |
| Test Execution Report | sau khi chạy |
| Bug log (trạng thái + severity) | Jira/Trello |

**Pipeline cần test E2E (UAT tuần 4):**
```
Import PDF Bundle → Claim Extraction → LLM Pre-scoring
→ Annotator Review → QA Approve/Return → Export CSV
```

---

## 7. Checklist khi nhận 1 feature để test
- [ ] Đọc AC + VR + Edge Cases của feature
- [ ] Viết test case (happy path + edge + lỗi)
- [ ] Test RBAC: role sai có bị chặn ở API không (không chỉ UI)
- [ ] Test validation (score range, field bắt buộc, reason khi lệch ngưỡng)
- [ ] Test trạng thái (state machine task)
- [ ] Cập nhật bug log

## Tham chiếu
- Validation Rules: [docs/03_ba/dan/03_Validation_Rules.md](../03_ba/dan/03_Validation_Rules.md)
- AC & Business Rules: [docs/03_ba/quang/...](../03_ba/quang/VSF_AI_Annotation_Platform_AC_and_Business_Rules.md)
- Edge Cases: [docs/03_ba/dan/04_Edge_Cases.md](../03_ba/dan/04_Edge_Cases.md)
