# PROJECT STATE — Trạng thái hiện tại của dự án

> 🎯 **Mục đích:** Đây là "bản đồ giờ đang ở đâu" — file để **bất kỳ ai (người hoặc AI)**
> đọc đầu phiên là biết ngay cái gì xong, cái gì đang làm, cái gì TODO. Chống **context
> drift** khi nhiều người + AI vibe-code qua thời gian dài.
>
> ⚠️ **FILE NÀY PHẢI ĐƯỢC CẬP NHẬT.** Quy ước "ai cập nhật gì, khi nào" ở cuối file và
> trong `CLAUDE.md` / `AGENTS.md`. Cập nhật stale → cả team lệch.

**Cập nhật lần cuối:** 2026-06-15 · **Bởi:** Khải (auth/users BE) + Tuấn Anh (devops CI)

---

## 1. Tổng quan nhanh

| Hạng mục | Trạng thái |
|---|---|
| Giai đoạn | Scaffold base xong → bắt đầu implement nghiệp vụ |
| Stack | FastAPI + React/Vite + Postgres + MinIO + ARQ (đã chốt — [ADR 0001](adr/0001-tech-stack.md)) |
| Chạy được | `docker compose up` → 6 service OK; login 3 role; trang skeleton |
| Chưa làm | Toàn bộ logic nghiệp vụ (đánh dấu `TODO(<feature>)`) |

**Pipeline đang ở bước nào:**
```
Import PDF → Parse → Claim Extract → Pre-score → Annotate → QA → Export
   [TODO]    [TODO]    [TODO]        [TODO]      [TODO]    [TODO] [TODO]
```
→ Hạ tầng + khung sẵn sàng; chưa bước nào của pipeline được implement.

---

## 2. Trạng thái theo FEATURE × ROLE

**Ký hiệu:** ✅ xong · 🚧 đang làm · ⬜ TODO · 🔒 bị chặn (chờ quyết định)

| Feature | Backend (BE) | Frontend (FE) | Test | Ghi chú / Blocker |
|---|:---:|:---:|:---:|---|
| **auth** (login/RBAC) | ✅ login/refresh/change-password thật (verify DB) + RBAC | ✅ login + guard (refresh backend-only) | ✅ 16 test (mock + DB thật) | Bcrypt (bỏ passlib). KHÔNG register/OAuth/verify email/MFA (BA hoãn) |
| **users** (Admin tạo user) | 🚧 create/list/get (RBAC ADMIN) | ⬜ | 🚧 RBAC test | Mật khẩu tạm; gán role per-project |
| **projects** (tạo/cấu hình LLM) | ⬜ route 501 | ⬜ skeleton | ⬜ | API key encrypt (BR-1.2) |
| **import_bundle** (upload PDF) | ⬜ route 501 | ⬜ skeleton | ⬜ | 🔒 parser chờ OQ-PDF-004 (OCR) |
| **annotation** (chấm 6 chiều) | ⬜ route 501, scoring helper ✅ | ⬜ skeleton | 🚧 scoring test ✅ | OQ-004 ngưỡng ±0.20 |
| **qa_review** (approve/return) | ⬜ route 501 | ⬜ skeleton | ⬜ | |
| **export** (CSV) | ⬜ route 501 | ⬜ skeleton | ⬜ | |
| **audit** (log) | ⬜ route 501 | ⬜ skeleton | ⬜ | Cần REVOKE UPDATE/DELETE (BR-10.1) |

**Hạ tầng & cross-cutting:**
| Hạng mục | Trạng thái | Ghi chú |
|---|:---:|---|
| docker-compose (6 service) | ✅ | verify chạy thật |
| 16 models + Alembic | ✅ | migration đầu đã generate |
| core (config/security/perm/crypto/...) | 🚧 | khung xong, một số logic TODO |
| Storage interface (local/S3) | ✅ | path-traversal validate ✅; route đọc file chưa nối |
| DB constraints | ✅ | CHECK score range + trigger immutable (audit/pre-score) |
| Quality gates (ruff/eslint/CI fail-on-error) | ✅ | ruff 0 lỗi, eslint config, bỏ `||true` |
| CI pipeline (GitHub Actions) | ✅ | backend lint+test + frontend build+test; trigger PR/push main/develop |
| `.env.example` backend | ✅ | template đầy đủ biến cho Vercel+Render+Supabase |
| LLM interface | 🚧 | chỉ có MockProvider; 🔒 OQ-002 chưa chốt provider |
| ARQ worker + pipeline | 🚧 | khung xong, các bước TODO |
| i18n (vi/en) + theme OKLCH | ✅ | |
| Logging (JSON/request-id) | 🚧 | xem logging-and-observability |

---

## 3. Quyết định mở đang CHỜ (chặn việc)

| ID | Chặn gì | Trạng thái |
|---|---|---|
| OQ-002 | LLM provider chưa chốt → pre-scoring | 🔴 chờ (xem [08-llm-provider](05_architecture/tech-selection/08-llm-provider.md)) |
| OQ-003 | Claim extraction tách/gộp pre-scoring | 🔴 chờ |
| OQ-004 | Ngưỡng ±0.20 nhập lý do | 🟡 draft |
| OQ-006 | Security baseline | 🟢 baseline đã làm (email/password + RBAC + bcrypt/JWT, ADR 0003/0006). MFA/OAuth/register hoãn theo BA |
| OQ-PDF-004 | OCR/scanned PDF có trong MVP? | 🔴 chờ |

Quyết định ĐÃ chốt → xem [docs/adr/](adr/). Quyết gì mới → **thêm ADR**, đừng để trôi.

---

## 4. Việc tiếp theo (gợi ý ưu tiên)

1. Chốt OQ-006 → implement auth thật (login + RBAC per-project).
2. Chốt OQ-002 → cắm LLM provider thật.
3. Implement feature theo pipeline: import → annotation → qa → export.

---

## 5. QUY ƯỚC CẬP NHẬT FILE NÀY (quan trọng)

**Khi nào cập nhật:** ngay khi trạng thái một feature/hạng mục đổi (xong 1 phần, bắt đầu
làm, bị chặn, hết chặn).

**Ai cập nhật ô nào** (theo role):
| Role | Làm xong gì | Cập nhật |
|---|---|---|
| **Backend dev** | xong endpoint/service của 1 feature | cột **BE** của feature đó (⬜→🚧→✅) |
| **Frontend dev** | xong 1 trang/feature UI | cột **FE** |
| **Test/QA** | xong test cho 1 feature | cột **Test** |
| **DevOps** | đổi hạ tầng/CI/deploy | mục Hạ tầng |
| **Ai chốt quyết định** | chốt 1 lựa chọn | mục §3 + thêm ADR |

**Cách cập nhật:**
1. Sửa ô trạng thái tương ứng + ghi chú nếu cần.
2. Đổi dòng "Cập nhật lần cuối" ở đầu file (ngày + tên/role).
3. Nếu là AI: làm việc này **tự động** sau khi hoàn thành — xem luật trong `CLAUDE.md` /
   `AGENTS.md`.
4. Chốt chặn: PR có checkbox "đã cập nhật PROJECT_STATE" — không tick không merge.

> File này là "sống". Stale 1 tuần là vô dụng. Cập nhật ngay, ngắn gọn, đúng ô.
