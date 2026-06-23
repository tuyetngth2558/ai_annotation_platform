# Open Questions / Assumptions / Dependencies Log
# VSF AI Annotation Platform MVP

**Owner:** Nguyễn Thị Tuyết  
**Trạng thái:** Active log — OQ đã chốt theo `docs/00_project_management/Bao_cao_doi_chieu_scaffold_vs_scope_MVP.md` §6  


---

## 1. Mục đích

Log này dùng để:

- theo dõi các câu hỏi mở cần chốt sớm
- ghi nhận assumptions đang được dùng để làm việc
- quản lý dependencies giữa BA, UI/UX, DevOps, Test
- tránh trễ tiến độ do thiếu quyết định

---

## 2. Ký hiệu trạng thái

| Ký hiệu | Ý nghĩa |
|---|---|
| 🔴 Chưa chốt | Cần chốt gấp, có thể ảnh hưởng timeline |
| 🟡 Pending | Đã có hướng draft, chờ confirm |
| ✅ Đã chốt | Có quyết định cuối cùng |
| ⛔ Blocked | Đang chặn team khác |

---

## 3. Open Questions

### OQ-001 — Format input chính của MVP là gì?

| Field | Nội dung |
|---|---|
| Câu hỏi | MVP import dùng format nào làm input chính? |
| Ảnh hưởng | Import schema, validator, UI upload |
| Owner chốt | Mentor + Đan + Tuyết |
| Deadline chốt | 06/06/2026 |
| Quyết định | **PDF Bundle Upload** — Answer PDF + Source Reference PDF + ít nhất 1 Source Content PDF |
| Trạng thái | ✅ Đã chốt |
| Ghi chú | CSV/JSON không còn là user-facing import chính; export vẫn là CSV claim-level. Tham chiếu `docs/03_ba/dan` DRD-001, DRD-002 |

### OQ-002 — LLM provider cụ thể là gì?

| Field | Nội dung |
|---|---|
| Câu hỏi | Dùng provider nào, endpoint nào, output schema nào? |
| Ảnh hưởng | Project setup, backend integration, pre-scoring |
| Owner chốt | Mentor / admin kỹ thuật |
| Deadline chốt | 12/06/2026 (API key) |
| Quyết định | **1 provider cố định**, không fallback MVP; tích hợp qua **`LLMProvider` interface**; working provider: **Google Gemini 2.5 Flash** (claim extraction + pre-scoring). Pilot **20 claim** PDF thật — nếu chất lượng kém → đổi **Claude Sonnet 4.6** qua config |
| Trạng thái | ✅ Đã chốt (working) · 🔑 chờ mentor cấp API key 12/06 |
| Ghi chú | Báo cáo PM §6.2 |

### OQ-003 — Claim extraction tách riêng hay gộp với pre-scoring?

| Field | Nội dung |
|---|---|
| Câu hỏi | LLM vừa tách claim vừa chấm điểm trong một bước, hay tách thành 2 bước? |
| Ảnh hưởng | Pipeline, schema output, state machine |
| Owner chốt | Quang + Đan + dev |
| Deadline chốt | 09/06/2026 |
| Quyết định | **Tách 2 bước LLM**: (1) Claim extraction → (2) Pre-scoring |
| Trạng thái | ✅ Đã chốt |
| Ghi chú | Khớp `import_pipeline.py`; Báo cáo PM §6.2 |

### OQ-004 — Ngưỡng bắt buộc nhập lý do khi đổi điểm là bao nhiêu?

| Field | Nội dung |
|---|---|
| Câu hỏi | Chênh lệch bao nhiêu so với pre-score thì annotator phải nhập lý do? |
| Ảnh hưởng | Validation của Annotation Workspace |
| Owner chốt | Quang + Tuyết |
| Deadline chốt | 06/06/2026 |
| Quyết định | **±0.20** so với pre-score — bắt buộc justification (reason non-empty) |
| Trạng thái | ✅ Đã chốt |
| Ghi chú | `JUSTIFICATION_THRESHOLD`; Báo cáo PM §6.3 |

### OQ-005 — MVP có dispute workflow không?

