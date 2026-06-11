# Shared

Contracts / thành phần dùng chung giữa frontend và backend:

- `types/` — API type generate từ OpenAPI (xem `types/README.md`)
- enums / constants / validation rules dùng chung (mở rộng sau)

Hiện MVP một repo nên type FE generate trực tiếp vào
`src/frontend/web/src/shared/types/api.gen.ts`. Thư mục này giữ convention chung.
