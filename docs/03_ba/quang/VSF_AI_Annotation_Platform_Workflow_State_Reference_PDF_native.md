# Workflow & State Machine — Tham chiếu PDF-native MVP

**Owner:** Quang (diagram) · Tuyết (review) · Đan (validation)  
**Phiên bản:** 1.0  
**Ngày:** 09/06/2026  
**Mục đích:** Bản chuẩn text + mermaid để vẽ lại **BPMN**, **Task State Diagram**, và rà **Use Case**.

**Baseline (ưu tiên khi mâu thuẫn):**

- `Chốt Scope & Phân Công — VSF AI Annotation Platform MVP.md`
- `docs/00_project_management/Bao_cao_doi_chieu_scaffold_vs_scope_MVP.md` §6
- `docs/03_ba/dan/` (schema + `03_Validation_Rules.md`)
- `docs/03_ba/tuyet/02_Screen_Flow.md` §9

---

## 1. Pipeline End-to-End (tóm tắt)

```text
PDF Bundle Upload
  → Validate bundle (VR-UP-*)
  → Parse PDF (text + metadata + source list)
  → Normalize internal data
  → Claim Extraction (LLM bước 1)
  → Source Mapping
  → LLM Pre-scoring (LLM bước 2)
  → Annotator Review & Submit
  → QA Review 100% (Approve | Return)
  → Export CSV claim-level (Admin hoặc QA — project scope)
```

**Không có trong MVP:** CSV/JSON import · QA sampling / auto-approve · Dispute · OCR đầy đủ · Policy Center · QA sửa điểm trực tiếp.

---

## 2. BPMN — Luồng nghiệp vụ (mermaid)

> Copy sang draw.io / Figma / BPMN tool. Mỗi swimlane = 1 lane trong diagram.

```mermaid
flowchart TB
    subgraph ADMIN["ADMIN"]
        A0([Bắt đầu])
        A1[Tạo project + cấu hình LLM + Assignment]
        A2[Upload PDF Bundle<br/>gán file_role]
        A3{Xác nhận Import?}
        A14[Export CSV claim-level<br/>project scope]
        A0 --> A1 --> A2 --> A3
    end

    subgraph SYSTEM["SYSTEM"]
        S1[Validate bundle VR-UP-*]
        S2{ocr_required?}
        S3[Parse PDF<br/>metadata + source list + text]
        S4[Normalize answer/source]
        S5[Claim Extraction — LLM #1]
        S6[Source Mapping claim ↔ source_order]
        S7[Pre-scoring — LLM #2]
        S8{Pipeline OK?}
        A3 -->|Có| S1
        S1 --> S2
        S2 -->|Có| E_OCR[/Từ chối import<br/>message rõ/]
        S2 -->|Không| S3 --> S4 --> S5 --> S6 --> S7 --> S8
        S8 -->|Lỗi parse/LLM| E_FAIL[/Bundle/Task failed<br/>Admin xử lý/]
        S8 -->|OK| R1[Ready for Annotation]
    end

    subgraph ANN["ANNOTATOR"]
        N1[Mở task được giao]
        N2[Review claim + source_text_extract<br/>chấm 6 chiều ±0.20 reason]
        N3[Submit]
        R1 --> N1 --> N2 --> N3
    end

    subgraph QA["QA SPECIALIST"]
        Q1[QA Queue — 100% Submitted<br/>trong project được giao]
        Q2[QA Review diff]
        Q3{Quyết định?}
        Q4[Approve]
        Q5[Return + error type + comment ≥10 ký tự]
        N3 --> Q1 --> Q2 --> Q3
        Q3 -->|Approve| Q4
        Q3 -->|Return| Q5
        Q5 --> N1
    end

    Q4 --> A14
    A14 --> END([Hoàn thành])

    style E_OCR fill:#fee
    style E_FAIL fill:#fee
```

### Ghi chú BPMN

