# 04. Edge Cases — PDF-native MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.6  
**Cập nhật:** 2026-06-12  
**Trạng thái:** Active — đã gộp bản Updated, Source Fetch hạ xuống Post-MVP

---

## 1. PDF Bundle Upload Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-UP-001 | Bundle thiếu answer PDF | Block upload/import | High |
| EC-UP-002 | Bundle thiếu source reference PDF | Block upload/import | High |
| EC-UP-003 | Bundle không có source content PDF | Block upload/import theo VR-UP-003 | High |
| EC-UP-004 | Có nhiều answer PDF trong 1 bundle | Block, yêu cầu đúng 1 `answer_pdf` | High |
| EC-UP-005 | File đặt tên không theo pattern | Không phụ thuộc filename; user phải chọn `file_role` | Medium |
| EC-UP-006 | PDF quá lớn | Block nếu vượt max size cấu hình | Medium |
| EC-UP-007 | PDF lỗi/corrupt | Block file, bundle invalid | High |
| EC-UP-008 | PDF scan/image cần OCR | Block import vì OCR full pipeline ngoài scope MVP | High |

---

## 2. PDF Parsing Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-PARSE-001 | Answer PDF có UI noise từ portal | Lưu raw text, clean normalized text | High |
| EC-PARSE-002 | Không parse được article_code | Generate internal article_code, warning | Medium |
| EC-PARSE-003 | Không parse được confidence score | Set null, không block | Low |
| EC-PARSE-004 | Text tiếng Việt lỗi encoding | Flag warning, cần manual correction nếu ảnh hưởng claim | Medium |
| EC-PARSE-005 | Section heading bị lẫn với content | Parser giữ heading nếu detect được; claim extraction dùng `section_name` | Medium |
| EC-PARSE-006 | Answer PDF quá dài | Parse vẫn OK; claim extraction chunk theo section | Medium |
| EC-PARSE-007 | Không parse được article URL/domain/sub-domain | Cho import nếu answer text OK; export Excel cần user/admin bổ sung trước khi xuất | Medium |

---

## 3. Source Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-SRC-001 | Source Ref PDF chỉ có title/tier, không có URL | Lưu `source_url = null`; dùng `source_text_extract` từ Source Content PDF | High |
| EC-SRC-002 | Citation `[5]` nhưng không có `source_order = 5` | Flag `citation_source_missing`; claim vào `source_mapping_required` nếu không có source candidate | High |
| EC-SRC-003 | Source list có nhiều nguồn không được cite | Lưu full list; chỉ map claim với cited/candidate source | Medium |
| EC-SRC-004 | Source content PDF không map rõ source nào | Mark `mapping_unknown`; cần manual mapping trước annotation queue | High |
| EC-SRC-005 | Source content PDF parse fail | `source_parse_status = unparsed`; annotator note bắt buộc nếu vẫn submit | High |
| EC-SRC-006 | Same source title lặp lại | Giữ original `source_order`; optional deduplicate later | Medium |
| EC-SRC-007 | Source tier không rõ | Set `unknown` | Low |
| EC-SRC-008 | Có URL hyperlink nhưng source content PDF cũng parse được | Dùng PDF text làm evidence chính; URL chỉ hiển thị tham khảo | High |
| EC-SRC-009 | URL hỏng/không truy cập nhưng PDF source text parse được | Không block; `source_access_status = source_text_parsed` nếu annotator đối chiếu được PDF text | Medium |
| EC-SRC-010 | Không có PDF text và URL cũng không dùng được | `source_access_status = inaccessible`, lock `SC = 0.00`, note bắt buộc | High |

---

## 4. Claim Extraction Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-CE-001 | Một paragraph chứa nhiều claim và citation cuối đoạn | Tách nhiều claim, inherit citation candidates | High |
| EC-CE-002 | Heading bị tách thành claim | Flag low confidence hoặc bỏ qua | Medium |
| EC-CE-003 | Claim quá dài | Cho annotator sửa `claim_text_final`; flag extraction quality issue | Medium |
| EC-CE-004 | Claim quá ngắn/thiếu context | Cho annotator sửa; keep parent answer context | Medium |
| EC-CE-005 | Không sinh được claim | Parent task `extraction_failed` | High |
| EC-CE-006 | Claim không map được source | Claim status `source_mapping_required` | High |

---

