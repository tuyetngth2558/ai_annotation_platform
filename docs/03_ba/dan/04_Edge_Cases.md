# 04. Edge Cases — PDF-ready MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.3

---

## 1. PDF Input / Parsing Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-PDF-001 | Answer PDF có nhiều UI noise từ portal | Lưu `answer_text_raw`; tạo `answer_text_normalized`; flag warning nếu noise cao | High |
| EC-PDF-002 | Answer PDF thiếu mã bài | Tạo internal article code, flag warning | Medium |
| EC-PDF-003 | Answer PDF thiếu confidence score | Set null, không block | Low |
| EC-PDF-004 | Answer PDF không parse được text | Bundle invalid hoặc OCR-required, không tạo parent task | High |
| EC-PDF-005 | PDF bị lỗi encoding tiếng Việt | Flag parsing warning, cần manual correction | Medium |
| EC-PDF-006 | PDF là scan/image | Mark `parse_status = ocr_required`; MVP có thể reject nếu chưa OCR | High |
| EC-PDF-007 | Có nhiều file source content trong một bundle | Lưu nhiều RawInputFile, map sau bằng source_order/source_title | Medium |
| EC-PDF-008 | File bị đặt tên không theo pattern `1`, `1-Ref`, `1-1` | Không dựa hoàn toàn vào filename; cần file_type khi upload/preprocess | Medium |

---

## 2. Source List / Mapping Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-SRC-001 | Source Ref PDF có source title nhưng không có URL | Lưu source_order/title/tier, `source_url = null`, không block nếu có source text/PDF ref | High |
| EC-SRC-002 | Source list có 14 nguồn nhưng answer chỉ cite 1–4 | Lưu full source list; claim mapping chỉ dùng cited sources | Medium |
| EC-SRC-003 | Citation `[5]` xuất hiện nhưng source list không có source 5 | Flag `citation_source_missing`; claim vào source_mapping_required hoặc warning tùy config | High |
| EC-SRC-004 | Source order bị trùng trong source list | Block import/normalization | High |
| EC-SRC-005 | Source content PDF không rõ tương ứng source nào | Mark `source_content_mapping_unknown`; cần manual mapping | High |
| EC-SRC-006 | Same source xuất hiện nhiều lần | Deduplicate optional, nhưng giữ original order để trace | Medium |
| EC-SRC-007 | Source tier thiếu hoặc lạ | Set `unknown`; không block | Low |
| EC-SRC-008 | URL source không truy cập được | Mark inaccessible; note bắt buộc khi annotate; source-related score theo rule | High |

---

## 3. Claim Extraction Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-CE-001 | Answer rất dài, nhiều section | Claim extraction giữ `section_name` nếu có, claim_order toàn bài | Medium |
| EC-CE-002 | Một đoạn có nhiều claim nhưng citation ở cuối | Mỗi claim inherit citation candidates từ đoạn | High |
| EC-CE-003 | Heading/section title bị tách thành claim | Flag low confidence hoặc bỏ qua nếu không phải factual claim | Medium |
| EC-CE-004 | Claim quá nhỏ, thiếu context | Cho phép annotator sửa/gộp trong MVP nếu UI hỗ trợ; nếu không, note issue | Medium |
| EC-CE-005 | Claim quá dài, chứa nhiều ý | Cho phép annotator sửa/tách sau MVP; MVP flag extraction_quality_issue | Medium |
| EC-CE-006 | Claim không có mapped source | Set `source_mapping_required`; không đẩy thẳng sang annotation | High |
| EC-CE-007 | Claim extraction sinh 0 claim | Parent task `extraction_failed`; cần manual review | High |

---

## 4. LLM Pre-scoring Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-LLM-001 | LLM response thiếu một dimension score | Task `pre_scoring_failed`; không đẩy annotator | High |
| EC-LLM-002 | LLM score ngoài 0–1 | Reject/normalize only if rule approved; default reject schema | High |
| EC-LLM-003 | LLM rationale quá dài | Truncate for UI, keep raw response reference | Low |
| EC-LLM-004 | LLM dùng source không nằm trong mapped sources | Flag `unexpected_source_usage` | Medium |
| EC-LLM-005 | LLM API timeout | Retry theo config; fail sau max retries | Medium |

---

## 5. Annotator / QA Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-ANN-001 | Annotator submit thiếu score | Block submit | High |
| EC-ANN-002 | Annotator nhập score `1.234` | Block, báo lỗi max 2 decimals | High |
| EC-ANN-003 | Source inaccessible nhưng không nhập note | Block submit, yêu cầu note `Không truy cập được` | High |
| EC-ANN-004 | Annotator sửa claim text | Lưu original/final và audit log | High |
| EC-QA-001 | QA Return không comment | Block action | High |
| EC-QA-002 | QA Approve task chưa submitted | Block action | High |
| EC-QA-003 | Returned task được submit lại nhiều lần | MVP cho phép, lưu submission version hoặc latest submission | Medium |
| EC-QA-004 | QA muốn sửa trực tiếp score | MVP plan hiện chưa build; log as scope decision needed | Medium |

---

## 6. Export Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-EXP-001 | Export khi chưa có approved claim | Trả CSV header-only hoặc thông báo no data | Medium |
| EC-EXP-002 | Claim approved nhưng thiếu bundle_id | Block export, data integrity error | High |
| EC-EXP-003 | Claim có nhiều source | Join source_order/title/tier bằng delimiter `;` | Medium |
| EC-EXP-004 | Text chứa xuống dòng/dấu phẩy | CSV quote đúng chuẩn UTF-8 | High |
| EC-EXP-005 | Stakeholder cần XLSX như quy trình cũ | MVP export CSV; XLSX là later scope hoặc convert ngoài app | Medium |