| # | Quy tắc | Ref |
|---:|---|---|
| 1 | Mỗi bundle: **1 answer_pdf + 1 source_ref_pdf + ≥1 source_content_pdf** | OQ-PDF-001, VR-UP-001..003 |
| 2 | `source_url` thiếu → **warning**, không block import | OQ-PDF-003, VR-SRC-006 |
| 3 | PDF scan → `ocr_required` → **block import** | OQ-PDF-004 |
| 4 | Claim extraction và pre-scoring = **2 bước LLM** riêng | OQ-003 |
| 5 | QA review **100%** — không gateway「lấy mẫu」| OQ-007 |
| 6 | Không nhánh Dispute / Policy / auto-approve | OQ-005, §7 defer |
| 7 | Export: **Admin + QA** (chỉ project được giao), approved-only | §6.5, OQ-009 |

---

## 3. State Machine — Hai tầng

MVP có **2 lớp trạng thái** — vẽ diagram nên tách 2 swimlane hoặc 2 diagram:

1. **Bundle / Parent Task** — sau import, trước khi annotator làm việc.
2. **Claim Task** — vòng đời gán nhãn + QA.

### 3.1. Bundle / Parent Task (system pipeline)

```mermaid
stateDiagram-v2
    [*] --> Uploaded: Admin confirm import

    Uploaded --> Parsing: Worker start
    Parsing --> Parsed: Parse OK
    Parsing --> ParseFailed: Cannot extract answer / critical fail
    ParseFailed --> [*]

    Parsed --> ClaimExtracting: LLM #1
    ClaimExtracting --> SourceMappingRequired: Claim chưa map source (VR-MAP-003)
    ClaimExtracting --> PreScoringRunning: Claims mapped
    SourceMappingRequired --> PreScoringRunning: Mapping resolved / manual fix

    PreScoringRunning --> PreScoringFailed: LLM error schema/timeout
    PreScoringFailed --> PreScoringRunning: Admin retry
    PreScoringRunning --> ReadyForAnnotation: Pre-score OK

    ReadyForAnnotation --> [*]: Claim tasks vào queue Annotator
```

| State | Ý nghĩa | Ai thấy |
|---|---|---|
| `Uploaded` | Bundle đã lưu, chờ parse | Admin |
| `Parsing` | Đang pdfplumber extract | Admin (progress) |
| `ParseFailed` | Không đủ dữ liệu để tiếp tục | Admin |
| `Parsed` | Có raw/normalized text + source list | System |
| `ClaimExtracting` | LLM bước 1 | System |
| `SourceMappingRequired` | Ít nhất 1 claim chưa map source | Admin (optional fix) |
| `PreScoringRunning` | LLM bước 2 | System |
| `PreScoringFailed` | LLM lỗi | Admin |
| `ReadyForAnnotation` | Claim tasks sẵn sàng | Annotator queue |

**Parse warning (không đổi state chính):** `parsed_with_warnings` — metadata/source URL missing → vẫn tiếp tục nếu không blocking.

**Import gate (trước `Uploaded`):** validate fail hoặc `ocr_required` → **không tạo bundle** (error tại màn Import).

### 3.2. Claim Task (annotator + QA)

```mermaid
stateDiagram-v2
    [*] --> Assigned: Pipeline OK + assigned to annotator

    Assigned --> InAnnotation: Annotator mở workspace
    InAnnotation --> InAnnotation: Auto-save 30s / blur
    InAnnotation --> Submitted: Submit hợp lệ

    Submitted --> Approved: QA Approve
    Submitted --> Returned: QA Return

    Returned --> InAnnotation: Annotator sửa + resubmit
    Approved --> Exported: Export job ghi nhận claim

    Exported --> [*]
```

| State | Ý nghĩa | Transition |
|---|---|---|
| `Assigned` | Chờ annotator (hoặc mới return xong) | Từ pipeline |
| `InAnnotation` | Đang làm (auto-save, không phải state DB riêng nếu đơn giản hóa) | Mở workspace |
| `Submitted` | Vào **100%** QA queue | Submit |
| `Returned` | QA trả + comment | Return |
| `Approved` | Đủ điều kiện export | Approve |
| `Exported` | Đã nằm trong file CSV export | Export job |

