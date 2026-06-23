# 13. Edge Cases — Sprint 3 (Notification · IAA · Dispute · Export Consolidated)

**Owner:** Phạm Đan Kha
**Phiên bản:** v0.1 (Sprint 3 draft)
**Trạng thái:** Draft — Tuần 2
**Bổ sung cho:** `docs/03_ba/dan/04_Edge_Cases.md` (Sprint 1–2 v0.6). Đánh số tiếp EC-…

---

## 9. Notification Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-NOTIF-001 | Trigger đã xảy ra nhưng không có recipient active | Notification bị skip (không lỗi); log info | Low |
| EC-NOTIF-002 | Cùng trigger gọi 2 lần (race condition) | UNIQUE constraint suppress duplicate; 1 row only | Medium |
| EC-NOTIF-003 | User bị inactive sau khi notification tạo | Notification vẫn tồn tại; user sẽ thấy khi login lại | Medium |
| EC-NOTIF-004 | User xóa notification đã read | OK nếu RBAC cho (VR-NOTIF-008); audit_log KHÔNG lưu (notification không audit) | Low |
| EC-NOTIF-005 | Polling client mất kết nối 5+ phút | Client poll lại; server trả unread + mới tạo. Không mất notification. | High |
| EC-NOTIF-006 | Notification `entity_id` trỏ tới record đã bị xóa mềm | Click-through fallback sang route list, không crash | Medium |
| EC-NOTIF-007 | Build notification cho system-wide event (vd rubric publish) | Broadcast cho tất cả annotator của project; `project_id` set; không spam nếu user đã trong cùng project 2 lần role | Medium |
| EC-NOTIF-008 | Notification tạo trong transaction nghiệp vụ mà fail sau | Outbox pattern: insert NOTIFICATION trong cùng transaction với event (Sprint 4) hoặc rollback đồng thời | Medium |

## 10. IAA Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-IAA-001 | Cùng `claim_id` nhưng chỉ 1 annotator submit (submit còn lại chưa xong) | VR-IAA-004 chặn compute; job retry mỗi khi có submission mới cho tới khi đủ | High |
| EC-IAA-002 | Cùng `claim_id` chỉ có 1 annotator được overlap assign (assign thiếu) | VR-IAA-001 chặn; dashboard cảnh báo "Insufficient overlap" | High |
| EC-IAA-003 | Override overlap khi 1 annotator fail/withdrawn | Admin thêm annotator mới, tính lại; giữ lịch sử overlap (soft-update) | Medium |
| EC-IAA-004 | 2 annotator submit nhưng scores chênh nhau tới 1.00 ở 1 dim | IAA score có thể rất thấp (<0.60); Quality Gate flag annotator | Medium |
| EC-IAA-005 | Submission của annotator bị dispute | Filter: chỉ tính IAA trên submission KHÔNG bị dispute_resolved_re_annotation; docs trong filter JSON | Medium |
| EC-IAA-006 | Project chưa có overlap nào được assign | IAA project composite = null; dashboard hiển thị "Not configured" | High |
| EC-IAA-007 | Submission bị edit sau khi submit (workflow không cho) | N/A — Sprint 1–2 không cho edit sau submit (status=superseded) | Low |
| EC-IAA-008 | Period ngắn (1 ngày, 2 submission) | IAA vẫn tính được nhưng độ tin cậy thấp; cảnh báo "low sample size" ở UI dashboard | Medium |
| EC-IAA-009 | Conflict khi 2 IAA compute job chạy đồng thời | Dùng UPSERT với UNIQUE `(project_id, scope_type, scope_id, rubric_dimension, period_start, period_end)`; pg advisory lock nếu cần | Medium |
| EC-IAA-010 | Annotator rời project giữa chừng | IAA history giữ annotator_id cũ; flag inactive; recompute có thể bỏ qua (config) | Low |

## 11. Dispute Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-DISP-001 | QA flag dispute nhưng `claim_id` chưa có lần Return nào (VR-DISP-003) | Block tạo; nếu Admin override qua (VR-DISP-006) thì ghi rõ reason | High |
| EC-DISP-002 | 2 QA return lần lượt cho cùng claim trước khi dispute | Dispute chỉ đếm nếu có 1+ lần return + 1 resubmit (logic VR-DISP-003) | High |
| EC-DISP-003 | Annotator resubmit nhiều lần, lần cuối cùng QA vẫn return | Đủ điều kiện ≥1 return + ≥1 resubmit; QA flag ngay sau return lần cuối | Medium |
| EC-DISP-004 | Dispute đang `disputed`, Admin chuyển sang `in_review` đồng thời có 1 cron flip overdue | VR-DISP-011 chỉ cho phép 1 transition; race → dùng CAS / `WHERE status = 'disputed'` UPDATE; lost update → audit log warning | High |
| EC-DISP-005 | Dispute overdue (5 ngày) trong khi Admin đang xử lý | Vẫn còn `dispute_in_review`; UI cảnh báo SLA approaching/overdue; "approve/re_annotate" vẫn được nhưng audit note | Medium |
| EC-DISP-006 | Dispute resolve hôm trước, hôm sau claim annotation thay đổi (Post-MVP) | Dispute record immutable — không bao giờ edit; nếu nghiệp vụ yêu cầu cập nhật → tạo dispute mới | Medium |
| EC-DISP-007 | Annotator bị inactive → dispute vẫn còn | Vẫn giữ; không thông báo annotator nếu không còn active | Low |
| EC-DISP-008 | Admin resolve dispute nhưng claim annotation quá cũ | Vẫn resolve; system KHÔNG tự re-annotate; nếu `re_annotation_required` → reassign task | High |
| EC-DISP-009 | Dispute rate > 5% (Quality Gate flag) | Notification cho Admin; admin có thể pause project | High |
| EC-DISP-010 | QA flag dispute nhưng cùng claim đã có 1 dispute `status = disputed` khác | VR-DISP-005 chặn; nếu cần force thì admin override (audit) | High |
| EC-DISP-011 | Resolve dispute nhưng quên set `resolved_at` (race) | Validation VR-DISP-010 review trước flush; trigger DB bổ sung nếu cần | Medium |
| EC-DISP-012 | Cron overdue chạy không đúng giờ (delay do infra) | Không block; chỉ delay notification; dispute vẫn còn dữ liệu tốt | Low |

