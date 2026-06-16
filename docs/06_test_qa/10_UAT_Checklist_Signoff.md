# UAT Checklist & Internal Sign-off — VSF AI Annotation Platform MVP

**Owner:** QA Team  
**Phiên bản:** v1.0  
**Ngày:** 15/06/2026  
**Scope baseline:** `docs/03_ba/00_Scope_Assignment_MVP.md`

---

## 1. Mục tiêu

Checklist này dùng trước demo/UAT để mentor, stakeholder và team nhìn rõ:

- Đã kiểm tra những luồng nào.
- Luồng nào pass/fail.
- Bug nào còn mở.
- Có đủ điều kiện demo/UAT nội bộ hay chưa.

---

## 2. UAT scope

| In scope | Out of scope |
|---|---|
| PDF Bundle Upload | Mobile/responsive mobile |
| PDF Parsing / Text Extraction | Audio/image annotation |
| Internal Normalization | Dispute workflow |
| Claim Extraction | Policy Center |
| LLM Pre-scoring với provider/mock đã chốt | Analytics nâng cao |
| Annotator Review | XLSX/JSON/bulk ZIP export |
| QA Approve / Return | Full enterprise security/compliance |
| Export CSV claim-level | OCR đầy đủ cho scan/image PDF phức tạp |
| RBAC, audit/log, storage trace ở mức MVP |  |

---

## 3. UAT test data

| Data set | Required | Result | Notes |
|---|---|---|---|
| Valid PDF Bundle | Yes | Not Run | |
| PDF Bundle thiếu file role | Yes | Not Run | |
| PDF Bundle có source URL missing | Yes | Not Run | |
| PDF parse fail sample | Yes | Not Run | |
| LLM mock/provider success | Yes | Not Run | |
| LLM fail/invalid schema sample | Optional | Not Run | |
| Approved + Returned + Submitted task set | Yes | Not Run | |

---

## 4. UAT checklist

| ID | Area | Checklist | Expected result | Result | Owner | Notes |
|---|---|---|---|---|---|---|
| UAT-001 | Auth/RBAC | Login bằng Admin, Annotator, QA | Login được, menu đúng role | Not Run | QA | |
| UAT-002 | Auth/RBAC | User không có quyền mở màn trái role | Bị chặn hoặc redirect đúng | Not Run | QA | |
| UAT-003 | Project Setup | Admin tạo project Vivipedia text-only | Project tạo được, modality text | Not Run | QA/BA | |
| UAT-004 | Project Setup | Cấu hình LLM và gán Annotator/QA | Config lưu được, assignment đúng | Not Run | QA/Dev | |
| UAT-005 | PDF Upload | Upload valid PDF Bundle đủ 3 file role | Bundle validate pass | Not Run | QA/Data | |
| UAT-006 | PDF Upload | Upload thiếu/trùng/sai file role | Hệ thống báo lỗi và không import | Not Run | QA/Data | |
| UAT-007 | Parsing | Preview parse metadata/source list | Preview hiển thị dữ liệu/warning rõ | Not Run | QA/Data | |
| UAT-008 | Parsing | PDF parse fail | Import bị block hoặc vào trạng thái lỗi đúng | Not Run | QA/Dev | |
| UAT-009 | Normalization | Kiểm raw text, normalized text, source list | Dữ liệu lưu đúng và trace được PDF bundle | Not Run | QA/Data | |
| UAT-010 | Claim/Pipeline | Claim extraction và source mapping | Claim task tạo đúng, source mapping đúng hoặc có trạng thái cần xử lý | Not Run | QA/Dev | |
| UAT-011 | LLM Pre-scoring | LLM/mock pre-score success | Có đủ 6 score, baseline read-only | Not Run | QA/Dev | |
| UAT-012 | Annotator | Annotator mở task, review, nhập score/note | Workspace đủ context/source/pre-score | Not Run | QA/BA | |
| UAT-013 | Annotator | Score invalid hoặc thiếu note bắt buộc | Submit bị block với lỗi rõ | Not Run | QA | |
| UAT-014 | Annotator | Submit valid task | Task chuyển `Submitted` và vào QA Queue | Not Run | QA | |
| UAT-015 | QA Review | QA approve task | Task chuyển `Approved` | Not Run | QA/BA | |
| UAT-016 | QA Review | QA return task với error/comment | Task chuyển `Returned`, Annotator thấy feedback | Not Run | QA/BA | |
| UAT-017 | Export | Export CSV sau khi có Approved claim | CSV chỉ có Approved claim | Not Run | QA/Data | |
| UAT-018 | Export | Kiểm required columns, UTF-8, quoting, PDF trace | CSV đúng schema và trace về PDF gốc | Not Run | QA/Data | |
| UAT-019 | Audit/Log | Kiểm log import/submit/approve/return/export | Log đủ actor/action/object/time | Not Run | QA/Dev | |
| UAT-020 | Storage | Kiểm PDF file refs sau upload/export | File refs đúng bundle/file role, không broken link | Not Run | QA/Dev | |

---

## 5. Bug summary trước sign-off

| Severity | Open | Accepted/Deferred | Notes |
|---|---:|---:|---|
| Critical/P0 | 0 | 0 | |
| High/P1 | 0 | 0 | |
| Medium/P2 | 0 | 0 | |
| Low/P3 | 0 | 0 | |

---

## 6. Sign-off decision

| Decision | Chọn |
|---|---|
| Pass — Sẵn sàng demo/UAT | [ ] |
| Pass có điều kiện — Có bug được chấp nhận/defer | [ ] |
| Fail — Chưa sẵn sàng demo/UAT | [ ] |

Lý do / điều kiện đi kèm:

```text

```

---

## 7. Internal sign-off

| Vai trò | Người ký nhận | Kết quả | Ngày | Ghi chú |
|---|---|---|---|---|
| QA | Nhung | Pending |  | |
| Test Execution | Hưng | Pending |  | |
| BA/Workflow | Quang | Pending |  | |
| BA/Data | Đan | Pending |  | |
| BA/Scope/UI | Tuyết | Pending |  | |
| Dev/DevOps | TBD | Pending |  | |
| Mentor/Stakeholder | TBD | Pending |  | |

---

## 8. Related artifacts

| Artifact | Mục đích |
|---|---|
| `01_Test_Plan_PDF_Native_MVP.md` | Test strategy tổng thể |
| `02_AC_to_Test_Cases_Mapping.md` | Trace AC/BR sang test case |
| `03_E2E_Test_Scenarios.md` | Luồng E2E chính |
| `08_Regression_Checklist.md` | Regression trước UAT/demo |
| `09_Integration_Test_Plan_Main_Workflow.md` | Integration workflow chính |
| `07_Test_Execution_Report_Template.md` | Báo cáo kết quả chạy test |
