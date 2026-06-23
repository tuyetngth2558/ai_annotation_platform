# ADR 0002 — Storage qua interface S3 (MinIO / Supabase)

**Trạng thái:** Accepted · **Ngày:** 2026-06-08

## Context
Cần lưu PDF gốc (DR-004: answer/ref/content) + file CSV export. Phải tránh lock-in
vào một nhà cung cấp; dev cần offline, staging cần tiện.

## Decision
Định nghĩa interface trừu tượng `FileStorage` (`app/integrations/storage/base.py`)
với 2 backend: `LocalStorage` (dev nhanh) và `S3Storage` (aioboto3, S3-compatible).
MinIO và Supabase Storage đều nói giao thức S3 → đổi backend = đổi `.env`, không sửa code.

## Consequences
- Dev: MinIO docker (giống prod nhất) hoặc local disk.
- Staging: MinIO tự host hoặc Supabase Storage — chỉ đổi `S3_ENDPOINT_URL`.
- Code nghiệp vụ chỉ phụ thuộc `FileStorage`, không biết backend cụ thể.
