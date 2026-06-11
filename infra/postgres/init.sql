-- ============================================================================
-- Postgres init — chạy 1 lần khi container tạo volume lần đầu.
-- Mục tiêu MVP: bật extension cần thiết. Phần audit-log immutable (REVOKE
-- UPDATE/DELETE — BR-10.1) sẽ thêm sau khi có bảng audit_log qua Alembic.
-- ============================================================================

-- UUID generation (gen_random_uuid) cho khóa chính các entity.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Audit-log immutable (BR-10.1) + pre-score immutable (BR-5.1): đã enforce bằng
-- TRIGGER trong migration a1b2c3d4e5f6 (chặn UPDATE/DELETE, kể cả owner).
-- Xem: src/backend/alembic/versions/a1b2c3d4e5f6_constraints_and_immutability.py
