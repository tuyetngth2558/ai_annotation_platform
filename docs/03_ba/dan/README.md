# BA Data Pack — VSF AI Annotation Platform MVP v0.4

**Owner:** Phạm Đan Kha  
**Vai trò:** Lead phần data research  
**Cập nhật quan trọng:** Input chính thức của MVP hiện tại là **PDF**, chưa thể lấy CSV/JSON từ portal.

## Quyết định thiết kế v0.4

MVP nên chuyển từ hướng “CSV/JSON import” sang hướng **PDF Bundle Import**:

```text
PDF Bundle Upload
→ PDF Parsing / Text Extraction
→ Internal Normalization
→ Claim Extraction
→ LLM Pre-scoring
→ Annotator Review
→ QA Review
→ Approve / Return
→ Export CSV
```

### Có cần parse PDF sang CSV/JSON không?

**Không nên yêu cầu người dùng/BA phải parse thủ công sang CSV/JSON trước khi import.**  
Vì sếp đã xác nhận hiện tại không lấy được input JSON/CSV từ portal, nếu tiếp tục yêu cầu CSV/JSON thì MVP sẽ không phản ánh workflow thật.

Tuy nhiên, hệ thống **vẫn phải parse PDF thành dữ liệu có cấu trúc nội bộ** để lưu DB và chạy pipeline. Nghĩa là:

- Không cần **user-facing CSV/JSON import** làm luồng chính.
- Cần **internal normalized data model** sau bước parse PDF.
- Export cuối vẫn là **CSV claim-level** theo scope MVP.

## Files trong package

| File | Mục đích |
|---|---|
| `00_Data_Readiness_Summary.md` | Tóm tắt readiness mới: input là PDF-native |
| `01_ERD_MVP_and_Extensible.md` | ERD mới cho PDF Bundle Import |
| `02_Import_Export_Schema.md` | Schema import PDF bundle, internal normalized schema, export CSV |
| `03_Validation_Rules.md` | Validation rules cho upload PDF, parse, source mapping, scoring, QA, export |
| `04_Edge_Cases.md` | Edge cases cho PDF-native workflow |
| `05_Data_Risk_Notes.md` | Data risk notes và mitigation |
| `06_Data_Dictionary.xlsx` | Data dictionary đầy đủ cho Dev/QA |
| `sample_pdf_bundle_manifest.csv` | Manifest mẫu cho batch upload nhiều bundle PDF |
| `sample_export_claim_level.csv` | CSV output mẫu claim-level |
