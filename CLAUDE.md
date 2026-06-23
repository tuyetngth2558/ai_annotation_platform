# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Read first (mỗi phiên):** [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) — trạng thái
> hiện tại (cái gì xong/TODO), để không làm lại/làm lệch. Quyết định kiến trúc:
> [docs/adr/](docs/adr/). AI agents khác (Cursor/Copilot) đọc [AGENTS.md](AGENTS.md).

## ⚠️ LUẬT CẬP NHẬT TRẠNG THÁI (bắt buộc)

Sau khi hoàn thành một phần việc, **TỰ ĐỘNG cập nhật [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md)**
(không chờ user nhắc) — sửa ô trạng thái feature×role tương ứng + dòng "Cập nhật lần cuối":

| Làm xong gì | Cập nhật |
|---|---|
| Endpoint/service backend 1 feature | cột **BE** của feature (⬜→🚧→✅) |
| Trang/component frontend 1 feature | cột **FE** |
| Test cho 1 feature | cột **Test** |
| Đổi hạ tầng/CI/deploy | mục **Hạ tầng** |
| Chốt quyết định kiến trúc | thêm **ADR** vào `docs/adr/` + cập nhật §3 PROJECT_STATE |

Quy ước code: [CONVENTIONS.md](CONVENTIONS.md) · Git: [git-workflow](docs/onboarding/git-workflow.md)
· Logging: [logging-and-observability](docs/onboarding/logging-and-observability.md).
**Không** push thẳng main, **không** log secret/PII, **không** commit `.env`, **không** đi
ngược ADR mà không thêm ADR mới.

## Project Overview

VSF AI Annotation Platform is an internal tool for standardizing LLM output quality evaluation (Vivipedia use case). The MVP pipeline is:

```
PDF Bundle Upload → PDF Parsing & Claim Extraction → LLM Pre-scoring → Annotator Review → QA Review (Approve/Return) → CSV Export
```

**MVP scope:** text-only, single project (Vivipedia), PDF input, 3 roles (Admin, Annotator, QA Specialist), 6 fixed scoring dimensions (SF, SC, NH, SQ, REL, COMP). 4-week build.

## Repository State

**Scaffold base xong** (xem [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md) cho trạng thái chi tiết, luôn cập nhật). Stack đã chốt (DEP-006 resolved — [ADR 0001](docs/adr/0001-tech-stack.md)): FastAPI + React/Vite + Postgres + MinIO + ARQ. `docker compose up` chạy được 6 service; login 3 role + điều hướng hoạt động; các trang nghiệp vụ là **skeleton** (logic đánh dấu `TODO(<feature>)`); API nghiệp vụ trả `501`.

Vẫn còn 4 prototype HTML ở `src/frontend/prototype/` (Vanilla, làm **tham chiếu UX**, không build tiếp):
- `login.html` — authentication
- `project_setup_import.html` — project creation + PDF bundle upload
- `annotation_workspace.html` — claim scoring interface (6 dimensions)
- `qa_review_workspace.html` — QA approve/return with score diff view

## Architecture

### Planned system layers

- **`src/backend/`** — API, services, business logic (suggested: `app/`, `routes/`, `services/`, `models/`, `schemas/`, `jobs/`)
- **`src/frontend/`** — Web UI (suggested: `components/`, `pages/`, `features/annotation-workspace/`, `features/import-dataset/`)
- **`src/shared/`** — Shared contracts, schemas, constants

### Data model (16 entities, ERD designed)

Core hierarchy: `PROJECT → BATCH → PDF_BUNDLE → PDF_FILE / PDF_PARSE_RESULT → PARENT_TASK → CLAIM_TASK`

Each `CLAIM_TASK` has:
- `LLM_PRE_SCORE` — immutable baseline from LLM (6 dimensions)
- `ANNOTATION_SUBMISSION` — annotator scores
- `QA_REVIEW` — approve/return decision

Supporting entities: `USER_ACCOUNT`, `USER_PROJECT_ROLE` (RBAC), `RUBRIC_VERSION`, `SOURCE_REFERENCE`, `CLAIM_SOURCE_MAP`, `AUDIT_LOG`.