| Field | Nội dung |
|---|---|
| Câu hỏi | QA có được escalate dispute trong 4 tuần không? |
| Ảnh hưởng | Scope QA, state machine, screen action |
| Owner chốt | Mentor |
| Deadline chốt | 04/06/2026 |
| Quyết định | **Không build dispute** trong MVP 4 tuần |
| Trạng thái | ✅ Đã chốt |
| Ghi chú | Báo cáo PM §6.3, §7 |

### OQ-006 — Security baseline của MVP là gì?

| Field | Nội dung |
|---|---|
| Câu hỏi | MVP cần auth/security ở mức nào? MFA có bắt buộc không? |
| Ảnh hưởng | Auth flow, DevOps setup, RBAC |
| Owner chốt | Khải + Tuấn Anh + mentor |
| Deadline chốt | 05/06/2026 |
| Quyết định | **Email/password + JWT + RBAC 3 role**; API key LLM encrypt-at-rest; session timeout cơ bản; **không MFA**; audit log DB thường (không WORM) |
| Trạng thái | ✅ Đã chốt |
| Ghi chú | Báo cáo PM §6.4 |

### OQ-007 — QA sampling trong MVP là 100% hay cấu hình khác?

| Field | Nội dung |
|---|---|
| Câu hỏi | MVP review 100% task hay có sampling? |
| Ảnh hưởng | QA queue logic |
| Owner chốt | Quang + QA lead |
| Deadline chốt | 06/06/2026 |
| Quyết định | **QA review 100%** task submitted — không sampling engine |
| Trạng thái | ✅ Đã chốt |
| Ghi chú | Báo cáo PM §6.3 |

### OQ-008 — Annotator có được xem task của người khác không?

| Field | Nội dung |
|---|---|
| Câu hỏi | Annotator chỉ thấy task được giao hay thấy toàn project? |
| Ảnh hưởng | RBAC, My Tasks |
| Owner chốt | Tuyết + Quang |
| Deadline chốt | 05/06/2026 |
| Gợi ý | Chỉ thấy task được giao |
| Trạng thái | ✅ Đã chốt |
| Quyết định | Theo PRD: chỉ thấy task được giao |

### OQ-009 — Export tối thiểu gồm những cột nào?

| Field | Nội dung |
|---|---|
| Câu hỏi | Export claim-level tối thiểu cần những cột nào? |
| Ảnh hưởng | Export schema, test verification |
| Owner chốt | Đan + mentor |
| Deadline chốt | 06/06/2026 |
| Quyết định | Theo **`docs/03_ba/dan/02_Import_Export_Schema.md` §10** — bắt buộc `bundle_id`, PDF filenames, `article_code`, mapped source, 6 ann scores |
| Trạng thái | ✅ Đã chốt |
| Ghi chú | Báo cáo PM §6.2 |

### OQ-010 — Separator cho nhiều source URL là gì?

| Field | Nội dung |
|---|---|
| Câu hỏi | Nhiều URL trong một cell CSV dùng `|`, `,` hay format khác? |
| Ảnh hưởng | Import schema, parser |
| Owner chốt | Đan + người cung cấp data |
| Deadline chốt | 05/06/2026 |
| Trạng thái | ⛔ Không áp dụng cho MVP hiện tại |
| Ghi chú | Input chính là PDF; `source_url` optional sau parse. Câu hỏi chỉ còn liên quan nếu team bật lại CSV import hoặc export mapping |

### OQ-PDF-001 — Một bundle bắt buộc có bao nhiêu file?

| Field | Nội dung |
|---|---|
| Câu hỏi | Answer + Ref + ít nhất 1 Source Content đúng không? |
| Ảnh hưởng | Upload validation UI |
| Owner chốt | PO/BA |
| Quyết định | **1 answer_pdf + 1 source_ref_pdf + ≥1 source_content_pdf** |
| Trạng thái | ✅ Đã chốt |
| Tham chiếu | `VR-UP-001`–`003`; Báo cáo PM §6.1 |

### OQ-PDF-002 — Source Content PDF upload từng file hay gộp?

