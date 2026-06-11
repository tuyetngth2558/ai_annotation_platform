# 05. Data Risk Notes — PDF-native MVP (Updated)

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.5  
**Cập nhật:** 2026-06-09  
**Trạng thái:** Draft — thêm DR-013..015 cho Source Fetch & LLM Pre-scoring

---

## 1. Risk Register

| Risk ID | Risk | Severity | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| DR-001 | Input chính thức là PDF, không phải CSV/JSON | High | Import CSV/JSON không còn phù hợp | Chuyển MVP sang PDF Bundle Upload | PO/BA/Engineering |
| DR-002 | PDF parsing có thể l�i/noise | High | Claim extraction sai | Lưu raw + normalized; parser rules; manual review fallback | Engineering/BA |
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
| **DR-013** | **Rate limit/block IP khi fetch nhiều source nhanh** | **High** | **Không fetch được source, ảnh hưởng pre-scoring** | **Delay giữa requests, dùng proxy/rotation, retry logic** | **Engineering** |
| **DR-014** | **Source content web có thể thay đổi giữa fetch của LLM và annotator** | **Medium** | **Chênh lệch score, không consistency** | **Cache trong session, khuyến nghị annotator cũng dùng cache cùng session** | **BA/Engineering** |
| **DR-015** | **Context window overflow khi batch claims** | **High** | **LLM không xử lý được, API error** | **Token counting trung gian, split batch nếu vượt 80% context** | **Engineering** |

---

## 2. Khuyến nghị bổ sung (Update)

### Khuyến nghị 6 — Source Fetch nên dùng session cache

Để tối ưu token và tránh rate limit, source text fetch được nên cache trong RAM session (không lưu DB), expire khi pre-scoring batch kết thúc.

### Khuyến nghị 7 — Token counting là bắt buộc trước khi gọi LLM

Đoán chừng không đủ; cần count token chính xác hoặc ước tính conservative trước khi gửi batch đến LLM API.

### Khuyến nghị 8 — Fallback chain rõ ràng

```
Priority 1: Fetch URL realtime (preferred)
Priority 2: source_text_extract từ source_content_pdf (fallback)
Priority 3: Flag source_mapping_required nếu cả 2 đều không có
```

## 3. References

- `06_Source_Fetch_Architecture.md`
- `07_LLM_PreScoring_Spec.md`