## 12. Export Consolidated Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-EXP-CONS-001 | Project không có claim nào (chưa import) | File vẫn build với header + 1 warning dòng Summary | High |
| EC-EXP-CONS-002 | Filter ngày không có data trùng | File vẫn build; 6 sheet rỗng (header only) + Summary warning "No data in filter range" | Medium |
| EC-EXP-CONS-003 | Filter có 100k+ rows | Generate async (ARQ); poll status; file lớn → chú ý memory trên worker (chunking) | High |
| EC-EXP-CONS-004 | Build fail giữa chừng (OOM, MinIO timeout) | `EXPORT_CONSOLIDATED_REQUEST.status = failed`, `error_detail`, có thể retry; không giữ partial file | High |
| EC-EXP-CONS-005 | User download 2 lần cùng export_id | Cho phép, mỗi request tạo presigned URL mới (TTL 1h) | Medium |
| EC-EXP-CONS-006 | Presigned URL hết hạn khi user đang tải (file rất lớn) | MinIO/S3 hỗ trợ resume; nếu fail → user refresh lại URL | Low |
| EC-EXP-CONS-007 | QA export trong project đó, Admin export toàn platform — 2 request song song | Mỗi request có export_id riêng, chạy ARQ độc lập | Medium |
| EC-EXP-CONS-008 | Annotation bị edit `claim_text_final` sau approved | File export snapshot tại thời điểm build; không auto rebuild | Medium |
| EC-EXP-CONS-009 | Rubric_version thay đổi giữa lúc export build và lúc user tải (`effective_from`) | File ghi `rubric_version` cố định thời điểm request; không trộn | High |
| EC-EXP-CONS-010 | Một claim có nhiều dispute_record (lịch sử) | Sheet `Dispute Log` đưa TẤT CẢ; Sheet `Claim Level` chỉ lấy dispute FINAL resolved (mới nhất resolved hoặc active) | Medium |
| EC-EXP-CONS-011 | Excel mở bị lỗi font tiếng Việt (thiếu BOM) | VR-EXP-CONS-006 enforce BOM; test trên Excel Win/Mac | High |
| EC-EXP-CONS-012 | Annotation_composite null (draft) | Không tính avg; loại khỏi Summary counts | Medium |
| EC-EXP-CONS-013 | `ARTICLE_EVALUATION` thiếu (chưa đánh giá bài) | Sheet `Answer Level` để trống 2 cột rel/comp; warning ở Summary | Medium |
| EC-EXP-CONS-014 | `qa_decision` cuối là `returned` chưa resubmit | Sheet `Claim Level` loại (filter default chỉ approved); nếu admin filter rộng → vẫn kèm status | Medium |
| EC-EXP-CONS-015 | Mapped_source_urls `join` thành chuỗi dài > 32767 chars (Excel cell limit) | Truncate + suffix `...(truncated)`, log warning | Medium |

## 13. Cross-feature Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-XF-001 | Một claim vừa approved (QA), vừa có dispute được tạo đồng thời | UI backend reject (validation); UI frontend disable 1 trong 2 trạng thái | High |
| EC-XF-002 | Admin pause project khi IAA job đang chạy | Job vẫn hoàn tất (đã load data); output vẫn ghi IAA_SCORE cho project (paused). UI dashboard không xem | Medium |
| EC-XF-003 | Notification gửi đến user trong khi họ đang offline | Polling 10s — khi user login/web online → poll thấy ngay | Medium |
| EC-XF-004 | Dispute của annotator A; sau resolve annotator A rời project | Dispute record còn; IAA chỉ tính trên cặp còn active | High |
| EC-XF-005 | Export consolidate chạy trong khi annotation đang submit (pipeline ghi) | Build với snapshot DB tại start của job (transaction isolation) | High |

---

## 14. Còn mở (B-01..05 chưa quyết → có thể thêm edge case)

- **B-01 (Metric IAA):** nếu đổi sang Cohen/Fleiss/ICC sau Sprint 3, sẽ có edge case khác (vd Cohen chỉ 2 annotator; Fleiss 3+).
- **B-02 (Dispute flow scope):** nếu giữ MVP flow, EC-DISP-* không thay đổi; nếu build Full (Policy Analyst) → thêm EC-DISP cho Policy role.
- **B-04 (Polling interval):** nếu đổi interval khác 10s (Doc đã chốt, nhưng giữ mở tham khảo).

---

## 15. Test implications (gợi ý cho QA team)

- Mỗi EC High phải có ít nhất 1 test case (theo convention `User Stories` của Quang).
- Cross-feature EC (EC-XF-001, 003, 005) cần test integration (sprint 4).
- Liên hệ với Nhung/Hưng để add vào `Test Execution Plan` tuần 2.