| Field | Nội dung |
|---|---|
| Câu hỏi | Mỗi nguồn một PDF riêng hay gộp nhiều nguồn? |
| Ảnh hưởng | Bundle builder UI, storage, source mapping |
| Owner chốt | Engineering/BA |
| Quyết định | Hỗ trợ **nhiều `source_content_pdf`/bundle**; khuyến nghị **1 file / 1 nguồn** khi có thể |
| Trạng thái | ✅ Đã chốt |
| Tham chiếu | Báo cáo PM §6.1 |

### OQ-PDF-003 — Nếu source URL không parse được, annotator làm gì?

| Field | Nội dung |
|---|---|
| Câu hỏi | Annotator có cần mở nguồn ngoài không? |
| Ảnh hưởng | Source Viewer UI, source verification flow |
| Owner chốt | PO/QA |
| Quyết định | **Ưu tiên `source_text_extract` từ PDF**; không bắt mở URL ngoài; URL optional nếu parse được; nguồn inaccessible → **note bắt buộc** |
| Trạng thái | ✅ Đã chốt |
| Tham chiếu | `DRD-006`; Báo cáo PM §6.1 |

### OQ-PDF-004 — PDF scan/image có trong MVP không?

| Field | Nội dung |
|---|---|
| Câu hỏi | OCR có nằm trong scope 4 tuần không? |
| Ảnh hưởng | Parse flow, reject/warning UI |
| Owner chốt | PO/Engineering |
| Quyết định | **Không build OCR trong MVP**; PDF scan → `ocr_required` → **block import** + message rõ |
| Trạng thái | ✅ Đã chốt |
| Tham chiếu | Báo cáo PM §6.1 |

### OQ-MEET-001 — QA có được Export không? (§6.5)

| Field | Nội dung |
|---|---|
| Câu hỏi | QA có quyền export CSV trong MVP không? |
| Quyết định | **Có** — QA export task **Approved** trong **project được giao** (không export toàn platform) |
| Trạng thái | ✅ Đã chốt |
| Owner triển khai | Tuyết (IA `/qa/export`); Dev FE |

### OQ-MEET-002 — User Management MVP? (§6.5)

| Field | Nội dung |
|---|---|
| Câu hỏi | Có build User Management UI đầy đủ không? |
| Quyết định | **Không** — seed user + gán role trong **Project Setup / Assignment** |
| Trạng thái | ✅ Đã chốt |
| Owner triển khai | Quang (AC); Dev BE `assignments` |

---

## 4. Assumptions đang dùng

| ID | Assumption | Rủi ro nếu sai | Trạng thái |
|---|---|---|---|
| AS-001 | MVP chỉ implement text/PDF; audio/image chỉ design | Scope nở mạnh | ✅ Đã chốt theo scope |
| AS-011 | Input chính là PDF Bundle Upload, không phải CSV/JSON | Toàn bộ import UI/parser lệch nếu sai | ✅ Đã chốt 06/06/2026 |
| AS-012 | `source_url` optional sau PDF parse; source_order/title/tier required | Source Viewer UI phải hiển thị text từ PDF | ✅ Đã chốt (OQ-PDF-003) |
| AS-002 | Chỉ dùng 1 LLM provider (Gemini 2.5 Flash working), không fallback | Pipeline dừng nếu provider lỗi | ✅ Đã chốt · 🔑 chờ API key |
| AS-003 | Annotator submit → task vào QA queue (100%) | Queue logic thay đổi | ✅ Đã chốt (OQ-007) |
| AS-004 | Auto-save **30 giây**; không offline sync | Có thể mất dữ liệu khi mất mạng | ✅ Đã chốt (DEC-UX-01) |
| AS-005 | QA review **100%** task submitted trong MVP | QA bị tải nặng hơn | ✅ Đã chốt (OQ-007) |
| AS-006 | Audit log lưu DB, không cần WORM | Compliance chưa mạnh | ✅ Đã chốt theo scope |
| AS-007 | Export CSV: HTTPS + phân quyền; không encrypt file trong MVP | Rủi ro bảo mật dữ liệu nội bộ | ✅ Đã chốt (DEC-SEC-01) |
| AS-013 | QA không sửa điểm/claim trực tiếp — chỉ Approve/Return | Flow QA đơn giản hơn PRD | ✅ Đã chốt (DEC-QA-01) |
| AS-014 | QA được export trong project được giao | RBAC export cần scope project | ✅ Đã chốt (§6.5) |
| AS-008 | Composite score = trung bình đều 6 dimension | Có thể không phản ánh trọng số thực tế | ✅ Theo PRD/scope hiện tại |
| AS-009 | Dashboard MVP chỉ là landing page có số đếm cơ bản | PM có thể muốn analytics hơn | ✅ Đã chốt |
| AS-010 | Annotator không xem task người khác | Nếu sai sẽ lệch RBAC | ✅ Đã chốt |

