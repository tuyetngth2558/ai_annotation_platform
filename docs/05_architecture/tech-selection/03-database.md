# 03 — Lựa chọn Database & Hosting

**Quyết định:** **Postgres** · dev **docker local** / staging **Supabase online**
**Trạng thái:** Đã chốt · **Ngày:** 2026-06-08

---

## 1. Bài toán cần giải

Data model của hệ thống (16 entity, ERD của Đan) có 2 nhóm đặc tính, cả hai đều phải gánh:

**Nhóm quan hệ chặt (relational):**
| Yêu cầu | Nguồn |
|---|---|
| Chuỗi FK `project→batch→bundle→parent_task→claim` | ERD |
| Export CSV 40+ cột, mỗi row JOIN ngược về bundle/PDF | Import schema §10, DRD-005 |
| `CLAIM_SOURCE_MAP` many-to-many (1 claim ↔ nhiều source) | ERD, VR-MAP-004 |
| Audit log INSERT-only, immutable | BR-10.1 |
| Enum role/status/decision | RBAC, state machine |

**Nhóm bán cấu trúc (semi-structured):**
| Field | Nguồn |
|---|---|
| `metadata_extracted_json`, `source_list_extracted_json`, `parse_warnings_json` | Parse result §3 |
| `rationale_json` (LLM), `before/after_value` (audit) | §7, ERD |

**Mấu chốt:** phần *relational* là phần lớn và quan trọng (export, audit, trace). Phần
*semi-structured* chỉ là vài field. → Cần DB làm tốt relational, và xử lý được JSON.

---

## 2. Engine: Postgres vs MongoDB

| Tiêu chí | **Postgres** | MongoDB |
|---|---|---|
| FK + JOIN (export 40 cột) | ✅ tự nhiên, 1 câu JOIN | ❌ phải aggregate/nhúng tay |
| Trace claim→bundle→PDF (bắt buộc) | ✅ JOIN | ❌ khổ |
| Many-to-many (claim↔source) | ✅ bảng nối | ❌ awkward |
| Audit immutable (INSERT-only) | ✅ `REVOKE UPDATE,DELETE` ở DB | ❌ chỉ app-level (yếu hơn) |
| Enum native | ✅ | ❌ chỉ validate app |
| Field JSON (`*_json`) | ✅ **JSONB** (làm document store luôn) | ✅ (điểm mạnh Mongo) |
| Transaction ACID | ✅ mạnh | ⚠️ yếu hơn ở multi-doc |

**Phân tích:** Mongo chỉ thắng ở đúng chỗ `*_json` — nhưng **Postgres JSONB xử lý được hết
phần đó**, không mất gì. Ngược lại, mọi thứ relational + audit immutable thì Mongo làm rất
cực. Postgres = được cả hai; Mongo = mất phần relational (phần lớn & quan trọng hơn).

> **Loại MongoDB.** Data model quá quan hệ; "schemaless" mà Mongo mạnh thì Postgres JSONB
> đã đáp ứng. Chọn Mongo là tối ưu cho thiểu số field, hy sinh đa số.

---

## 3. Hosting: chạy Postgres ở đâu?

Quyết định tách 2 môi trường:

| | **Dev (mỗi người)** | **Staging (chung)** |
|---|---|---|
| Chọn | **docker local** | **Supabase online** |
| Lý do | offline, nhanh, mỗi người 1 DB riêng (không đạp data nhau) | URL sẵn cho demo/UAT, khỏi tự nuôi VPS, backup managed |

### 3.1. Các phương án cloud cho staging

| Provider | Engine | Free tier | Cold start | Kèm thêm | Ghi chú |
|---|---|---|---|---|---|
| **Supabase** | Postgres | 500MB | Ngủ sau **7 ngày** idle | Storage, dashboard | ĐÃ CHỌN |
| Neon | Postgres | 0.5GB | Ngủ sau **vài phút** (cold start khó chịu) | branch DB | Loại vì cold start |
| Railway/Render | Postgres | credit/free | tùy | deploy kèm app | Cân nhắc khi deploy |
| MongoDB Atlas | Mongo ❌ | 512MB | không ngủ | — | Loại vì engine sai |

### 3.2. Vì sao Supabase (không Neon)?

- **Neon ngủ sau vài phút idle** → request đầu cold start ~vài giây, khó chịu khi
  dev/demo gián đoạn. User đã trải nghiệm và thấy "chậm".
- **Supabase chỉ ngủ sau 7 ngày idle** → mượt hơn nhiều cho nhịp dev/demo.
- **Bonus:** Supabase có sẵn **Storage** — mà dự án cần chỗ lưu PDF (xem [04](04-storage.md)),
  giải luôn 2 bài toán bằng 1 nhà cung cấp ở staging.
- Vẫn là **Postgres tiêu chuẩn** → giữ nguyên mọi lợi ích relational đã phân tích.

### 3.3. Quan trọng: chỉ dùng Supabase làm Postgres thuần
Không dùng Supabase Auth/Realtime/Edge Functions (xem [06 — Auth](06-auth.md)). Lý do:
tránh lock-in. Khi chỉ dùng làm Postgres, **lock-in gần như bằng 0** — đổi host = đổi
`DATABASE_URL`, không sửa code.

---

## 3c. Chi phí · Rủi ro · Phương án dự phòng

**Chi phí:** Postgres open-source, miễn phí. Dev docker = $0. Staging **Supabase free tier**
(500MB) đủ cho MVP. Khi vượt: Supabase Pro ~$25/th, hoặc tự host VPS (~5-10$/th). Rẻ.

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Supabase free tier giới hạn 500MB / connection | Trung bình | Đủ cho MVP; lên Pro hoặc tự host khi cần (đổi `DATABASE_URL`) |
| Nhiều dev chung 1 DB staging đạp data | Trung bình | Dev dùng docker local riêng; staging chỉ để demo |
| Phụ thuộc Supabase (3rd party) | Thấp | Là Postgres thuần → zero lock-in, đổi host dễ |
| Mất data | Trung bình | Supabase có backup managed; dev không cần backup |

**Phương án dự phòng:** vì là Postgres tiêu chuẩn, rời Supabase = đổi `DATABASE_URL` sang
Neon / Railway / VPS tự host, **không sửa code**. Dump/restore Postgres chuẩn. Không bao
giờ bị khóa.

## 4. Quyết định & lý do cô đọng

> **Engine: Postgres** — data model quan hệ chặt (export FK-heavy, audit immutable,
> many-to-many) là phần lớn; JSONB lo phần `*_json`. Mongo bị loại vì sai data model.
>
> **Host: dev docker local** (offline, tách data), **staging Supabase online** (Postgres
> thuần — không cold-start khó chịu như Neon, kèm Storage cho PDF). Chỉ dùng Postgres +
> Storage của Supabase, không dùng Auth → zero lock-in.

## 5. Hệ quả
- ORM: SQLAlchemy 2.0 async + Alembic migration (đã verify 16 bảng + index + FK).
- Audit immutable: migration sau sẽ `REVOKE UPDATE,DELETE ON audit_log` (BR-10.1) —
  xem `infra/postgres/init.sql`.
- Đổi host bất kỳ lúc nào = đổi `DATABASE_URL` trong `.env`.

## 6. Tham chiếu
- ADR: [0001-tech-stack.md](../../adr/0001-tech-stack.md)
- Liên quan: [04 — Storage](04-storage.md) (Supabase Storage), [06 — Auth](06-auth.md) (vì sao không dùng Supabase Auth)
