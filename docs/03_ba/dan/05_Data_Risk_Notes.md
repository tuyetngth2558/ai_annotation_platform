# 05. Data Risk Notes — VSF AI Annotation Platform MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.3  
**Mục tiêu:** Ghi nhận rủi ro dữ liệu sau khi khảo sát input PDF thực tế.

---

## 1. Risk Register

| Risk ID | Risk | Severity | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| DR-001 | Input thực tế là PDF bundle, không phải CSV/JSON structured | High | Nếu dev chỉ build CSV import, dữ liệu thật chưa vào được platform | MVP preprocess PDF → normalized CSV/JSON; future build PDF bundle import | BA / Engineering |
| DR-002 | Portal PDF có nhiều UI noise | High | Claim extraction có thể lấy nhầm text navigation/footer | Lưu raw + normalized text; define cleaning rules | BA / Data |
| DR-003 | Source list có title/tier nhưng có thể thiếu URL raw | High | Source verification khó nếu UI cần mở URL | Schema cho phép `source_url = null`; dùng source_order/title/source PDF ref | BA / PO |
| DR-004 | Source content PDF không map rõ với source_order | High | LLM pre-scoring có thể dùng sai nguồn | Cần source_content mapping rule/manual mapping | BA / Engineering |
| DR-005 | Mapping claim → source phụ thuộc citation markers | High | Citation thiếu/sai làm score kém chính xác | Lưu citation markers; flag missing mapping; cho annotator sửa | BA / QA |
| DR-006 | Claim extraction sai granularity | High | Annotator khó review, QA khó kiểm soát | Cho phép sửa claim text; log extraction confidence | BA / Dev |
| DR-007 | PDF scan/image không extract được text | Medium/High | Block import/pre-scoring | Mark OCR-required; MVP reject hoặc manual OCR | Engineering |
| DR-008 | Export CSV mất trace về PDF gốc | High | Không audit lại được | Export bắt buộc có bundle_id/article_code/source_order | BA / Dev |
| DR-009 | Current workflow export XLSX, MVP export CSV | Medium | Stakeholder quen XLSX có thể phản hồi | Chuẩn bị sample CSV; nếu cần convert CSV → XLSX outside app | PO / BA |
| DR-010 | Source inaccessible rule chưa chốt đủ | Medium | Inconsistent score giữa annotator | Chốt rule SC/SF/SQ khi inaccessible | PO / QA |
| DR-011 | QA direct score edit chưa chốt | Medium | Data model/export có thể lệch | MVP theo Approve/Return; mở question nếu cần | PO / QA |
| DR-012 | Không có đủ sample data đa dạng | Medium | Validation rules thiếu case thực tế | Cần thêm 10–20 bundles sample | PO / BA |

---

## 2. Key recommendation

### Recommendation 1 — Không build PDF parser full trong 4 tuần nếu chưa đủ nguồn lực

MVP nên xử lý theo hướng:

```text
PDF bundle → normalized CSV/JSON → platform import
```

Việc parse PDF trực tiếp có thể design nhưng chưa build.

### Recommendation 2 — Vẫn phải lưu raw PDF references

Dù import vào platform bằng CSV/JSON, các field sau phải tồn tại:

- `bundle_id`
- `raw_file_refs_json`
- `article_code`
- `source_order`
- `source_file_ref`
- `answer_reference`

### Recommendation 3 — Claim/source mapping phải dựa trên citation markers

Citation markers `[1]`, `[2]`, `[3]` là cầu nối quan trọng nhất giữa answer và source list. Cần lưu cả markers gốc và mapping result.

---

## 3. Data readiness status

| Area | Status | Ghi chú |
|---|---|---|
| Answer content | Yellow/Green | Có đủ text, cần normalize |
| Metadata | Green | Có mã bài, category, tier, confidence |
| Source list | Yellow/Green | Có order/title/tier, URL chưa chắc |
| Source content | Yellow | Có PDF nguồn, mapping cần rõ |
| Claim extraction | Yellow | Chưa có claim, cần LLM/pipeline |
| Import MVP | Yellow/Red | Cần normalized CSV/JSON |
| Export CSV | Green | Có thể thiết kế ổn nếu trace fields đầy đủ |
