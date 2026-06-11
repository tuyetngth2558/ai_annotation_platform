# Danh sách Tài liệu Thành phần — PDF-native MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.5  
**Cập nhật:** 2026-06-09  
**Trạng thái:** Active

---

## Danh sách tài liệu trong gói BA của Dan

| # | Tên tài liệu | Status | Ngày cập nhật | Owner | Ghi chú |
|---|---|---|---|---|---|
| 1 | `00_Data_Readiness_Summary.md` | ✅ Stable | 2026-05-15 | Dan | Tổng quan data readiness |
| 2 | `01_ERD_MVP_and_Extensible.md` | ✅ Stable | 2026-06-09 | Dan | Entity Relationship Diagram |
| 3 | `02_Import_Export_Schema.md` | ✅ Stable | 2026-06-09 | Dan | Import (PDF Bundle) + Export (CSV) schema |
| 4 | `03_Validation_Rules.md` | ✅ Updated | 2026-06-09 | Dan | Thêm VR-FETCH-001..005, VR-LLM-006..007 |
| 5 | `04_Edge_Cases.md` | ✅ Updated | 2026-06-09 | Dan | Thêm EC-FETCH-001..008, EC-LLM-006..007 |
| 6 | `05_Data_Risk_Notes.md` | ✅ Updated | 2026-06-09 | Dan | Thêm DR-013..015 |
| 7 | `06_Source_Fetch_Architecture.md` | 🆕 New | 2026-06-09 | Dan | Kiến trúc fetch URL real-time |
| 8 | `07_LLM_PreScoring_Spec.md` | 🆕 New | 2026-06-09 | Dan | Prompt engineering, batching, token optimization |
| 9 | `08_Danh_Sach_Tai_Lieu_Thanh_Phan.md` | 🆕 New | 2026-06-09 | Dan | File này — index docs |

---

## Dependencies giữa các tài liệu

```
00_Data_Readiness_Summary
        ↓
01_ERD_MVP_and_Extensible
        ↓
02_Import_Export_Schema ←→ 06_Source_Fetch_Architecture
        ↓                           ↓
03_Validation_Rules ←──────→ 07_LLM_PreScoring_Spec
        ↓                           ↓
04_Edge_Cases ←────────────→ LLM Pre-scoring Service
        ↓
05_Data_Risk_Notes
```

---

## Xác nhận từ BA Owner

- [ ] Dan xác nhận `03_Validation_Rules.md` đã đầy đủ
- [ ] Dan xác nhận `04_Edge_Cases.md` đã đầy đủ
- [ ] Dan xác nhận `05_Data_Risk_Notes.md` đã đầy đủ
- [ ] Dan xác nhận `06_Source_Fetch_Architecture.md` ngay chính xác với yêu cầu kỹ thuật
- [ ] Dan xác nhận `07_LLM_PreScoring_Spec.md` phù hợp với workflow LLM
- [ ] Reviewer xác nhận không còn điểm mù