---

## 5. Dependencies giữa các nhóm

| ID | Dependency | Bên cần | Bên cung cấp | Deadline | Trạng thái | Ảnh hưởng nếu trễ |
|---|---|---|---|---|---|---|
| DEP-001 | ERD → Database setup | Tuấn Anh | Đan | 05/06 | 🔴 Chưa xong | Block DB setup |
| DEP-002 | Screen Flow → Wireframe | Trí | Tuyết | 05/06 | 🟡 Đang làm | Block wireframe |
| DEP-003 | Screen Spec → Design handoff | Trí | Tuyết | 10/06 | 🟡 Đang làm | Block final UI handoff |
| DEP-004 | Acceptance Criteria → Test Plan | Nhung | Quang | 11/06 | 🟡 QA dùng tạm `dan/` + `tuyet/` + Báo cáo PM §6 | Block regression đầy đủ nếu Quang trễ |
| DEP-005 | PDF Bundle Schema + Validation Rules → Parser/backend | Dev | Đan | 05/06 | 🟡 Đã có draft v0.4 | Block import flow nếu chưa implement |
| DEP-006 | Dev environment → Tất cả dev build | Dev team | Khải | 04/06 | 🔴 Chưa xong | Block triển khai tuần 2 |
| DEP-007 | LLM API key Gemini → Project setup/backend | BA + Dev | Mentor | 12/06 | 🟡 Working decision chốt; chờ key | Dùng MockProvider đến khi có key |
| DEP-008 | State machine → QA workflow build | Dev | Quang | 05/06 | 🔴 Chưa xong | Block workflow logic |
| DEP-009 | Validation rules → Submit validation | Dev | Đan | 11/06 | 🟡 Tuần 2 | Có thể build tạm rồi sửa lại |
| DEP-010 | Wireframe → Usability review | Tuyết | Trí | 06/06 | 🔴 Chờ wireframe | Block review UI |

---

## 6. Quyết định đã chốt