## 5. LLM Pre-scoring Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-LLM-001 | LLM output thiếu claim-level metric `SF/SC/HR/SQ` | `pre_scoring_failed` | High |
| EC-LLM-002 | LLM score ngoài 0–1 | Reject schema | High |
| EC-LLM-003 | LLM dùng source không nằm trong mapped source | Flag `unexpected_source_usage` | Medium |
| EC-LLM-004 | LLM timeout | Retry theo worker policy; fail after max retries | Medium |
| EC-LLM-005 | Source text unparsed nhưng LLM vẫn cần score | Prefer block pre-scoring hoặc flag `source_text_unparsed` | High |
| EC-LLM-006 | Batch size vượt context window | Post-MVP batching: split batch; MVP có thể xử lý per claim hoặc per small batch | Medium |
| EC-LLM-007 | Duplicate source trong cùng batch | Post-MVP batching: deduplicate trong prompt | Low |

---

## 6. Article Evaluation Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-ART-001 | Article đã có claim scores nhưng chưa có REL/COMP | Không export Excel stakeholder; yêu cầu hoàn tất `Article Evaluation` | High |
| EC-ART-002 | REL/COMP bị nhập ở claim-level | Không map vào sheet `Annotation`; chuyển/aggregate sang `Article Evaluation` hoặc ghi platform deviation | High |
| EC-ART-003 | Một bài có nhiều parent task trùng title | Dùng `parent_task_id`/`bundle_id` để phân biệt khi export | Medium |
| EC-ART-004 | Thiếu domain/sub-domain/subdomain_id | Export Excel vẫn có thể chạy nếu domain/sub-domain được bổ sung thủ công; flag warning | Medium |

---

## 7. Annotator / QA Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-ANN-001 | Annotator submit thiếu score | Block | High |
| EC-ANN-002 | Score có >2 decimals | Block | High |
| EC-ANN-003 | Source unparsed/inaccessible nhưng không note | Block | High |
| EC-ANN-004 | Annotator sửa claim text | Save before/after + audit | High |
| EC-ANN-005 | Fact-check status không thuộc enum | Block | High |
| EC-QA-001 | QA Return không comment | Block | High |
| EC-QA-002 | QA Return thiếu error category | Block | High |
| EC-QA-003 | QA muốn sửa trực tiếp score | Not MVP unless PO approves scope change | Medium |
| EC-QA-004 | Returned task resubmit | Keep submission history or latest + audit | Medium |

---

## 8. Export Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-EXP-001 | No approved claims | Header-only CSV hoặc no data message; Excel stakeholder export nên báo không có dữ liệu | Medium |
| EC-EXP-002 | Claim thiếu `bundle_id` | Block export | High |
| EC-EXP-003 | Claim có nhiều sources | Join with delimiter `;` trong CSV/Excel source URL column | Medium |
| EC-EXP-004 | Text có newline/comma/quotes | CSV quoting UTF-8 chuẩn; Excel giữ wrap text | High |
| EC-EXP-005 | Stakeholder cần workbook giống TA mẫu | Export `.xlsx` với 5 sheet chuẩn, không chỉ CSV | High |
| EC-EXP-006 | Excel thiếu `Article Evaluation` | Block stakeholder export vì REL/COMP cấp bài không đủ | High |

---

## 9. Source Fetch Edge Cases — Post-MVP / Design-Only

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-FETCH-001 | URL return 404/403 | Post-MVP: log error; fallback sang `source_content_pdf` nếu có | Medium |
| EC-FETCH-002 | URL redirect 301/302 | Post-MVP: follow redirect max 5 hops | Low |
| EC-FETCH-003 | Page là PDF inline/embed | Post-MVP: detect Content-Type and extract text; trace riêng | Medium |
| EC-FETCH-004 | Connection timeout | Post-MVP: retry 3 lần với exponential backoff | Low |
| EC-FETCH-005 | Source text quá dài | Post-MVP: relevance filter/split chunks | Medium |
| EC-FETCH-006 | Source là HTML có link tải PDF | Post-MVP: parse HTML trước, sau đó fetch PDF link nếu cần | Low |
| EC-FETCH-007 | Fetch trùng source_url cho nhiều claims | Post-MVP: cache theo job/session | Low |
| EC-FETCH-008 | Domain đặc biệt như chinhphu.vn, thuvienphapluat.vn | Post-MVP: dùng site-specific parser nếu bật fetch | Low |
