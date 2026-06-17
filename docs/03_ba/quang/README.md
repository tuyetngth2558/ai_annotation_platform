# BA — Quang (Workflow, Scope, AC)

**Owner:** Quang  
**Cập nhật:** 09/06/2026 · **Baseline PDF-native v1.2**

Folder này mô tả phạm vi MVP, user stories, AC/business rules và tài liệu tham chiếu để vẽ diagram.

---

## Tài liệu text (đã đồng bộ §6 PM)

| File | Mô tả | Trạng thái |
|---|---|---|
| [VSF_AI_Annotation_Platform_Scope_Breakdown.md](./VSF_AI_Annotation_Platform_Scope_Breakdown.md) | Must-have / Design-only / Postponed | ✅ v1.2 |
| [VSF_AI_Annotation_Platform_User_Stories.md](./VSF_AI_Annotation_Platform_User_Stories.md) | US-01..13, state mermaid | ✅ v1.2 |
| [VSF_AI_Annotation_Platform_AC_and_Business_Rules.md](./VSF_AI_Annotation_Platform_AC_and_Business_Rules.md) | AC + BR cho Dev/QA | ✅ v1.2 |
| [VSF_AI_Annotation_Platform_Workflow_State_Reference_PDF_native.md](./VSF_AI_Annotation_Platform_Workflow_State_Reference_PDF_native.md) | BPMN + state 2 tầng + checklist Use Case | ✅ v1.0 |

## Diagram (Quang vẽ lại — chưa có file trong folder)

Diagram cũ (JSON/CSV, sampling, dispute) đã **xóa** để tránh dùng nhầm. Vẽ lại từ `VSF_AI_Annotation_Platform_Workflow_State_Reference_PDF_native.md`:

| Deliverable | Deadline tham chiếu |
|---|---|
| `VSF_AI_Annotation_Platform_Workflow_BPMN.pdf` (+ PNG) | 11/06 |
| `Task_State_Diagram.png` (2 tầng: Bundle + Claim) | 11/06 |
| `Use_Case_Diagram.png` (thêm QA Export) | 11/06 |

Footer gợi ý: `VSF AI Annotation Platform MVP · PDF-native · v1.2 · Ref: Bao_cao_PM §6`

## Research (không phải baseline build)

| File | Ghi chú |
|---|---|
| [deployment_options.md](./deployment_options.md) | Option 1–3 cost (Streamlit/HF/Railway) — **research only** |

---

## Tham chiếu chéo

- Schema & validation: [`../dan/`](../dan/)
- Screen flow & IA: [`../tuyet/`](../tuyet/)
- Chốt scope PM: [`../../00_project_management/Bao_cao_doi_chieu_scaffold_vs_scope_MVP.md`](../../00_project_management/Bao_cao_doi_chieu_scaffold_vs_scope_MVP.md) §6
- Scaffold deploy/LLM: `ai_annotation_platform-feat-scaffold-base/docs/05_architecture/tech-selection/`

## Quyết định MVP (tóm tắt)

- Import: **PDF Bundle** + `file_role`; block `ocr_required`
- LLM: **2 bước**; Gemini 2.5 Flash working
- QA: **100%** review; Approve/Return only
- Export: approved-only; **Admin + QA** (project scope); schema `dan/02` §10
- Source: `source_text_extract` ưu tiên; URL optional
