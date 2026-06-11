# Shared types — API contract

Type TypeScript khớp backend được **generate từ OpenAPI** (FastAPI tự sinh tại
`/openapi.json`), không viết tay, không lưu file tĩnh dễ stale.

## Generate
```bash
cd src/frontend/web
npm run gen:api      # openapi-typescript http://localhost:8000/openapi.json -> src/shared/types/api.gen.ts
```

Cần API đang chạy (`docker compose up`). Chạy lại mỗi khi backend đổi contract.

> Đợt scaffold chưa generate (endpoint còn TODO). FE tạm dùng type thủ công trong
> `src/frontend/web/src/shared/types/` (vd `auth.ts`).
