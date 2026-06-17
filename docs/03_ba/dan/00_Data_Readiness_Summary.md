# 00. Data Readiness Summary — PDF-native MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.6  
**Cập nhật:** Input hiện tại là PDF; stakeholder output cần Excel workbook theo mẫu Vivipedia TA.

---

## 1. Kết luận chính

Dữ liệu thực tế hiện tại **không sẵn sàng ở dạng CSV/JSON**, nhưng **có thể sẵn sàng cho MVP nếu platform hỗ trợ import PDF bundle trực tiếp**.

Quy trình đúng cho MVP nên là:

```text
PDF Bundle Upload
→ PDF Parsing / Text Extraction
→ Internal Normalization
→ Claim Extraction
→ LLM Pre-scoring
→ Annotator Review
→ Article Evaluation (REL/COMP cấp bài)
→ QA Review
→ Approve / Return
→ Export Excel workbook (+ optional CSV kỹ thuật)
```

Không nên yêu cầu team phải chuẩn hóa PDF thành CSV/JSON thủ công trước khi đưa vào platform, vì điều đó tạo thêm một workflow ngoài hệ thống và không đúng với thực tế hiện nay.

---

## 2. Dữ liệu PDF hiện tại gồm gì?

Một bài input thực tế gồm các nhóm file:

| Loại file | Bắt buộc? | Mô tả | Ví dụ |
|---|---:|---|---|
| Answer PDF | Yes | PDF chứa câu trả lời/bài viết nguyên bản từ portal | `1(1).pdf`, `2.pdf` |
| Source Reference PDF | Yes | PDF chứa danh sách nguồn tham khảo, source order, title, tier | `1-Ref(1).pdf`, `2-Ref(1).pdf` |
| Source Content PDF | Yes, ít nhất 1 | PDF chứa nội dung nguồn/văn bản gốc để đối chiếu | `1-1(1).pdf`, `2-1.pdf` |

---

## 3. Dữ liệu quan sát được trong PDF

| Data element | Có trong PDF? | Readiness | Ghi chú |
|---|---:|---|---|
| Mã bài / article_code | Có | Green | Ví dụ dạng `ENC_...` |
| Tiêu đề bài | Có | Green | Nằm ở đầu Answer PDF |
| Category / danh mục | Có | Green | Ví dụ Hành chính, Dân sự |
| Tier / tầng bài | Có | Green | Ví dụ T3 |
| Confidence score | Có | Green | Ví dụ 0.10, 0.80 |
| Ngày tạo | Có | Green | Cần normalize date |
| Answer text | Có | Yellow | Có lẫn UI text/noise, cần clean |
| Section headings | Có | Green | Tóm tắt, phân tích, hồ sơ, lưu ý... |
| Citation markers | Có | Green | `[1]`, `[2]`, `[3]` |
| Source order | Có | Green | Từ Source Reference PDF |
| Source title | Có | Green | Từ Source Reference PDF |
| Source tier | Có | Green | Tier 1 / Tier 3 |
| Source URL raw | Không chắc | Yellow/Red | PDF parse có thể chỉ thấy title, không thấy URL |
| Source full text | Có | Yellow | Có trong Source Content PDF, cần parse |
| Claim | Chưa có | Red | Phải sinh bằng Claim Extraction |

---

## 4. Readiness theo pipeline