**Không có:** `Skipped` · `Disputed` · `QA_Edited` · auto-approve khi không sampling.

---

## 4. Use Case — Checklist cập nhật diagram

Dùng khi sửa `Use_Case_Diagram.png`:

| Actor | Use case | MVP? | Ghi chú |
|---|---|:---:|---|
| Admin | Cấu hình project + LLM + Assignment | ✅ | Không User Mgmt UI đầy đủ |
| Admin | Import PDF Bundle | ✅ | Include: validate, parse preview, confirm |
| Admin | Export CSV | ✅ | Approved-only |
| QA | Export CSV (project được giao) | ✅ | **Thêm** nếu diagram chưa có |
| Admin / System | Audit log (xem) | ✅ | Admin only |
| Annotator | Annotation Workspace | ✅ | 6 chiều, source text từ PDF |
| Annotator | Submit task | ✅ | |
| QA | QA Review | ✅ | 100% queue |
| QA | Approve / Return | ✅ | Không sửa điểm |
| System + LLM | Claim extraction | ✅ | LLM #1 |
| System + LLM | Pre-scoring | ✅ | LLM #2, baseline immutable |
| System | Auto-save 30s | ✅ | Không phải use case nghiệp vụ riêng (optional) |
| Annotator | Xem Guideline editor | ❌ | Thay bằng rubric 6 chiều hard-code trên UI |
| Any | Dispute / Sampling / Policy | ❌ | Postponed |

---

## 5. Bảng transition — Claim Task (cho Dev/Test)

| From | Event | To | Điều kiện |
|---|---|---|---|
| — | Import pipeline done | `Assigned` | Annotator được gán |
| `Assigned` | Open workspace | `InAnnotation` | RBAC |
| `InAnnotation` | Submit | `Submitted` | 6 scores, source status, ±0.20 reason |
| `Submitted` | QA Approve | `Approved` | QA role + project scope |
| `Submitted` | QA Return | `Returned` | error_type + comment ≥10 |
| `Returned` | Resubmit | `Submitted` | Validation như Submit |
| `Approved` | Export job | `Exported` | CSV §10 schema |

---

## 6. So sánh với diagram hiện tại — việc phải xóa

| Diagram cũ | Hành động |
|---|---|
| BPMN: Import JSON/CSV | **Xóa** → Import PDF Bundle |
| BPMN: Gateway「Lấy mẫu QA?」| **Xóa** |
| BPMN: Auto-approve / Spot-check | **Xóa** → QA review 100% |
| BPMN: Dispute + SLA 5d | **Xóa** |
| State: Tự động duyệt nếu không lấy mẫu | **Xóa** |
| State: Source mapping qua iframe URL | **Sửa** → `source_text_extract` + optional link |
| State/BPMN: Thiếu Parse/Normalize | **Thêm** |

---

## 7. Deliverable sau khi vẽ lại

| File | Version đích | Deadline tham chiếu |
|---|---|---|
| `VSF_AI_Annotation_Platform_Workflow_BPMN.pdf` (+ PNG export) | v1.2 PDF-native | 11/06 |
| `Task_State_Diagram.png` | v1.2 (2 tầng hoặc 2 file) | 11/06 |
| `Use_Case_Diagram.png` | v1.1 (thêm QA Export) | 11/06 |

Footer gợi ý trên mỗi diagram:

```text
VSF AI Annotation Platform MVP · PDF-native · v1.2 · 09/06/2026
Ref: Bao_cao_PM §6 · dan v0.4 · tuyet Screen Flow §9
```

---

## 8. Tham chiếu nhanh OQ đã chốt

| ID | Quyết định |
|---|---|
| OQ-001 | Input = PDF Bundle |
| OQ-PDF-001..004 | File roles · multi source PDF · text extract · block ocr_required |
| OQ-003 | 2 bước LLM |
| OQ-002 | Gemini 2.5 Flash working (LLMProvider) |
| OQ-007 | QA 100% |
| OQ-005 | No dispute |
| DEC-QA-01 | QA không sửa điểm |
| §6.5 | QA export trong project được giao |
