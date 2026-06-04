# Open Questions / Assumptions / Dependencies Log
# VSF AI Annotation Platform MVP

**Owner:** Tuyết  
**Phiên bản:** 2.0  
**Ngày cập nhật:** 03/06/2026  
**Trạng thái:** Active log for Week 1  

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

### OQ-001 — Format input: CSV hay JSON?

| Field | Nội dung |
|---|---|
| Câu hỏi | MVP import dùng CSV hay JSON là format chính? |
| Ảnh hưởng | Import schema, validator, UI upload |
| Owner chốt | Tuyết + Đan + mentor |
| Deadline chốt | 04/06/2026 |
| Gợi ý | Chốt CSV là format chính cho MVP; JSON giữ như option phụ nếu dev muốn hỗ trợ sớm |
| Trạng thái | 🔴 Chưa chốt |
| Ảnh hưởng nếu trễ | Block import schema, block UI upload |

### OQ-002 — LLM provider cụ thể là gì?

| Field | Nội dung |
|---|---|
| Câu hỏi | Dùng provider nào, endpoint nào, output schema nào? |
| Ảnh hưởng | Project setup, backend integration, pre-scoring |
| Owner chốt | Mentor / admin kỹ thuật |
| Deadline chốt | 04/06/2026 |
| Gợi ý | Chốt 1 provider duy nhất cho MVP |
| Trạng thái | 🔴 Chưa chốt |
| Ảnh hưởng nếu trễ | Block backend flow tuần 2 |

### OQ-003 — Claim extraction tách riêng hay gộp với pre-scoring?

| Field | Nội dung |
|---|---|
| Câu hỏi | LLM vừa tách claim vừa chấm điểm trong một bước, hay tách thành 2 bước? |
| Ảnh hưởng | Pipeline, schema output, state machine |
| Owner chốt | Quang + Đan + dev |
| Deadline chốt | 05/06/2026 |
| Gợi ý | Tách riêng để dễ debug và sửa tay |
| Trạng thái | 🔴 Chưa chốt |
| Ảnh hưởng nếu trễ | Block flow import/background processing |

### OQ-004 — Ngưỡng bắt buộc nhập lý do khi đổi điểm là bao nhiêu?

| Field | Nội dung |
|---|---|
| Câu hỏi | Chênh lệch bao nhiêu so với pre-score thì annotator phải nhập lý do? |
| Ảnh hưởng | Validation của Annotation Workspace |
| Owner chốt | Quang + Tuyết |
| Deadline chốt | 06/06/2026 |
| Draft | ±0.20 |
| Trạng thái | 🟡 Pending |
| Ảnh hưởng nếu trễ | Block submit validation |

### OQ-005 — MVP có dispute workflow không?

| Field | Nội dung |
|---|---|
| Câu hỏi | QA có được escalate dispute trong 4 tuần không? |
| Ảnh hưởng | Scope QA, state machine, screen action |
| Owner chốt | Mentor |
| Deadline chốt | 04/06/2026 |
| Gợi ý | Không build trong MVP |
| Trạng thái | 🟡 Pending confirm |
| Ảnh hưởng nếu trễ | Làm flow QA bị nửa vời |

### OQ-006 — Security baseline của MVP là gì?

| Field | Nội dung |
|---|---|
| Câu hỏi | MVP cần auth/security ở mức nào? MFA có bắt buộc không? |
| Ảnh hưởng | Auth flow, DevOps setup, RBAC |
| Owner chốt | Khải + Tuấn Anh + mentor |
| Deadline chốt | 05/06/2026 |
| Gợi ý | Email/password + RBAC cơ bản; MFA để phase sau |
| Trạng thái | 🔴 Chưa chốt |
| Ảnh hưởng nếu trễ | Block auth implementation |

### OQ-007 — QA sampling trong MVP là 100% hay cấu hình khác?

