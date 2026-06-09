# ADR 0003 — Tự viết auth (bcrypt + JWT, RBAC per-project)

**Trạng thái:** Accepted · **Ngày:** 2026-06-08

## Context
OQ-006 chưa chốt security baseline (gợi ý: email/password + RBAC, MFA sau). Cân nhắc
dùng Supabase Auth (managed) vs tự viết.

## Decision
**Tự viết auth.** Lý do:
- RBAC là **per-project** qua `USER_PROJECT_ROLE` (1 user có role khác nhau theo
  project) — Supabase Auth không cover, vẫn phải tự viết phần khó nhất.
- Tránh lock-in: nếu auth bám Supabase thì khó đổi DB host sau.
Dùng: `passlib[bcrypt]` hash password, `pyjwt` cho JWT, `cryptography` (Fernet) mã hóa
LLM API key at-rest (BR-1.2).

## Consequences
- Supabase chỉ còn là "Postgres + Storage", không dùng Auth/Realtime/Edge Functions.
- Đợt scaffold: mock login (3 user demo) khóa bằng `AUTH_MOCK_ENABLED` — chỉ dev,
  staging/prod tắt → raise. Login thật để TODO ở `app/features/auth/service.py`.
