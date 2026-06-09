# Onboarding — Frontend Developer

Hướng dẫn chi tiết cho dev frontend (React + Vite + TypeScript). Đọc
[README.md](README.md) (quickstart chung) trước.

---

## 1. Bạn phụ trách gì

| Phần | Thư mục | Mô tả |
|---|---|---|
| Feature pages | `src/frontend/web/src/features/*/pages/` | Màn hình theo feature |
| Components | `src/frontend/web/src/features/*/components/` | UI riêng feature |
| Shared UI | `src/frontend/web/src/shared/ui/` | Button, Card, ThemeToggle... |
| Routing + guard | `src/frontend/web/src/app/router/` | Route theo role, RoleGuard |
| i18n | `src/frontend/web/src/features/*/locales/` | Đa ngôn ngữ theo feature |
| Theme | `src/frontend/web/src/styles/` | OKLCH tokens, dark/light |
| API client | `src/frontend/web/src/shared/lib/apiClient.ts` | Gọi backend |

---

## 2. Setup môi trường dev frontend

### Cách A — trong docker (đồng bộ với cả stack)
```bash
docker compose up -d web api postgres redis minio
docker compose logs -f web        # Vite HMR tự reload khi sửa
```

### Cách B — ngoài docker (nhanh nhất khi chỉ làm FE)
Cần Node 20+. API vẫn chạy docker:
```bash
docker compose up -d api postgres redis minio
cd src/frontend/web
npm install
npm run dev                       # http://localhost:5173
```
`VITE_API_BASE_URL` mặc định `http://localhost:8000` (đã trỏ đúng API docker).

---

## 3. Cấu trúc frontend (feature-based co-locate)

```
src/frontend/web/src/
├── main.tsx · App.tsx           # entry + gắn providers + router
├── app/
│   ├── layouts/                 # AppLayout (sidebar+header), AuthLayout
│   ├── router/
│   │   ├── routes.tsx           # định nghĩa route + guard theo role
│   │   └── RoleGuard.tsx        # chặn route theo role
│   └── providers/
│       ├── ThemeProvider.tsx    # dark/light qua data-theme + localStorage
│       └── AuthProvider.tsx     # session (token+role), login/logout
├── features/                    # MỖI feature gói trọn:
│   ├── auth/
│   │   ├── pages/LoginPage.tsx          # login chạy thật (gọi /auth/login)
│   │   ├── locales/{vi,en}.json         # i18n namespace "auth"
│   │   └── pages/LoginPage.test.tsx     # test mẫu
│   ├── dashboard/  projects/  import-bundle/
│   ├── annotation-workspace/  qa-review/  export/  audit-log/
│   │   └── (mỗi cái: pages/ + locales/)
├── shared/
│   ├── ui/                      # Button, Card, PageHeader, ThemeToggle, LangSwitch, StatusPage
│   ├── lib/apiClient.ts         # fetch wrapper + token + parse ErrorResponse
│   ├── hooks/                   # hook dùng chung
│   └── types/                   # auth.ts + (sau) api.gen.ts
├── i18n/
│   ├── config.ts                # i18next — tự nạp namespace theo feature (glob)
│   └── locales/common/{vi,en}.json
└── styles/
    ├── tokens.css               # OKLCH: --brand-hue + semantic tokens light/dark
    └── base.css                 # reset + prefers-reduced-motion
```

---

## 4. Workflow code một trang (ví dụ: Annotation Workspace)

Trang hiện là skeleton `<PageHeader>`. Để implement:

1. **i18n**: thêm key vào `features/annotation-workspace/locales/{vi,en}.json`.
2. **Components**: tạo trong `features/annotation-workspace/components/`.
3. **API**: gọi qua `apiClient`:
   ```ts
   import { apiFetch } from "@/shared/lib/apiClient";
   const task = await apiFetch<TaskDetail>(`/tasks/${claimId}`);
   ```
4. **Page**: ráp components vào `pages/AnnotationWorkspacePage.tsx`.
5. **Test**: thêm `*.test.tsx` (xem [test-qa.md](test-qa.md)).