| ID | Quyết định | Ngày chốt | Ghi chú |
|---|---|---|---|
| DEC-001 | MVP chỉ làm text annotation cho Vivipedia | 02/06/2026 | Scope meeting |
| DEC-002 | Chỉ 1 modality, 1 use case, desktop web | 02/06/2026 | Scope meeting |
| DEC-003 | Dispute workflow hoãn sang phase sau | 02/06/2026 | Scope meeting |
| DEC-004 | QA MVP chỉ có Approve / Return | 02/06/2026 | Scope meeting |
| DEC-005 | Audit log ở mức tối thiểu, không WORM | 02/06/2026 | Scope meeting |
| DEC-006 | 3 màn ưu tiên: Import, Annotation Workspace, QA Review | 02/06/2026 | Scope meeting |
| DEC-007 | Design rộng, build hẹp | 02/06/2026 | Scope meeting |
| DEC-008 | Export MVP chỉ export CSV claim-level | 03/06/2026 | Đồng bộ theo scope và spec |
| DEC-009 | Không build Save Draft riêng và Skip riêng trong MVP | 03/06/2026 | Đồng bộ lại flow để giảm state |
| DEC-010 | Không build QA direct correction trong MVP | 03/06/2026 | Giảm phức tạp workflow |
| DEC-SQ-01 | SQ MVP = tier + domain heuristic từ PDF; không bắt buộc web search; LLM pre-score chỉ dùng signals đã parse | 15/06/2026 | `docs/03_ba/quang/DQ-SQ-001_Source_Quality_SQ_MVP.md` (draft chờ mentor) |
| DEC-011 | Input chính MVP là **PDF Bundle Upload** | 06/06/2026 | Mentor chốt; đồng bộ `docs/03_ba/dan` v0.4 |
| DEC-012 | Không dùng CSV/JSON làm user-facing import chính | 06/06/2026 | Portal chưa cung cấp CSV/JSON |
| DEC-013 | Export CSV claim-level phải trace về `bundle_id` và PDF filenames | 06/06/2026 | Theo DRD-005 |
| DEC-QA-01 | QA **không sửa điểm trực tiếp** — chỉ Approve/Return | 09/06/2026 | Báo cáo PM §6.3 |
| DEC-SEC-01 | Export CSV: HTTPS + RBAC; không encrypt file trong MVP | 09/06/2026 | Báo cáo PM §6.4 |
| DEC-UX-01 | Auto-save annotator **30 giây**; không offline sync | 09/06/2026 | Báo cáo PM §6.4 |
| DEC-014 | QA được **Export CSV** trong project được giao | 09/06/2026 | Báo cáo PM §6.5 |
| DEC-015 | **Không** User Management UI đầy đủ — seed + Assignment | 09/06/2026 | Báo cáo PM §6.5 |
| DEC-016 | LLM: **Gemini 2.5 Flash** qua `LLMProvider`; 2 bước extract + pre-score | 09/06/2026 | Báo cáo PM §6.2 |
| DEC-017 | PDF scan `ocr_required` → **block import** | 09/06/2026 | Báo cáo PM §6.1 |
| DEC-S3-01 | IAA metric: **Krippendorff's Alpha** | 17/06/2026 | Sprint_3 §B-01 |
| DEC-S3-02 | Dispute: **MVP flow** QA → Admin resolve | 17/06/2026 | Sprint_3 §B-02 |
| DEC-S3-03 | Export consolidated: **XLSX 6 sheet** | 17/06/2026 | Sprint_3 §B-03 |
| DEC-S3-04 | Notification: **polling 10s** | 17/06/2026 | Sprint_3 §B-04 |
| DEC-S3-05 | IAA overlap: **Admin chọn thủ công** | 17/06/2026 | Sprint_3 §B-05 |
| DEC-S3-06 | Dispute UI MVP: **Admin resolve** (Policy Analyst fields reserve disabled) | 17/06/2026 | `06_Sprint3_Screen_Specification.md` §5 |

---

## 7. Action items từ open questions

| OQ | Action | Owner | Deadline |
|---|---|---|---|
| OQ-001 | ~~PDF Bundle input~~ | — | ✅ Done |
| OQ-002 | Mentor cấp **API key Gemini 2.5 Flash**; pilot 20 claim | Mentor + Dev | 12/06 |
| OQ-003 | ~~2 bước LLM~~ → Dev implement pipeline | Dev | Tuần 2 |
| OQ-004 | ~~±0.20~~ → Quang ghi vào AC/business rules | Quang | 12/06 |
| OQ-005 | ~~No dispute~~ | — | ✅ Done |
| OQ-006 | Dev implement auth JWT + RBAC | Dev | Tuần 2 |
| OQ-007 | ~~100% QA~~ | — | ✅ Done |
| OQ-009 | Handoff export §10 cho Hưng verify | Đan | 12/06 |
| OQ-010 | ~~N/A CSV separator~~ | — | N/A |
| OQ-PDF-001..004 | ~~Đã chốt §6.1~~ | — | ✅ Done |
| OQ-MEET-001 | Cập nhật IA: QA export `/qa/export` | Tuyết | 10/06 |
| OQ-MEET-002 | Cập nhật AC: không User Mgmt UI đầy đủ | Quang | 11/06 |
| — | Quang đồng bộ `docs/03_ba/quang/` PDF-native | Quang | **11/06** |

---

## 8. Cách cập nhật log

- Tuần 1: cập nhật hằng ngày
- Từ tuần 2 trở đi: cập nhật ít nhất 2 lần/tuần
- Mỗi item khi được chốt phải:
  - đổi trạng thái sang `✅ Đã chốt`
  - ghi quyết định cuối cùng
  - cập nhật nếu nó thay đổi dependency hay screen spec

---

