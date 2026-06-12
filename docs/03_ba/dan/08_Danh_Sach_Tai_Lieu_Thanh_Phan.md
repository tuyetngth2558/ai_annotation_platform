# Danh sách Tài liệu Thành phần — PDF-native MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.6  
**Cập nhật:** 2026-06-12  
**Trạng thái:** Active

---

## 1. Danh sách tài liệu trong gói BA của Đan

| # | Tài liệu | Status | Ghi chú |
|---:|---|---|---|
| 00 | `00_Data_Readiness_Summary.md` | Active v0.6 | PDF-native input, Excel workbook output |
| 01 | `01_ERD_MVP_and_Extensible.md` | Active v0.6 | ERD có `ARTICLE_EVALUATION` |
| 02 | `02_Import_Export_Schema.md` | Active v0.6 | Import PDF Bundle, source rule, Excel/CSV export mapping |
| 03 | `03_Validation_Rules.md` | Active v0.6 | MVP validations + Post-MVP rules |
| 04 | `04_Edge_Cases.md` | Active v0.6 | Đã gộp `04_Edge_Cases_Updated.md` |
| 05 | `05_Data_Risk_Notes.md` | Active v0.6 | Đã gộp `05_Data_Risk_Notes_Updated.md` |
| 06 | `06_Data_Dictionary.md` | Active v0.6 | Data dictionary markdown đã đồng bộ entity/field v0.6 |
| 07 | `07_Design_Only_Source_Fetch_and_LLM_Optimization.md` | Design-Only | Gộp Source Fetch, Content Extraction, LLM batching/token optimization |
| 08 | `08_Danh_Sach_Tai_Lieu_Thanh_Phan.md` | Active v0.6 | File index này |

---

## 2. Dependency giữa các tài liệu

```text
00_Data_Readiness_Summary
        ↓
01_ERD_MVP_and_Extensible
        ↓
02_Import_Export_Schema
        ↓
03_Validation_Rules
        ↓
04_Edge_Cases
        ↓
05_Data_Risk_Notes

07_Design_Only_Source_Fetch_and_LLM_Optimization
        ↳ tham chiếu phụ, không phải baseline build MVP
```

---

## 3. Supporting files

| File | Ghi chú |
|---|---|
| `sample_pdf_bundle_manifest.csv` | Manifest upload PDF bundle mẫu |
| `sample_export_claim_level.csv` | CSV technical/debug mẫu, không thay thế Excel workbook |
| `erd_diagram.png` | Image ERD, cần refresh sau khi ERD markdown đổi |

---

## 4. Checklist xác nhận

- [ ] Dan xác nhận `02_Import_Export_Schema.md` đã map đúng Excel TA template.
- [ ] Dev xác nhận export `.xlsx` giữ đúng 5 sheet và header.
- [ ] QA xác nhận `REL/COMP` cấp bài là bắt buộc trước stakeholder export.
- [ ] Team xác nhận Source Fetch realtime là Post-MVP/Design-Only.
- [ ] Render lại `erd_diagram.png` theo ERD markdown v0.6 nếu cần gửi mentor.