> Mỗi trang skeleton có `<PageHeader docsRef="...">` trỏ docs Screen Spec. Đọc Screen Spec
> trước khi code: `docs/03_ba/tuyet/03_Screen_Specification.md`.

---

## 5. Routing & RBAC ở UI

`app/router/routes.tsx` định nghĩa route theo role, bọc `RoleGuard`:
```tsx
{
  element: <RoleGuard allow={["ANNOTATOR"]}><AppLayout /></RoleGuard>,
  children: [{ path: "/annotator/tasks", element: <MyTasksPage /> }],
}
```
- Chưa login → redirect `/login`. Sai role → `/403`.
- Trang mặc định sau login theo role: `defaultRouteForRole()` trong `AuthProvider`.
- ⚠️ RBAC ở UI chỉ là UX — **backend vẫn enforce độc lập** ở API.

---

## 6. i18n (đa ngôn ngữ, chia theo feature)

- Mỗi feature có `locales/{vi,en}.json` → **namespace = tên feature**.
- `common` namespace cho nav/nút/lỗi chung.
- `config.ts` tự động nạp mọi `features/*/locales/*.json` qua Vite glob → **thêm feature
  mới không cần sửa config**.
- Dùng trong component:
  ```tsx
  import { useTranslation } from "react-i18next";
  const { t } = useTranslation("auth");        // namespace feature
  t("title");                                   // key trong auth/vi.json
  t("common:nav.dashboard");                    // key ở common
  ```
- Đổi ngôn ngữ: `changeLanguage("en")` từ `@/i18n/config`. vi là mặc định.

---

## 7. Theme OKLCH (dark/light)

- Màu định nghĩa ở `styles/tokens.css` bằng **OKLCH**, điều khiển qua 1 biến `--brand-hue`.
- **Đổi cả gam thương hiệu = đổi 1 dòng** `--brand-hue` (vd 265 indigo → 200 teal).
- Semantic tokens dùng trong component qua CSS var:
  ```tsx
  <div style={{ background: "var(--surface)", color: "var(--ink)" }} />
  ```
- Dark/light: `ThemeProvider` set `data-theme` + nhớ localStorage + tôn trọng
  `prefers-color-scheme` lần đầu. Toggle: `useTheme().toggle()`.

**Tokens chính:** `--bg, --surface, --surface-2, --ink, --muted, --line, --primary,
--primary-hover, --on-primary, --accent, --success, --danger, --warning, --focus-ring`.

---

## 8. Gọi API (apiClient)

```ts
import { apiFetch } from "@/shared/lib/apiClient";

// GET
const projects = await apiFetch<Project[]>("/projects");
// POST
await apiFetch("/projects", { method: "POST", body: JSON.stringify(payload) });
```
- Tự gắn base URL `/api/v1` + `Authorization: Bearer <token>`.
- Lỗi → throw `ApiError` ({ code, message, request_id }) khớp `ErrorResponse` của backend.
- Type API: sau khi backend có endpoint, generate type:
  ```bash
  npm run gen:api    # openapi-typescript → src/shared/types/api.gen.ts
  ```

---

## 9. Test, lint, build
```bash
npm run test         # Vitest (unit + RTL)
npm run e2e          # Playwright (cần web + api chạy)
npm run lint         # ESLint
npm run format       # Prettier
npm run build        # tsc + vite build (kiểm production)
```
Chi tiết test: [test-qa.md](test-qa.md).

## 10. Checklist trước khi push
- [ ] Mọi label qua i18n key (không hardcode chữ)
- [ ] Dùng semantic token màu (không hardcode hex)
- [ ] Route mới có `RoleGuard` đúng role
- [ ] Gọi API qua `apiClient`, xử lý lỗi
- [ ] `npm run build` + `npm run test` pass

## Tham chiếu nghiệp vụ
- Screen Spec: [docs/03_ba/tuyet/03_Screen_Specification.md](../03_ba/tuyet/03_Screen_Specification.md)
- Prototype tham chiếu UX: `src/frontend/prototype/*.html`
