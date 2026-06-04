# 00. Data Readiness Summary — VSF AI Annotation Platform MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.3  
**Ngày cập nhật:** 2026-06-04  
**Mục tiêu:** Đánh giá dữ liệu input thực tế hiện tại có sẵn sàng cho luồng MVP hay không.

---

## 1. Bối cảnh

Quy trình hiện tại đang sử dụng **PDF bundle** làm đầu vào cho quy trình annotation/pre-scoring. Một bộ input thực tế thường gồm:

1. **PDF câu trả lời nguyên bản**: chứa bài viết/câu trả lời do LLM sinh ra trong portal Vivipedia.
2. **PDF danh sách nguồn tham khảo**: chứa danh sách nguồn được đánh số, tiêu đề nguồn, tier nguồn.
3. **PDF nội dung nguồn trích dẫn**: chứa nội dung văn bản pháp luật / nguồn gốc dùng để kiểm chứng.

Quy trình hiện tại:

```text
PDF câu trả lời nguyên bản
+ PDF danh sách nguồn
+ PDF nội dung nguồn
→ LLM Pre-scoring
→ Annotator Review
→ QA Review
→ Approve / Return
→ Export Excel XLSX
```

Quy trình MVP team muốn chuyển sang:

```text
Import
→ Claim Extraction
→ Pre-scoring
→ Annotator Review
→ QA Review
→ Approve / Return
→ Export CSV
```

Vì vậy, điểm cần làm rõ là: **Import trong MVP cần xử lý hoặc nhận dữ liệu đã được chuẩn hóa từ PDF bundle**.

---

## 2. Sample input đã khảo sát

| Bộ mẫu | File câu trả lời | File nguồn / reference | Chủ đề | Quan sát chính |
|---|---|---|---|---|
| Sample 1 | `1(1).pdf` | `1-1(1).pdf`, `1-Ref(1).pdf` | Thanh toán chi phí dự án ODA theo Nghị định 114/2021/NĐ-CP | Có mã bài, danh mục, confidence score, nội dung answer nhiều section, citation markers `[1][3]`, danh sách nguồn có tier |
| Sample 2 | `2.pdf` | `2-1.pdf`, `2-Ref(1).pdf` | Tiêu chuẩn tham gia lực lượng là gì? | Có mã bài, danh mục, confidence score, nội dung answer nhiều section, citation markers `[1][2]`, danh sách nguồn có tier |

---

## 3. Cấu trúc dữ liệu quan sát được từ PDF

| Nhóm dữ liệu | Có trong PDF? | Nguồn trong PDF | Readiness | Ghi chú |
|---|---:|---|---|---|
| Article title | Có | PDF câu trả lời | Green | Có thể parse từ đầu file |
| Article code / Mã bài | Có | PDF câu trả lời | Green | Ví dụ dạng `ENC_...` |
| Category / Danh mục | Có | PDF câu trả lời | Green | Ví dụ Hành chính, Dân sự |
| Tier / Tầng | Có | PDF câu trả lời | Green | Ví dụ T3 |
| Confidence score | Có | PDF câu trả lời | Green | Ví dụ 0.10, 0.80 |
| Created date | Có | PDF câu trả lời | Green | Cần chuẩn hóa date format |
| Answer text | Có | PDF câu trả lời | Yellow | Có lẫn UI text/noise; cần normalize |
| Section headings | Có | PDF câu trả lời | Green | Tóm tắt, phân tích, hồ sơ, lưu ý... |
| Citation markers | Có | PDF câu trả lời | Green | `[1]`, `[2]`, `[3]` dùng để map source |
| Source list | Có | PDF nguồn tham khảo | Green | Có source order và source title |
| Source tier | Có | PDF nguồn tham khảo | Green | Tier 1 / Tier 3 |
| Source URL raw | Chưa chắc | PDF nguồn tham khảo | Yellow/Red | PDF parse hiện thấy title nhiều hơn URL |
| Source full text | Có một phần | PDF nội dung nguồn | Yellow | Có thể parse text, nhưng mapping với source list cần rule |
| Claim | Chưa có | N/A | Red | Phải tách bằng Claim Extraction |
| Existing export | XLSX hiện tại | N/A | N/A | MVP chuyển sang CSV |

---

## 4. Đánh giá readiness theo pipeline MVP

