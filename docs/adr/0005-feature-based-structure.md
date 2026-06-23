# ADR 0005 — Cấu trúc feature-based co-locate

**Trạng thái:** Accepted · **Ngày:** 2026-06-08

## Context
Nhiều role + nhiều team (dev BE/FE, Test/QA) cùng làm. Cần cấu trúc dễ chia task,
dễ mở rộng (multi-project/multi-modality tương lai).

## Decision
**Feature-based co-locate** ở cả frontend và backend, đối xứng nhau.

- Frontend: `src/features/<feature>/` gói `components/ hooks/ pages/ locales/ types`.
  `shared/` cho dùng chung; `app/` cho router/layout/providers.
- Backend: `app/features/<feature>/` gói `routes/ schemas/ service`. `core/` cho cross-cutting
  (config, security, permissions, exceptions, middleware, pagination).
- i18n chia theo feature (namespace = tên feature) + `common`.
- Test có khung đầy đủ (pytest/Vitest/Playwright) + `fixtures/` tách data.

## Consequences
- Naming: Python `snake_case`, FE folder/route `kebab-case`, API path `kebab-case`.
- API versioned: `app/api/v1/`.
- Thêm feature mới = thêm 1 thư mục ở cả 2 phía, ít sửa file trung tâm.