| Pipeline step | Readiness | Lý do | Action cần làm |
|---|---|---|---|
| PDF Bundle Upload | Yellow/Green | File PDF có sẵn | Cần UI/API upload bundle |
| PDF Parsing | Yellow | Text extract được nhưng có noise | Cần parser + normalization rules |
| Metadata Extraction | Green | Mã bài/title/category/confidence có thể parse | Cần regex/rule ổn định |
| Source List Extraction | Yellow/Green | Có source order/title/tier | Cần schema lưu URL optional |
| Source Content Extraction | Yellow | Source PDF parse được nhưng mapping chưa chắc | Cần source-file mapping |
| Claim Extraction | Yellow | Answer text có thể đưa LLM tách claim | Cần output schema |
| Source Mapping | Yellow | Citation markers giúp map source | Cần validate citation `[n]` ↔ source_order |
| LLM Pre-scoring | Yellow/Green | Có claim + source text sau parse | Cần pre-score schema |
| Annotator Review | Green nếu parse OK | UI review được claim/source/score | Cần source status/note |
| QA Review | Green | MVP chỉ Approve/Return | Cần comment khi Return |
| Export Excel workbook | Yellow/Green | Có mẫu TA rõ sheet/cột; cần mapping DB → Excel | Cần `Annotation` claim-level + `Article Evaluation` article-level |
| Export CSV kỹ thuật | Green | Có thể export claim-level | Cần trace về PDF gốc |

---

## 5. Data Readiness Status

**Status tổng thể:** `Partially Ready`

### Vì sao chưa Fully Ready?

- Input là PDF, không phải structured input.
- Answer PDF có noise từ giao diện portal.
- Source URL có thể không parse được từ PDF.
- Source content PDF có thể không map rõ 1-1 với source reference list.
- Claim chưa được tách sẵn.
- Cần engine PDF parsing/normalization trước Claim Extraction.

### Vì sao vẫn có thể làm MVP?

- PDF chứa đủ answer text và metadata quan trọng.
- Source reference PDF có source order/title/tier.
- Citation markers `[1]`, `[2]` trong answer giúp map claim-source.
- Source content PDF có nội dung nguồn để LLM/annotator kiểm chứng.
- MVP chỉ cần text PDF, chưa cần image/audio/table.

---

## 6. Quyết định đề xuất

| Decision ID | Decision | Lý do |
|---|---|---|
| DRD-001 | MVP import chính là **PDF Bundle Upload** | Đúng với dữ liệu thật hiện tại |
| DRD-002 | Không dùng CSV/JSON làm input chính | Portal chưa cung cấp CSV/JSON |
| DRD-003 | Hệ thống parse PDF thành internal normalized data | Cần cấu trúc để chạy claim extraction/pre-score |
| DRD-004 | Export stakeholder là Excel workbook theo mẫu TA; CSV claim-level là technical/debug export | Khớp nhu cầu nghiệm thu mới |
| DRD-005 | Lưu raw PDF references trong mọi output | Đảm bảo trace/audit |
| DRD-006 | Source URL optional; source_order/title/tier required | Phù hợp thực tế PDF |
| DRD-007 | Citation markers là mapping signal chính | Answer dùng `[1]`, `[2]`, `[3]` |
| DRD-008 | `REL/COMP` là article-level khi export TA | Khớp Excel mẫu: sheet `Article Evaluation` |
| DRD-009 | Source Content PDF là evidence chính; URL là optional reference | Khớp Quang AC PDF-native |

---

## 7. Trạng thái các câu hỏi đã chốt

| ID | Câu hỏi | Trạng thái hiện tại | Ảnh hưởng |
|---|---|---|---|
| OQ-PDF-001 | Một bundle bắt buộc có bao nhiêu file? | Chốt: 1 Answer + 1 Source Ref + >=1 Source Content | Upload validation |
| OQ-PDF-002 | Source Content PDF sẽ upload từng file hay gộp chung nhiều nguồn? | Cho phép >=1 file; mapping bằng `source_order/title/file_ref` | Storage + mapping |
| OQ-PDF-003 | Nếu source URL không parse được, annotator có cần mở nguồn ngoài không? | Chốt: không bắt buộc; dùng `source_text_extract` từ PDF | Source verification |
| OQ-PDF-004 | PDF scan/image có nằm trong MVP không? | Chốt: block import nếu `ocr_required` | OCR scope |
| OQ-PDF-005 | Parser dùng rule-based, LLM extraction, hay hybrid? | MVP: parser tối giản + LLM claim extraction; source fetch realtime Post-MVP | Timeline tuần 1–2 |
