# 05. Data Risk Notes — PDF-native MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.4

---

## 1. Risk Register

| Risk ID | Risk | Severity | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| DR-001 | Input chính thức là PDF, không phải CSV/JSON | High | Import CSV/JSON không còn phù hợp | Chuyển MVP sang PDF Bundle Upload | PO/BA/Engineering |
| DR-002 | PDF parsing có thể lỗi/noise | High | Claim extraction sai | Lưu raw + normalized; parser rules; manual review fallback | Engineering/BA |
| DR-003 | Source URL có thể không parse được | High | Không mở nguồn trực tiếp bằng URL | Cho `source_url` optional; dùng source PDF/text extract | BA/Engineering |
| DR-004 | Source content PDF mapping không rõ | High | LLM/annotator không biết source nào support claim | Dùng source_order/title + manual mapping fallback | BA/QA |
| DR-005 | Citation markers thiếu/sai | High | Claim-source mapping sai | Flag citation_source_missing; allow manual correction | Engineering/QA |
| DR-006 | PDF scan/image cần OCR | Medium/High | Parser không lấy text | MVP reject OCR-required hoặc add OCR later | PO/Engineering |
| DR-007 | Build PDF parser làm tăng scope 4 tuần | High | Risk trễ timeline | Parser MVP tối giản: text extraction + regex + LLM assist | PO/Engineering |
| DR-008 | Export CSV không trace về PDF gốc | High | Không audit lại được | Export bắt buộc có bundle_id/file names/article_code | BA/Dev |
| DR-009 | QA chỉ Approve/Return nhưng thực tế muốn sửa điểm | Medium | Schema/UI có thể phải đổi | Chốt scope QA; MVP theo Approve/Return | PO/QA |
| DR-010 | Source-dependent scores khi source text unparsed | High | Score thiếu căn cứ | Block pre-scoring hoặc flag source_text_unparsed | BA/ML |
| DR-011 | Data volume PDF lớn | Medium | Storage/performance | File size limit, async parsing job | DevOps |
| DR-012 | Stakeholder quen XLSX output | Medium | CSV bị cho là thiếu tiện lợi | CSV MVP, XLSX later; có thể convert ngoài platform | PO/BA |

---

## 2. Recommendation

### Recommendation 1 — Chọn PDF Bundle Import làm MVP import chính

Vì portal chưa cung cấp JSON/CSV, PDF Bundle Import là hướng phản ánh đúng workflow thật.

### Recommendation 2 — Không bắt BA chuẩn hóa CSV thủ công

Nếu BA phải convert PDF → CSV thủ công, MVP chỉ dời công việc thủ công sang trước hệ thống. Hệ thống nên nhận PDF và tự parse ở mức tối thiểu.

### Recommendation 3 — Parser MVP nên tối giản

MVP không cần parser hoàn hảo. Cần đủ để:
- Lấy answer text.
- Lấy metadata cơ bản.
- Lấy source order/title/tier.
- Lấy source text từ source PDF nếu parse được.
- Ghi warning nếu thiếu URL / OCR required / mapping unknown.

### Recommendation 4 — Lưu raw PDF và parse result

Không được chỉ lưu normalized text. Cần lưu cả:
- file PDF gốc
- raw extracted text
- normalized text
- parse warnings
- parser version

### Recommendation 5 — Export CSV phải trace được

CSV claim-level phải có:
- `bundle_id`
- `answer_pdf_filename`
- `source_ref_pdf_filename`
- `source_file_refs`
- `article_code`
- `mapped_source_orders`
