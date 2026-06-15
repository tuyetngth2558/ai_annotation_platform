# 06 — Lựa chọn Authentication

**Quyết định:** **Tự viết** (bcrypt + JWT, RBAC per-project)
**Trạng thái:** Đã chốt · **Ngày:** 2026-06-08

---

## 1. Bài toán cần giải

| Yêu cầu | Nguồn | Hệ quả |
|---|---|---|
| 3 role (Admin, Annotator, QA) | docs AC mục 1 | RBAC |
| **RBAC theo từng project** (qua `USER_PROJECT_ROLE`) | ERD | role-per-project, không phải global |
| Enforce cả UI lẫn API | docs AC mục 1 | check ở backend mọi endpoint |
| Annotator chỉ thấy task của mình | OQ-008 | phân quyền dữ liệu |
| LLM API key mã hóa at-rest | BR-1.2 | crypto |
| Security baseline (email/pass; MFA sau) | OQ-006 | đơn giản, mở rộng sau |

**Mấu chốt:** RBAC là **per-project** — 1 user có thể là Annotator ở project A, QA ở
project B. Đây không phải role toàn cục đơn giản.

---

## 2. Các phương án đã cân nhắc

| Tiêu chí | **Tự viết** | Supabase Auth | Auth0 / Clerk |
|---|---|---|---|
| Email/password + JWT | ✅ tự kiểm soát | ✅ sẵn | ✅ sẵn |
| **RBAC per-project** | ✅ tự thiết kế đúng nhu cầu | ⚠️ vẫn phải tự viết phần này | ⚠️ phải custom claims phức tạp |
| Lock-in | ✅ không | ❌ bám Supabase | ❌ bám nhà cung cấp |
| Chi phí | ✅ free | free tier giới hạn | trả phí khi scale |
| Công sức ban đầu | ⚠️ phải tự viết | ✅ ít | ✅ ít |
| MFA/SSO sau này | tự thêm | ✅ sẵn | ✅ sẵn (mạnh) |
| Phụ thuộc mạng/3rd party | ✅ không | ❌ có | ❌ có |

---

## 3. Phân tích ưu/nhược chi tiết

### Tự viết (ĐÃ CHỌN)

**Ưu điểm:**
- **RBAC per-project phải tự viết dù sao** — đây là lý do mạnh nhất. Supabase/Auth0 cho
  user + JWT, nhưng cái `role-theo-từng-project` qua `USER_PROJECT_ROLE` thì các dịch vụ
  này không cover sẵn. Đã phải tự viết phần khó nhất → ôm nốt login/password cho gọn,
  giảm phụ thuộc.
- **Không lock-in** — nếu auth bám Supabase Auth, sau muốn đổi DB host (về VPS/Neon) là
  kẹt. Tự viết → Supabase chỉ còn là "Postgres + Storage" → thay lúc nào cũng được.
- **Free, không phụ thuộc 3rd party** — không lo free tier giới hạn, không phụ thuộc mạng
  bên ngoài để đăng nhập.
- **Khớp đúng OQ-006** — email/password + RBAC cơ bản, MFA để sau. FastAPI có pattern
  chuẩn sẵn, viết nhanh.

**Nhược điểm (và cách bù):**
- **Phải tự làm đúng (dễ sai bảo mật)** — *Bù:* dùng thư viện chuẩn: `bcrypt` (hash —
  dùng trực tiếp, không qua passlib vì passlib lỗi với bcrypt 4+), `pyjwt` (JWT),
  `cryptography`/Fernet (mã hóa API key — BR-1.2). Không tự chế thuật toán.
- **Phải tự làm MFA/SSO nếu sau cần** — *Bù:* MVP không cần (OQ-006 hoãn MFA); thêm sau khi
  có nhu cầu, không chặn hiện tại.
- **Tốn công ban đầu hơn dùng dịch vụ** — *Bù:* phần khó (RBAC per-project) phải tự viết
  dù chọn gì; phần login thật chuẩn mực, FastAPI có sẵn pattern.

### Supabase Auth (KHÔNG CHỌN)

**Ưu:** user + JWT + MFA/SSO sẵn, ít công ban đầu, đã dùng Supabase cho DB.
**Nhược (lý do loại):**
- **Không cover RBAC per-project** — vẫn phải tự viết `USER_PROJECT_ROLE` logic, tức
  không tiết kiệm phần khó.
