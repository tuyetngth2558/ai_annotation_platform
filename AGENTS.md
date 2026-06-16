# AGENTS.md — Hướng dẫn cho AI coding agents

> File chuẩn mở ([agents.md](https://agents.md)) cho **mọi AI coding agent** (Cursor,
> GitHub Copilot, Claude, Codex, Windsurf...). Đọc file này đầu mỗi phiên để đồng bộ với
> dự án. Claude Code đọc thêm `CLAUDE.md` (chi tiết hơn).

Đây là **VSF AI Annotation Platform** — tool nội bộ chuẩn hóa đánh giá chất lượng output
LLM (Vivipedia). Stack: FastAPI + React/Vite + Postgres + MinIO + ARQ.

---

## ⚡ ĐỌC TRƯỚC KHI LÀM (mỗi phiên)

1. **[docs/PROJECT_STATE.md](docs/PROJECT_STATE.md)** — giờ đang ở đâu, cái gì xong/TODO.
   **ĐỌC ĐẦU TIÊN** để không làm lại/làm lệch.
2. **[docs/adr/](docs/adr/)** — các quyết định đã chốt. KHÔNG đi ngược ADR.
3. File này + [CONVENTIONS.md](CONVENTIONS.md) — quy ước code.

---

## 🔄 LUẬT CẬP NHẬT PROJECT_STATE (bắt buộc)

**Sau khi hoàn thành một phần việc, BẠN (AI) PHẢI tự cập nhật
[docs/PROJECT_STATE.md](docs/PROJECT_STATE.md)** — không chờ người nhắc:

| Làm xong gì | Cập nhật ô nào |
|---|---|
| Endpoint/service backend của 1 feature | cột **BE** của feature (⬜→🚧→✅) |
| Trang/component frontend của 1 feature | cột **FE** |
| Test cho 1 feature | cột **Test** |
| Đổi hạ tầng/CI/deploy | mục **Hạ tầng** |
| Chốt 1 quyết định kiến trúc | thêm file **ADR** vào `docs/adr/` + cập nhật §3 |

Đồng thời đổi dòng "Cập nhật lần cuối" ở đầu PROJECT_STATE. Giữ ngắn gọn, đúng ô.

---

## 📐 QUY ƯỚC CODE (tóm tắt — chi tiết ở CONVENTIONS.md)

- **Naming:** Python `snake_case` · FE folder/route `kebab-case` · API path `kebab-case`
  (vd `/api/v1/import-bundles`).
- **Cấu trúc feature-based:** backend `app/features/<feature>/`, frontend
  `src/features/<feature>/` — code mới đặt đúng feature.
- **Backend:** validate input bằng Pydantic; lỗi nghiệp vụ ném `AppError`; RBAC qua
  `Depends(require_role(...))`; đổi model → tạo Alembic migration.
- **Frontend:** label qua i18n key (không hardcode chữ); màu qua semantic token (không
  hardcode hex); gọi API qua `apiClient`.
- **TODO:** chỗ chưa làm đánh dấu `TODO(<feature>)` trỏ docs nghiệp vụ.

## 🚫 KHÔNG được làm

- Push thẳng vào `main` — luôn dùng feature branch (xem
  [git-workflow](docs/onboarding/git-workflow.md)).
- Log secret/PII (JWT, password, API key) — xem
  [logging](docs/onboarding/logging-and-observability.md).
- Commit `.env` (chỉ `.env.example`).
- Đi ngược quyết định trong `docs/adr/` mà không thêm ADR mới giải thích.
- Đổi tech stack đã chốt mà không bàn.

## ✅ Trước khi báo "xong"

- [ ] Code đúng convention + đặt đúng feature
- [ ] Có test (nếu là logic)
- [ ] Backend: `ruff check` sạch · Frontend: `npm run build` pass
- [ ] **Đã cập nhật `docs/PROJECT_STATE.md`**
- [ ] Commit theo Conventional Commits (xem git-workflow)

---

## Tài liệu chính

| Cần gì | File |
|---|---|
| Trạng thái dự án | [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) |
| Quyết định kiến trúc | [docs/adr/](docs/adr/) · [tech-selection](docs/05_architecture/tech-selection/) |
| Onboarding theo role | [docs/onboarding/](docs/onboarding/) |
| Convention code | [CONVENTIONS.md](CONVENTIONS.md) |
| Git workflow | [docs/onboarding/git-workflow.md](docs/onboarding/git-workflow.md) |
| Nghiệp vụ (BA) | [docs/03_ba/](docs/03_ba/) |

> Claude Code: đọc thêm [CLAUDE.md](CLAUDE.md) cho hướng dẫn đầy đủ.
