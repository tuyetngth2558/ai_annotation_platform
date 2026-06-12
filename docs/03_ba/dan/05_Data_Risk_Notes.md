# 05. Data Risk Notes — PDF-native MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.6  
**Cập nhật:** 2026-06-12  
**Trạng thái:** Active — đã gộp bản Updated, phân tách MVP vs Design-Only

---

## 1. Risk Register

| Risk ID | Risk | Severity | Impact | Mitigation | Owner | Scope |
|---|---|---|---|---|---|---|
| DR-001 | Input chính thức là PDF, không phải CSV/JSON | High | Import CSV/JSON không còn phù hợp | Chuyển MVP sang PDF Bundle Upload | PO/BA/Engineering | MVP |
| DR-002 | PDF parsing có thể lỗi/noise | High | Claim extraction sai | Lưu raw + normalized; parser rules; manual review fallback | Engineering/BA | MVP |
| DR-003 | Source URL có thể không parse được | High | Không mở nguồn trực tiếp bằng URL | Cho `source_url` optional; dùng Source Content PDF/text extract làm evidence chính | BA/Engineering | MVP |
| DR-004 | Source content PDF mapping không rõ | High | LLM/annotator không biết source nào support claim | Dùng source_order/title + manual mapping fallback | BA/QA | MVP |
| DR-005 | Citation markers thiếu/sai | High | Claim-source mapping sai | Flag citation_source_missing; allow manual correction | Engineering/QA | MVP |
| DR-006 | PDF scan/image cần OCR | Medium/High | Parser không lấy text | MVP block OCR-required; OCR full pipeline later | PO/Engineering | MVP gate |
| DR-007 | Build PDF parser làm tăng scope 4 tuần | High | Risk trễ timeline | Parser MVP tối giản: text extraction + regex + LLM assist | PO/Engineering | MVP |
| DR-008 | Export không trace về PDF gốc | High | Không audit lại được | Export bắt buộc có bundle_id/file names/article_code/parent_task_id | BA/Dev | MVP |
| DR-009 | QA chỉ Approve/Return nhưng thực tế muốn sửa điểm | Medium | Schema/UI có thể phải đổi | Chốt scope QA; MVP theo Approve/Return, QA không sửa điểm | PO/QA | MVP |
| DR-010 | Source-dependent scores khi source text unparsed | High | Score thiếu căn cứ | Block pre-scoring hoặc flag source_text_unparsed | BA/ML | MVP |
| DR-011 | Data volume PDF lớn | Medium | Storage/performance | File size limit, async parsing job | DevOps | MVP |
| DR-012 | Stakeholder cần Excel output giống TA mẫu | High | CSV phẳng không đủ nghiệm thu | Build `.xlsx` export với 2 sheet dữ liệu rubric bắt buộc (`Annotation`, `Article Evaluation`); CSV chỉ technical/debug | PO/BA/Dev | MVP |
| DR-013 | REL/COMP bị chấm claim-level trong khi Excel mẫu là article-level | High | Export sai format và sai ý nghĩa rubric | Thêm `article_evaluation`; sheet `Annotation` chỉ có SF/SC/HR/SQ | BA/Dev/QA | MVP |
| DR-014 | Rate limit/block IP khi fetch nhiều source URL | Medium | Không fetch được source | Hạ Source Fetch realtime xuống Post-MVP; MVP không phụ thuộc fetch URL | Engineering | Design-Only |
| DR-015 | Source web thay đổi giữa lúc pre-score và annotator review | Medium | Score không consistency | MVP dùng PDF source text làm evidence chính; fetch cache chỉ Post-MVP | BA/Engineering | Design-Only |
| DR-016 | Context window overflow khi batch claims | Medium | LLM API error khi tối ưu batch | MVP có thể chạy small batch/per-claim; token batching là optional/Post-MVP | Engineering | Design-Only |

---

## 2. Recommendations

### Recommendation 1 — Chọn PDF Bundle Import làm MVP import chính

Portal chưa cung cấp JSON/CSV, vì vậy PDF Bundle Import phản ánh đúng dữ liệu thật hiện tại.

### Recommendation 2 — Không bắt BA chuẩn hóa CSV thủ công

Nếu BA phải convert PDF sang CSV thủ công, MVP chỉ dời công việc thủ công sang trước hệ thống. Hệ thống nên nhận PDF và tự parse ở mức tối thiểu.

### Recommendation 3 — Parser MVP nên tối giản

MVP parser cần đủ để:

- Lấy answer text.
- Lấy metadata cơ bản.
- Lấy source order/title/tier.
- Lấy hyperlink URL nếu PDF expose được.
- Lấy source text từ Source Content PDF nếu parse được.
- Ghi warning nếu thiếu URL, OCR required, mapping unknown.

### Recommendation 4 — Lưu raw PDF và parse result

Không được chỉ lưu normalized text. Cần lưu:

- file PDF gốc
- raw extracted text
- normalized text
- parse warnings
- parser version

### Recommendation 5 — Export Excel là stakeholder deliverable chính

CSV claim-level vẫn hữu ích cho debug/integration, nhưng user-facing Excel export cần là `.xlsx` giống template TA ở 2 sheet dữ liệu rubric:

- `Annotation`
- `Article Evaluation`

Các sheet hỗ trợ như `Scoring Guide`, `Domain-Subdomain List`, `Summary Dashboard` có thể giữ nếu dùng full template.

### Recommendation 6 — Tách REL/COMP khỏi claim-level export

Excel TA mẫu định nghĩa:

- `SF/SC/HR/SQ`: claim-level, sheet `Annotation`.
- `REL/COMP`: article-level, sheet `Article Evaluation`.

Nếu platform vẫn giữ pre-score 6 chiều theo scope cũ, cần ghi rõ đây là platform deviation và export phải map đúng cấu trúc Excel.

### Recommendation 7 — Source Fetch realtime không phải MVP dependency

MVP ưu tiên `source_text_extract` từ Source Content PDF. URL fetch realtime, site-specific parser, relevance filter, token batching/cost tracking là Design-Only/Post-MVP để tránh làm lệch scope 4 tuần.

---

## 3. Open Checks

| ID | Check | Owner |
|---|---|---|
| OR-001 | Dev xác nhận có thể export `.xlsx` giữ sheet/header/formula giống TA mẫu | Engineering |
| OR-002 | BA xác nhận enum fact-check status tiếng Việt không dấu dùng trong Excel | BA/QA |
| OR-003 | QA xác nhận Article Evaluation là bắt buộc trước khi export stakeholder workbook | QA |
