# BA Data Pack — VSF AI Annotation Platform MVP v0.3

**Owner:** Phạm Đan Kha  
**Vai trò:** Lead phần data research  
**Mục tiêu:** Cập nhật bundle theo dữ liệu thực tế hiện tại: input không phải CSV/JSON sạch ngay từ đầu, mà là **PDF bundle** gồm PDF câu trả lời nguyên bản, PDF danh sách nguồn tham khảo, và PDF nội dung nguồn.

## Nội dung package

| File | Mục đích |
|---|---|
| `00_Data_Readiness_Summary.md` | Tóm tắt mức độ sẵn sàng của dữ liệu thật sau khi khảo sát 2 bộ PDF mẫu |
| `01_ERD_MVP_and_Extensible.md` | ERD MVP có bổ sung Raw Input Bundle / Raw Input File để trace về PDF gốc |
| `02_Import_Export_Schema.md` | Schema import/export cập nhật theo PDF bundle → normalized CSV/JSON → export CSV |
| `03_Validation_Rules.md` | Rule validate cho PDF bundle, parsing, claim extraction, source mapping, scoring, QA, export |
| `04_Edge_Cases.md` | Edge cases thực tế theo PDF input và luồng MVP |
| `05_Data_Risk_Notes.md` | Data risks và mitigation notes cho team |
| `06_Data_Dictionary.xlsx` | Data dictionary dạng spreadsheet cho Dev/QA |
| `sample_normalized_import_template.csv` | Template CSV sau khi preprocess PDF bundle |
| `sample_export_claim_level.csv` | Template CSV output claim-level |

## Kết luận chính

Dữ liệu hiện tại **Partially Ready** cho MVP:
- Có đủ answer text, metadata bài, danh sách nguồn, citation markers và một phần nội dung nguồn.
- Nhưng input hiện tại là PDF bundle, chưa phải structured CSV/JSON.
- MVP nên build theo hướng: **PDF bundle → preprocess/normalize thành CSV/JSON → Import → Claim Extraction → Pre-scoring → Annotator Review → QA Review → Export CSV**.
- Data model vẫn cần lưu được raw PDF references để trace ngược về dữ liệu gốc.