| Pipeline step | Readiness | Lý do | Cần làm thêm |
|---|---|---|---|
| Import | Yellow/Red | Input thực tế là PDF bundle, không phải CSV/JSON sạch | Cần preprocess PDF thành normalized CSV/JSON hoặc build PDF bundle import |
| PDF parsing | Yellow | Text extract được, nhưng có UI noise từ portal | Cần normalize answer text, loại bỏ navigation/footer |
| Metadata extraction | Green | Mã bài, danh mục, confidence score, ngày tạo có trong PDF | Cần rule parse ổn định |
| Source list extraction | Yellow/Green | Source order/title/tier có trong PDF nguồn tham khảo | Cần kiểm tra URL có parse được không |
| Source content extraction | Yellow | PDF nguồn có nội dung văn bản | Cần mapping source_content ↔ source_order |
| Claim Extraction | Yellow | Answer có nhiều section và citation markers | Cần output schema rõ, cho phép sửa claim |
| Source Mapping | Yellow | Citation markers giúp map claim → source | Cần xử lý case citation thiếu/sai |
| LLM Pre-scoring | Yellow/Green | Có đủ answer + source để chấm | Cần schema pre-score chuẩn |
| Annotator Review | Green nếu normalize xong | UI có thể hiển thị claim/source/score | Cần source mapping đủ rõ |
| QA Review | Green | MVP chỉ Approve/Return | Cần comment required khi Return |
| Export CSV | Green | Có thể xuất claim-level | Cần giữ bundle_id/article_code để trace |

---

## 5. Kết luận readiness

**Kết luận:** dữ liệu hiện tại **Partially Ready** cho MVP.

### Lý do dữ liệu chưa Fully Ready

- Input thật đang là PDF bundle, chưa phải CSV/JSON structured.
- PDF câu trả lời có lẫn metadata và UI text từ portal.
- Source list có source order/title/tier, nhưng URL raw có thể không parse được đầy đủ.
- Source content PDF có thể không map trực tiếp 1-1 với source list nếu thiếu URL/reference.
- Claim chưa được tách sẵn.
- Citation markers là tín hiệu tốt, nhưng cần rule mapping rõ.

### Điều kiện để dữ liệu đạt Ready cho MVP

1. Chốt chiến lược import:
   - MVP build nhanh: preprocess PDF thành CSV/JSON rồi import.
   - Future: platform upload PDF bundle trực tiếp.
2. Có normalized import template chứa:
   - `bundle_id`
   - `article_code`
   - `title`
   - `answer_text_normalized`
   - `source_list_json`
   - `raw_pdf_file_refs`
3. Có rule parse/normalize cho:
   - metadata
   - answer text
   - source list
   - citation markers
4. Có rule xử lý:
   - source thiếu URL
   - source PDF không parse được
   - citation marker không map được source
5. Export CSV phải giữ trace ngược về PDF gốc:
   - `bundle_id`
   - `article_code`
   - `source_order`
   - `source_tier`
   - `raw_file_refs`

---

## 6. Recommendation cho MVP

### Recommendation chính

Trong 4 tuần MVP, nên chọn hướng:

```text
PDF bundle
→ manual/semi-automated preprocessing
→ normalized CSV/JSON
→ platform import
→ claim extraction
→ pre-scoring
→ annotator review
→ QA review
→ export CSV
```

Không nên bắt dev build full PDF parser/upload bundle ngay trong MVP nếu timeline chỉ 4 tuần. Tuy nhiên, **data model phải lưu được raw PDF references** để sau này mở rộng thành PDF bundle import thật.

### Vì sao?

- Giảm rủi ro build import/parser trong 4 tuần.
- Vẫn phản ánh đúng dữ liệu thực tế hiện nay.
- Dev có input structured để build nhanh.
- QA có sample CSV để test.
- Sau MVP có thể thay preprocessing thủ công bằng parser tự động mà không đổi pipeline chính.

---

## 7. Cần chốt với team

| ID | Câu hỏi | Owner | Ảnh hưởng |
|---|---|---|---|
| DRS-Q01 | MVP build PDF upload trực tiếp hay chỉ import normalized CSV/JSON? | PO / Engineering | Scope tuần 1–2 |
| DRS-Q02 | Ai chịu trách nhiệm preprocess PDF thành CSV mẫu trong MVP? | BA / Data / Engineering | Test data |
| DRS-Q03 | Source URL raw có bắt buộc không nếu PDF source list chỉ có title/tier? | PO / QA | Source verification |
| DRS-Q04 | Source content PDF có bắt buộc map 1-1 với source_order không? | PO / Engineering | Pre-scoring quality |
| DRS-Q05 | Citation marker `[n]` không map được source `n` thì block hay warning? | PO / QA | Validation |
