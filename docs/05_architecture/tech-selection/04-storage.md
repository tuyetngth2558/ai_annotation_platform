# 04 — Lựa chọn Object Storage

**Quyết định:** **MinIO / S3 interface** (`FileStorage` trừu tượng)
**Trạng thái:** Đã chốt · **Ngày:** 2026-06-08

---

## 1. Bài toán cần giải

Hệ thống phải lưu file nhị phân, không nhét vào DB:

| File cần lưu | Nguồn | Ghi chú |
|---|---|---|
| PDF gốc: answer / source_ref / source_content (nhiều file/bundle) | DR-004, ERD `PDF_FILE.storage_path` | **Bắt buộc** lưu raw PDF, không chỉ text |
| Raw response của LLM (`raw_response_reference`) | §7, VR-LLM-005 | Để trace/debug |
| File CSV export sinh ra | AC-9.2 | Tải về |

Đặc tính: file có thể nhiều và lớn (DR-011) → cần object storage, không lưu DB/ổ app.

---

## 2. Các phương án đã cân nhắc

| Phương án | Giao thức | Lock-in | Công vận hành | Hợp với |
|---|---|---|---|---|
| **MinIO** (tự host) | S3 | Không | Chạy container | Dev (giống prod), staging tự host |
| **Supabase Storage** | S3-compatible | Thấp (vẫn S3) | ~0 (managed) | Staging (đã dùng Supabase DB) |
| **AWS S3 / Cloudflare R2** | S3 | Thấp | ~0 (trả phí) | Production thật |
| **Local disk** | — | Không | ~0 | Chỉ dev |

**Điểm mấu chốt:** MinIO, Supabase Storage, AWS S3, R2 — **tất cả nói chung giao thức S3**.
Nghĩa là nếu code dùng S3 client chuẩn (boto3/aioboto3), đổi giữa chúng chỉ là **đổi
endpoint + key trong `.env`**, không sửa code.

---

## 3. Giải pháp: interface `FileStorage` trừu tượng

Thay vì khóa vào một nhà cung cấp, định nghĩa interface và nhiều backend:

```
FileStorage (interface — app/integrations/storage/base.py)
   ├── LocalStorage   → dev nhanh, lưu ổ đĩa
   └── S3Storage      → MinIO / Supabase Storage / AWS S3 / R2 (cùng code)
```

Code nghiệp vụ chỉ phụ thuộc `FileStorage`, **không biết backend cụ thể**. Chọn backend
qua `STORAGE_BACKEND` + `S3_ENDPOINT_URL` trong `.env`.

---

## 4. Phân tích ưu/nhược

### MinIO (dev) + Supabase Storage / MinIO (staging) — ĐÃ CHỌN

**Ưu điểm:**
- **MinIO = S3 thật, tự host** → dev giống production nhất, test được luồng S3 thực
  (presigned URL, bucket...) ngay trên máy.
- **Đổi backend không sửa code** — nhờ interface + giao thức S3 chung. Dev MinIO, staging
  Supabase Storage hoặc MinIO, prod AWS/R2 — tất cả 1 code path.
- **Không lock-in** — kể cả dùng Supabase Storage, vì nó S3-compatible nên rời đi dễ.
- Dev có thể dùng `LocalStorage` (ổ đĩa) nếu không muốn chạy MinIO container.

**Nhược điểm (và cách bù):**
- **MinIO tự host tốn 1 container + bảo trì** nếu dùng cho staging — *Bù:* staging dùng
  Supabase Storage (managed, ~0 công) vì đã có Supabase cho DB rồi; MinIO chỉ cho dev.
- **Supabase Storage free có giới hạn dung lượng** — *Bù:* đủ cho MVP; đổi sang MinIO/S3
  khi cần chỉ là đổi endpoint.

### So với các hướng khác
- **Local disk only:** đơn giản nhưng không giống prod, không có presigned URL thật,
  không scale — chỉ hợp dev. Giữ làm 1 backend tùy chọn, không phải mặc định.
- **Khóa cứng vào AWS S3 SDK ngay:** không cần thiết ở MVP; interface cho linh hoạt hơn
  mà vẫn dùng được S3 khi lên prod.

---

## 4b. Chi phí · Rủi ro · Phương án dự phòng

**Chi phí:** MinIO open-source miễn phí (tự host). Dev = $0. Staging: Supabase Storage free
1GB, hoặc MinIO trên VPS. Prod scale: AWS S3 / Cloudflare R2 trả theo dung lượng (R2 không
tính phí egress — rẻ hơn S3 nếu tải nhiều).

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| **Path traversal** khi nối route đọc/tải file (`key` không validate) | Cao | Validate/normalize `key` chống `../` (đã ghi TODO trong `local.py`) |
| Supabase Storage free 1GB hết chỗ | Trung bình | PDF nhiều → lên Pro hoặc MinIO/S3 (đổi endpoint) |
| Mất file PDF gốc | Cao | Lưu raw PDF bắt buộc (DR-004); backup bucket; không xóa sau parse |
| Lock-in Supabase Storage API | Thấp | S3-compatible → đổi endpoint sang MinIO/S3 dễ |

**Phương án dự phòng:** interface `FileStorage` cho phép đổi backend bất kỳ (local → MinIO
→ Supabase → S3/R2) chỉ bằng `.env`. Nếu Supabase Storage không đủ, bật MinIO container
hoặc trỏ AWS S3 — code không đổi.

## 5. Quyết định & lý do cô đọng

> **Chọn MinIO / S3 qua interface `FileStorage`** vì: (1) MinIO/Supabase/AWS/R2 cùng giao
> thức S3 → một interface, đổi backend = đổi `.env`, không sửa code (zero lock-in);
> (2) MinIO tự host cho dev giống prod nhất; (3) staging dùng Supabase Storage (managed,
> đã có sẵn Supabase). Local disk giữ làm backend dev tùy chọn.

## 6. Hệ quả
- `app/integrations/storage/`: `base.py` (interface) + `local.py` + `s3.py` (aioboto3).
- Dev: MinIO container trong docker-compose (đã có, tự tạo bucket `vsf-pdf`).
- Staging/prod: đổi `S3_ENDPOINT_URL` + key → Supabase Storage / AWS / R2.
- **Lưu ý bảo mật:** khi nối route tải/đọc file, phải validate `key` chống path traversal
  (đã ghi TODO trong `local.py`).

## 7. Tham chiếu
- ADR: [0002-storage-minio-s3-interface.md](../../adr/0002-storage-minio-s3-interface.md)
- Liên quan: [03 — Database](03-database.md) (Supabase kèm Storage)
