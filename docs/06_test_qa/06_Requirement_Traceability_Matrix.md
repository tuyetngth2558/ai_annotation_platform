# Requirement Traceability Matrix — VSF AI Annotation Platform MVP

**Owner:** QA Team  
**Phiên bản:** v1.0  
**Ngày:** 06/06/2026

---

## 1. Mục đích

Ma trận này dùng để chứng minh mỗi yêu cầu MVP quan trọng đều có coverage trong bộ test scenario, functional checklist và API/UI sanity checklist.

Baseline áp dụng:

- MVP input chính: PDF Bundle Upload.
- MVP output chính: CSV claim-level.
- QA chỉ có Approve / Return.
- Không build Dispute, Skip, Save Draft button riêng, QA direct correction.

---

## 2. Traceability matrix

| Requirement ID | Requirement | Source BA | Test Coverage | Priority | Status |
|---|---|---|---|---|---|
| REQ-AUTH-001 | User login theo tài khoản nội bộ | IA/Auth | FT-AUTH-001..004, API-002..003, UI-001..002 | P0 | Covered |
| REQ-RBAC-001 | Admin truy cập Project/Import/User/Audit/Export | IA/RBAC | FT-AUTH-001, FT-AUTH-005, E2E-RBAC-001, API-N-002 | P0 | Covered |
| REQ-RBAC-002 | Annotator chỉ thấy task được giao | IA/My Tasks, US-04 | FT-ANN-001, E2E-ANN-001, API-013 | P0 | Covered |
| REQ-RBAC-003 | QA chỉ review task trong scope được giao | IA/QA Queue, US-08 | FT-QA-001, E2E-QA-001, API-016 | P0 | Covered |
| REQ-PRJ-001 | Admin tạo project text Vivipedia | Screen Spec 2.1 | FT-PRJ-001..004, API-005, UI-006..007 | P0 | Covered |
| REQ-LLM-001 | Admin cấu hình LLM endpoint/key/prompt | Screen Spec 2.1, BR-1 | FT-PRJ-005..008, API-006 | P0 | Covered |
| REQ-ASSIGN-001 | Admin gán Annotator và QA | Screen Spec 2.3 | FT-PRJ-009, E2E-001 | P0 | Covered |
| REQ-IMP-001 | Upload PDF Bundle gồm answer/ref/source content | DRD-001, VR-UP | FT-IMP-001..009, E2E-IMP-001..005, API-007..010, UI-008..010 | P0 | Covered |
| REQ-IMP-002 | Validate missing/duplicate/corrupt/invalid PDF | Validation Rules | FT-IMP-002..009, E2E-IMP-002..005, API-N-009..010 | P0 | Covered |
| REQ-PARSE-001 | Parse Answer PDF thành raw và normalized text | DRD-003, VR-PARSE | FT-PIP-001..002, E2E-IMP-007 | P0 | Covered |
| REQ-SRC-001 | Extract source order/title/tier, URL optional | DRD-006, VR-SRC | FT-IMP-010..012, FT-PIP-003, E2E-IMP-006 | P1 | Covered |
| REQ-CLAIM-001 | Claim extraction tạo Claim Task | Screen Flow, VR-CE | FT-PIP-004..005, E2E-IMP-001 | P0 | Covered |
| REQ-MAP-001 | Citation/source mapping và Source Mapping Required | VR-MAP | FT-PIP-006..007, E2E-IMP-008 | P1 | Covered |
| REQ-LLM-002 | LLM pre-score đủ 6 dimension | VR-LLM | FT-PIP-008..010, E2E-IMP-009..010, API-012 | P0 | Covered |
| REQ-ANN-001 | Workspace hiển thị context/claim/source/pre-score | Screen Spec 3 | FT-ANN-002..005, UI-012 | P0 | Covered |
| REQ-ANN-002 | Annotator sửa claim text, giữ original/final | Screen Spec 3.3, VR-CE-005 | FT-ANN-006, E2E-ANN-006 | P1 | Covered |
| REQ-ANN-003 | Score validate 0.00-1.00, tối đa 2 decimals | BR-7, VR-ANN | FT-ANN-007, E2E-ANN-003, API-N-004..005, UI-013 | P0 | Covered |
| REQ-ANN-004 | Composite score tính trung bình 6 dimension | BR-7.2 | FT-ANN-008, E2E-ANN-002 | P0 | Covered |
| REQ-ANN-005 | Delta >= 0.20 bắt buộc justification | BR-7.3 | FT-ANN-009, E2E-ANN-004 | P0 | Covered |
| REQ-ANN-006 | Source issue bắt buộc note | VR-ANN-004 | FT-ANN-010, E2E-ANN-005 | P0 | Covered |
| REQ-ANN-007 | Auto-save 30s hoặc blur event | Screen Flow, BR-6.1 | FT-ANN-013, E2E-ANN-007, API-014, UI-014 | P1 | Covered |
| REQ-ANN-008 | Submit valid chuyển task sang Submitted | Screen Flow | FT-ANN-011..012, E2E-ANN-002, API-015, UI-015 | P0 | Covered |
| REQ-QA-001 | QA Queue hiển thị task Submitted | Screen Spec 4 | FT-QA-001, E2E-QA-001, API-016, UI-017 | P0 | Covered |
| REQ-QA-002 | QA diff view baseline vs annotator output | Screen Spec 4.3 | FT-QA-002..004, E2E-QA-002, UI-018 | P1 | Covered |
| REQ-QA-003 | QA Approve chuyển task sang Approved | BR-8 | FT-QA-005, E2E-QA-003, API-017, UI-019 | P0 | Covered |
| REQ-QA-004 | QA Return bắt buộc error type/comment | BR-8.2 | FT-QA-006..008, E2E-QA-004..005, API-018, API-N-007, UI-020 | P0 | Covered |
| REQ-QA-005 | QA không sửa score/claim trực tiếp | DEC-010, BR-8.1 | FT-QA-009, E2E-QA-006 | P1 | Covered |
| REQ-EXP-001 | Export chỉ Approved claims | DRD-004, VR-EXP | FT-EXP-001..004, E2E-EXP-001, API-019 | P0 | Covered |
| REQ-EXP-002 | CSV có required columns và PDF trace | Import/Export Schema §10 | FT-EXP-005..006, E2E-EXP-002 | P0 | Covered |
| REQ-EXP-003 | CSV UTF-8 và quoting đúng | VR-EXP-006, BR-9.2 | FT-EXP-007..008, E2E-EXP-003, API-020 | P0 | Covered |
| REQ-EXP-004 | Multiple sources join bằng delimiter thống nhất | Edge Cases EC-EXP-003 | FT-EXP-009, E2E-EXP-004 | P1 | Covered |
| REQ-AUD-001 | Audit log core actions | Scope, BR-10 | FT-AUD-001..007, E2E-AUD-001, API-021 | P1 | Covered |
| REQ-ERR-001 | Empty/loading/error state tối thiểu | Screen Spec 6 | UI-024..025 | P2 | Covered |

---

## 3. Known open items affecting test finalization

| Open item | Impact | Suggested QA action |
|---|---|---|
| `NH` vs `HR` naming chưa thống nhất | API/export assertion có thể sai field | Raise before API freeze; update checklist theo quyết định cuối |
| Export role Admin-only hay Admin + QA | RBAC expected result có thể đổi | Confirm với BA/PO trước UAT |
| OCR scope cho PDF scan/image | Expected behavior reject hay flag khác nhau | Giữ test case ở dạng configurable cho đến khi chốt |
| LLM provider/schema chưa chốt | Pre-scoring test cần mock hoặc contract fixture | Dùng mock provider để unblock QA |
| Source content PDF 1-file-per-source hay gộp | Source mapping expected result có thể đổi | Thêm test data cho cả hai nếu dev hỗ trợ |
