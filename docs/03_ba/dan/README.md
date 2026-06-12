# BA Data Pack — VSF AI Annotation Platform MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.6  
**Cập nhật:** 2026-06-12  
**Baseline:** PDF-native import · Excel TA export · Quang/Tuyết PDF-native v1.2

---

## 1. Quyết định thiết kế hiện tại

MVP dùng **PDF Bundle Import** làm input chính:

```text
PDF Bundle Upload
→ PDF Parsing / Text Extraction
→ Internal Normalization
→ Claim Extraction (LLM #1)
→ Source Mapping
→ LLM Pre-scoring (LLM #2)
→ Annotator Review
→ Article Evaluation
→ QA Review 100%
→ Result consumption: in-tool dashboard, Excel workbook export, optional CSV technical export
```

Không có CSV/JSON user-facing import trong MVP.

---

## 2. Những thay đổi quan trọng ở v0.6

1. Đã gộp các file `_Updated` vào file chính:
   - `04_Edge_Cases_Updated.md` → `04_Edge_Cases.md`
   - `05_Data_Risk_Notes_Updated.md` → `05_Data_Risk_Notes.md`
2. Đã gộp các tài liệu Source Fetch/LLM optimization thành một file Design-Only:
   - `06_Source_Fetch_Architecture.md`
   - `07_LLM_PreScoring_Spec.md`
   - `09_Source_Content_Extraction_Strategy.md`
   - → `07_Design_Only_Source_Fetch_and_LLM_Optimization.md`
3. Đã sửa `02_Import_Export_Schema.md` để export được Excel theo mẫu `[Vivipedia] - Annonate Output - TA - 13.5.xlsx`.
4. Đã tách `REL/COMP` thành `Article Evaluation` cấp bài. Sheet `Annotation` chỉ chứa 4 metric claim-level: `SF/SC/HR/SQ`.
5. Đã thống nhất source rule: `source_text_extract` từ Source Content PDF là evidence chính; hyperlink URL trong Source Ref PDF là optional reference.

---

## 3. Giải thích nhận xét review

| Nhận xét | Ý nghĩa | Đã chỉnh ở đâu |
|---|---|---|
| “Chốt rubric mapping Vivipedia: cột TA A–R ↔ field platform ↔ output/export” | Cần bảng mapping rõ từ workbook mẫu sang DB/export để Dev không đoán cột Excel | `02_Import_Export_Schema.md` §12/§13 |
| “Sửa 02 export: tách article_evaluation (Rel/Comp) hoặc ghi rõ platform deviation” | Excel mẫu chấm `REL/COMP` theo bài, không theo claim. Nếu platform vẫn chấm 6 chiều claim-level thì đó là deviation khi export | `01_ERD...`, `02...` §12, `03...` VR-ART |
| “Thống nhất nguồn: Ref hyperlink URL vs source content PDF” | Phải chốt nguồn nào là evidence chính. MVP dùng Source Content PDF; URL chỉ optional link | `02...` §4, `03...` VR-SRC-009, `04...` EC-SRC |
| “Hạ 06/07/09 xuống Design-Only; VR-FETCH/VR-LLM-006/007 → Post-MVP/optional” | Source fetch realtime, site parser, relevance filter, token batching không phải must-have trong MVP 4 tuần | `07_Design_Only...`, `03...` §10 |

---

## 4. Files active trong package

| Thứ tự | File | Mục đích | Trạng thái |
|---:|---|---|---|
| 00 | `00_Data_Readiness_Summary.md` | Tóm tắt readiness, quyết định PDF-native, Excel output | Active v0.6 |
| 01 | `01_ERD_MVP_and_Extensible.md` | ERD/data model, có `ARTICLE_EVALUATION` | Active v0.6 |
| 02 | `02_Import_Export_Schema.md` | Import schema, source rule, Excel/CSV export mapping | Active v0.6 |
| 03 | `03_Validation_Rules.md` | Validation MVP + Post-MVP rules | Active v0.6 |
| 04 | `04_Edge_Cases.md` | Edge cases đã gộp bản updated | Active v0.6 |
| 05 | `05_Data_Risk_Notes.md` | Risk register đã gộp bản updated | Active v0.6 |
| 06 | `06_Data_Dictionary.md` | Data dictionary markdown cho Dev/QA | Active v0.6 |
| 07 | `07_Design_Only_Source_Fetch_and_LLM_Optimization.md` | Source fetch/relevance/batching Post-MVP | Design-Only |
| 08 | `08_Danh_Sach_Tai_Lieu_Thanh_Phan.md` | Index nội bộ package | Active v0.6 |

Supporting files:

| File | Mục đích |
|---|---|
| `sample_pdf_bundle_manifest.csv` | Manifest mẫu cho batch upload nhiều PDF bundle |
| `sample_export_claim_level.csv` | CSV kỹ thuật mẫu, không phải stakeholder workbook |
| `erd_diagram.png` | ERD image export, cần refresh nếu ERD markdown đã đổi |

---

## 5. Quy tắc output/export hiện tại

Database/Supabase là source of truth cho dữ liệu đã parse, normalize, chấm điểm và QA. Người dùng cuối có thể xem hoặc lấy kết quả qua nhiều output format:

- Dashboard/report trong tool: đọc trực tiếp từ DB, không phải export file.
- Excel workbook `.xlsx`: user-facing export để gửi stakeholder, cần giống template TA ở phần dữ liệu chính.
- CSV claim-level: technical/debug/integration export, không thay thế Excel workbook.

Excel workbook cần tách ít nhất 2 sheet dữ liệu rubric:

- `Annotation`: 1 row = 1 claim; export `SF`, `SC`, `HR`, `SQ`.
- `Article Evaluation`: 1 row = 1 article/parent task; export `REL`, `COMP`.

Các sheet hỗ trợ như `Scoring Guide`, `Domain-Subdomain List`, `Summary Dashboard` có thể giữ theo template nếu cần phát hành workbook đầy đủ; tuy nhiên rule bắt buộc để thống nhất rubric là không trộn `REL/COMP` vào sheet claim-level.

---

## 6. Việc còn cần đồng bộ

- Quang/Tuyết đã đổi wording theo hướng "output từ DB gồm dashboard, Excel workbook và optional CSV technical".
- Màn Export cần cho chọn format `Excel workbook (.xlsx)` và `CSV claim-level`.
- Rubric UI có thể hiển thị/pre-score 6 chiều, nhưng Excel TA export phải tách `SF/SC/HR/SQ` ở `Annotation` và `REL/COMP` ở `Article Evaluation`.

