# 04. Edge Cases — PDF-native MVP (Updated)

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.5  
**Cập nhật:** 2026-06-09  
**Trạng thái:** Draft — thêm EC-FETCH cho Source Fetch Service

---

## 1. PDF Bundle Upload Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-UP-001 | Bundle thiếu answer PDF | Block upload/import | High |
| EC-UP-002 | Bundle thiếu source reference PDF | Block upload/import | High |
| EC-UP-003 | Bundle không có source content PDF | Block hoặc allow with warning tùy quyết định PO; đề xuất block | High |
| EC-UP-004 | Có nhiều answer PDF trong 1 bundle | Block, yêu cầu chọn đúng 1 answer PDF | High |
| EC-UP-005 | File đặt tên không theo pattern | Không phụ thuộc filename; user phải chọn file_role | Medium |
| EC-UP-006 | PDF quá lớn | Block nếu vượt max size | Medium |
| EC-UP-007 | PDF lỗi/corrupt | Block file, bundle invalid | High |

---

## 2. PDF Parsing Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-PARSE-001 | Answer PDF có UI noise từ portal | Lưu raw text, clean normalized text | High |
| EC-PARSE-002 | Không parse được article_code | Generate internal article code, warning | Medium |
| EC-PARSE-003 | Không parse được confidence score | Set null, không block | Low |
| EC-PARSE-004 | PDF là scan/image | Mark OCR required; MVP có thể reject nếu chưa OCR | High |
| EC-PARSE-005 | Text tiếng Việt lỗi encoding | Flag warning, cần manual correction | Medium |
| EC-PARSE-006 | Section heading bị lẫn với content | Parser giữ heading nếu detect được; claim extraction dùng section_name | Medium |
| EC-PARSE-007 | Answer PDF quá dài | Parse vẫn OK; claim extraction chunk theo section | Medium |

---

## 3. Source Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-SRC-001 | Source Ref PDF chỉ có title/tier, không có URL | Lưu source_url null; dùng source_file/source_text nếu có | High |
| EC-SRC-002 | Citation `[5]` nhưng không có source_order 5 | Flag citation_source_missing | High |
| EC-SRC-003 | Source list có nhiều nguồn không được cite | Lưu full list; chỉ map claim với cited source | Medium |
| EC-SRC-004 | Source content PDF không map rõ source nào | Mark mapping_unknown, cần manual mapping | High |
| EC-S有责任005 | Source content PDF parse fail | source_parse_status = unparsed | High |
| EC-SRC-006 | Same source title lặp lại | Giữ original order, optional deduplicate later | Medium |
| EC-SRC-007 | Source tier không rõ | Set unknown | Low |
| EC-SRC-008 | Nguồn là trang cần login/paywall | access_status = inaccessible/restricted; note required | Medium |

---

## 4. Claim Extraction Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-CE-001 | Một paragraph chứa nhiều claim và citation cuối đoạn | Tách nhiều claim, inherit citation candidates | High |
| EC-CE-002 | Heading bị tách thành claim | Flag low confidence hoặc bỏ qua | Medium |
| EC-CE-003 | Claim quá dài | Cho annotator sửa claim text; flag extraction_quality_issue | Medium |
| EC-CE-004 | Claim quá ngắn/thiếu context | Cho annotator sửa; keep parent context | Medium |
| EC-CE-005 | Không sinh được claim | Parent task extraction_failed | High |
| EC-CE-006 | Claim không map được source | status source_mapping_required | High |

---

## 5. Source Fetch Edge Cases (NEW)

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-FETCH-001 | URL return 404 / 403 Not Found | Log error; fallback sang `source_content_pdf` nếu có | High |
| EC-FETCH-002 | URL redirect (301/302) | Follow redirect (max 5 hops); nếu vẫn fail thì fallback | Medium |
| EC-FETCH-003 | Page là PDF inline / embed | Detect Content-Type; nếu `application/pdf` thì extract text | High |
| EC-FETCH-004 | Connection timeout (>10s) | Retry 3 lần với exponential backoff; sau đó fallback | High |
| EC-FETCH-005 | Source text quá dài (>50K chars) | Truncate đến đoạn relevant (nếu detect được); nếu không thì split | High |
| EC-FETCH-006 | Source là trang HTML nhưng có nút "Tải PDF" | Parse HTML trước; nếu content < 100 chars thì tìm link PDF và fetch | Medium |
| EC-FETCH-007 | Fetch trùng lặp (cùng source_url cho nhiều claims) | Cache hit; trả về từ SourceFetchCache | Medium |
| EC-FETCH-008 | Domain đặc biệt (chinhphu.vn, thuvienphapluat.vn) | Sử dụng parser riêng nếu cần; cập nhật whitelist | Medium |

---

## 6. LLM Pre-scoring Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-LLM-001 | LLM output thiếu dimension | pre_scoring_failed | High |
| EC-LLM-002 | LLM score ngoài 0–1 | Reject schema | High |
| EC-LLM-003 | LLM dùng source không nằm trong mapped source | Flag unexpected_source_usage | Medium |
| EC-LLM-004 | LLM timeout | Retry, fail after max retries | Medium |
| EC-LLM-005 | Source text unparsed nhưng LLM vẫn cần score | Score with available data or block depending config; recommend block for source-dependent scoring | High |
| EC-LLM-006 | Batch size vượt context window | Split batch; retry với batch nhỏ hơn | High |
| EC-LLM-007 | Duplicate source trong cùng batch | Deduplicate trong prompt; chỉ gửi 1 lần | Medium |

---

## 7. Annotator / QA Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-ANN-001 | Annotator submit thiếu score | Block | High |
| EC-ANN-002 | Score có >2 decimals | Block | High |
| EC-ANN-003 | Source unparsed/inaccessible nhưng không note | Block | High |
| EC-ANN-004 | Annotator sửa claim text | Save before/after + audit | High |
| EC-QA-001 | QA Return không comment | Block | High |
| EC-QA-002 | QA muốn sửa trực tiếp score | Not MVP unless PO approves scope change | Medium |
| EC-QA-003 | Returned task resubmit | Keep submission history or latest + audit | Medium |

---

## 8. Export Edge Cases

| ID | Scenario | Expected Behavior | Priority |
|---|---|---|---|
| EC-EXP-001 | No approved claims | Header-only CSV or no data message | Medium |
| EC-EXP-002 | Claim thiếu bundle_id | Block export | High |
| EC-EXP-003 | Claim có nhiều sources | Join with delimiter `;` | Medium |
| EC-EXP-004 | Text có newline/comma/quotes | CSV quoting UTF-8 chuẩn | High |
| EC-EXP-005 | Stakeholder cần XLSX như workflow cũ | MVP export CSV; XLSX later hoặc convert ngoài app | Medium |