- **Lock-in** — auth bám Supabase thì khó rời, mất tính "replaceable" của Postgres.

### Auth0 / Clerk (KHÔNG CHỌN)

**Ưu:** mạnh nhất về tính năng (MFA, SSO, social login), bảo mật chuẩn.
**Nhược (lý do loại):**
- **Quá mức cho MVP nội bộ** — 3 role, dùng nội bộ, không cần social/SSO.
- **Trả phí khi scale + lock-in + custom claims phức tạp** cho RBAC per-project.

---

## 3b. Chi phí · Rủi ro · Phương án dự phòng

**Chi phí:** Tự viết = $0 (thư viện open-source: bcrypt/pyjwt/cryptography). Không phí
dịch vụ như Auth0/Clerk (trả phí theo MAU khi scale). Chi phí là **thời gian dev** — nhưng
phần khó (RBAC per-project) phải tự viết dù chọn gì.

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| **Tự viết auth dễ sai bảo mật** | Cao | Dùng thư viện chuẩn (bcrypt/JWT/Fernet), không tự chế thuật toán; security-review |
| Quên tắt mock login khi lên staging | Cao | `AUTH_MOCK_ENABLED` default false; staging tắt → raise |
| JWT secret yếu / lộ | Cao | `JWT_SECRET` ≥32 bytes, đổi ở staging/prod, không commit |
| API key LLM lộ nếu lưu plain | Cao | Mã hóa Fernet at-rest (BR-1.2); `SECRET_ENCRYPTION_KEY` không commit |
| Phải tự làm MFA/SSO nếu sau cần | Trung bình | MVP không cần (OQ-006 hoãn MFA); thêm sau, không chặn hiện tại |

**Phương án dự phòng:** nếu sau cần MFA/SSO nhanh mà không muốn tự làm, có thể bổ sung
một lớp IdP (Keycloak tự host, hoặc Auth0) cho phần *authentication*, vẫn giữ
`USER_PROJECT_ROLE` tự viết cho *authorization* per-project. Không phải vứt bỏ phần đã làm.

## 4. Quyết định & lý do cô đọng

> **Chọn tự viết auth** vì: (1) RBAC per-project (`USER_PROJECT_ROLE`) phải tự viết dù
> chọn dịch vụ nào — đã làm phần khó thì ôm nốt login cho gọn; (2) tránh lock-in, giữ
> Supabase chỉ là Postgres thay được; (3) free, không phụ thuộc 3rd party; (4) khớp OQ-006
> (email/pass, MFA sau). Dùng thư viện chuẩn (bcrypt/pyjwt/Fernet) để không sai bảo mật.
>
> Supabase Auth loại vì không cover RBAC per-project + lock-in. Auth0/Clerk loại vì quá
> mức cho tool nội bộ.

## 5. Hệ quả & lưu ý bảo mật
- **Hash:** bcrypt (dùng trực tiếp, không passlib) — không bao giờ SHA/MD5/plain.
- **Token:** JWT (pyjwt), algorithm pin cố định; `JWT_SECRET` đổi ở staging/prod (≥32 bytes).
- **API key LLM:** mã hóa Fernet at-rest (BR-1.2), `SECRET_ENCRYPTION_KEY` không commit.
- **RBAC:** `require_role` / `require_project_role` qua FastAPI `Depends()` trên *mọi*
  endpoint, không chỉ UI.
- **Audit immutable** (BR-10.1): `REVOKE UPDATE,DELETE ON audit_log`.
- **Mock login** khóa bằng `AUTH_MOCK_ENABLED` (chỉ dev; staging/prod tắt → raise).
- **Đã implement:** login thật (verify DB + bcrypt), access+refresh token (refresh revalidate
  user trong DB), change-password, `get_current_user` (chỉ access token), Admin tạo user.
- **TODO (phase sau, BA hoãn):** register công khai, OAuth Google/Microsoft, verify email, MFA,
  refresh token revoke list.

## 6. Tham chiếu
- ADR: [0003-self-written-auth.md](../../adr/0003-self-written-auth.md)
- Liên quan: [03 — Database](03-database.md) (Supabase chỉ Postgres), OQ-006 (docs/03_ba/tuyet/04)