| Field | Nội dung |
|---|---|
| Câu hỏi | MVP review 100% task hay có sampling? |
| Ảnh hưởng | QA queue logic |
| Owner chốt | Quang + QA lead |
| Deadline chốt | 06/06/2026 |
| Gợi ý | 100% review để đơn giản hóa MVP |
| Trạng thái | 🟡 Pending |
| Ảnh hưởng nếu trễ | Logic queue dễ thay đổi giữa chừng |

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
| Draft | `claim_id`, `answer_id`, `claim_text_final`, 6 final scores, `composite_score`, `annotator_id`, `approved_at` |
| Trạng thái | 🟡 Pending |
| Ảnh hưởng nếu trễ | Block export UI và test data verification |

### OQ-010 — Separator cho nhiều source URL là gì?

| Field | Nội dung |
|---|---|
| Câu hỏi | Nhiều URL trong một cell CSV dùng `|`, `,` hay format khác? |
| Ảnh hưởng | Import schema, parser |
| Owner chốt | Đan + người cung cấp data |
| Deadline chốt | 05/06/2026 |
| Trạng thái | 🔴 Chưa chốt |
| Ảnh hưởng nếu trễ | Block parser/validator |

---

## 4. Assumptions đang dùng

| ID | Assumption | Rủi ro nếu sai | Trạng thái |
|---|---|---|---|
| AS-001 | MVP chỉ implement text; audio/image chỉ design | Scope nở mạnh | 🟡 Chờ mentor confirm |
| AS-002 | Chỉ dùng 1 LLM provider, không fallback | Pipeline dừng nếu provider lỗi | 🔴 Phụ thuộc OQ-002 |
| AS-003 | Annotator submit là task vào QA queue | Queue logic thay đổi | 🟡 Pending |
| AS-004 | Auto-save 30 giây là đủ; không làm offline sync | Có thể mất dữ liệu khi mất mạng | 🔴 Cần dev confirm |
| AS-005 | QA review 100% task trong MVP | QA bị tải nặng hơn | 🟡 Pending |
| AS-006 | Audit log lưu DB, không cần WORM | Compliance chưa mạnh | ✅ Đã chốt theo scope |
| AS-007 | Export CSV không cần encryption trong MVP | Rủi ro bảo mật dữ liệu | 🔴 Cần confirm |
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
| DEP-004 | Acceptance Criteria → Test Plan | Nhung | Quang | 06/06 | 🔴 Chưa xong | Block test case viết sớm |
| DEP-005 | Import Schema → Parser/backend | Dev | Đan | 05/06 | 🔴 Chưa xong | Block import flow |
| DEP-006 | Dev environment → Tất cả dev build | Dev team | Khải | 04/06 | 🔴 Chưa xong | Block triển khai tuần 2 |
| DEP-007 | LLM provider chốt → Project setup/backend | BA + Dev | Mentor | 04/06 | ⛔ Blocked | Block integration |
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

---

## 7. Action items từ open questions

| OQ | Action | Owner | Deadline |
|---|---|---|---|
| OQ-001 | Xác nhận format import chính với mentor | Tuyết | 04/06 |
| OQ-002 | Xác nhận LLM provider và endpoint | Tuyết | 04/06 |
| OQ-003 | Họp BA + Dev chốt claim extraction flow | Quang | 05/06 |
| OQ-004 | Chốt ngưỡng ±0.20 trong business rules | Quang | 06/06 |
| OQ-005 | Confirm lại dispute không nằm trong MVP | Tuyết | 04/06 |
| OQ-006 | DevOps đề xuất security baseline | Khải | 05/06 |
| OQ-007 | Chốt 100% review hay sampling khác | Quang | 06/06 |
| OQ-009 | Draft export schema và review team | Đan | 06/06 |
| OQ-010 | Chốt separator source URL với nguồn data | Đan | 05/06 |

---

## 8. Cách cập nhật log

- Tuần 1: cập nhật hằng ngày
- Từ tuần 2 trở đi: cập nhật ít nhất 2 lần/tuần
- Mỗi item khi được chốt phải:
  - đổi trạng thái sang `✅ Đã chốt`
  - ghi quyết định cuối cùng
  - cập nhật nếu nó thay đổi dependency hay screen spec

---

*Log này phải được dùng chung trong họp sync BA, UI/UX, DevOps và Test để tránh mỗi nhóm hiểu scope khác nhau.*