Full ERD with field definitions: [docs/03_ba/dan/01_ERD_MVP_and_Extensible.md](docs/03_ba/dan/01_ERD_MVP_and_Extensible.md)

### Import flow (PDF-native, v0.4)

```
PDF Bundle Upload → Validate files → Parse PDFs → Normalize data
→ Create Parent Task → Extract Source References → Claim Extraction
→ Source Mapping → LLM Pre-scoring → Annotator Review → QA Review → Export CSV
```

CSV/JSON are internal debugging artifacts only — **not** user-facing inputs. The minimum bundle requires: 1 `answer_pdf` + 1 `source_ref_pdf` + at least 1 `source_content_pdf`.

## Key Documentation

| Document | Purpose |
|----------|---------|
| [docs/03_ba/dan/01_ERD_MVP_and_Extensible.md](docs/03_ba/dan/01_ERD_MVP_and_Extensible.md) | Full data model with Mermaid ERD |
| [docs/03_ba/dan/02_Import_Export_Schema.md](docs/03_ba/dan/02_Import_Export_Schema.md) | PDF bundle upload spec + CSV export columns (v0.4) |
| [docs/03_ba/dan/03_Validation_Rules.md](docs/03_ba/dan/03_Validation_Rules.md) | 100+ validation rules across 7 domains |
| [docs/03_ba/dan/04_Edge_Cases.md](docs/03_ba/dan/04_Edge_Cases.md) | 50+ edge cases with priority |
| [docs/03_ba/quang/VSF_AI_Annotation_Platform_AC_and_Business_Rules.md](docs/03_ba/quang/VSF_AI_Annotation_Platform_AC_and_Business_Rules.md) | Acceptance criteria and business rules per feature |
| [docs/03_ba/quang/VSF_AI_Annotation_Platform_User_Stories.md](docs/03_ba/quang/VSF_AI_Annotation_Platform_User_Stories.md) | US-01 through US-10 |
| [docs/03_ba/tuyet/03_Screen_Specification.md](docs/03_ba/tuyet/03_Screen_Specification.md) | Screen-level field specs, states, validation |
| [docs/03_ba/tuyet/04_Open_Questions_Assumptions_Dependencies.md](docs/03_ba/tuyet/04_Open_Questions_Assumptions_Dependencies.md) | Active blockers and pending decisions |

## Active Blockers

Open questions that must be resolved before implementing the affected area:

| ID | Blocks | Status |
|----|--------|--------|
| OQ-002 | LLM provider/endpoint not finalized | 🔴 Blocks pre-scoring integration |
| OQ-003 | Claim extraction: combined with pre-scoring or separate step? | 🔴 Blocks import/background pipeline |
| OQ-006 | Security/auth baseline not defined (email+password assumed; MFA deferred) | 🔴 Blocks auth implementation |
| OQ-PDF-004 | OCR/scanned PDF scope not confirmed | 🔴 Blocks parse flow |
| DEP-006 | Dev environment setup incomplete | 🔴 Blocks all implementation |

Resolved: OQ-001 (PDF Bundle is the input), OQ-010 (URL separator; N/A for PDF input), OQ-008 (annotators see only their own tasks).

## Business Rules to Preserve

- Composite score = simple average of the 6 annotation dimensions (equal weight)
- `LLM_PRE_SCORE` records are **immutable** after creation — annotators override via `ANNOTATION_SUBMISSION`, never by editing LLM scores
- Annotators see only tasks assigned to them (no cross-visibility)
- QA MVP actions: Approve or Return only — no dispute workflow, no direct correction
- All claims and exports must be traceable back to the source PDF file and `bundle_id`
- Export format is claim-level CSV (one row per claim, not per task)
- If an annotator changes a score by more than ±0.20 from the LLM pre-score, a reason is required (threshold pending final confirm — OQ-004)
- Auto-save every 30 seconds assumed sufficient; no offline sync in MVP
