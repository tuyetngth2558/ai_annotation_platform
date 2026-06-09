# 03. Validation Rules — PDF-native MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.4

---

## 1. PDF Bundle Upload Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-UP-001 | Upload | Mỗi bundle phải có đúng 1 `answer_pdf` | Yes | Missing or duplicate answer PDF |
| VR-UP-002 | Upload | Mỗi bundle phải có đúng 1 `source_ref_pdf` | Yes | Missing or duplicate source reference PDF |
| VR-UP-003 | Upload | Mỗi bundle phải có ít nhất 1 `source_content_pdf` | Yes | At least one source content PDF is required |
| VR-UP-004 | Upload | Tất cả file phải là PDF hợp lệ | Yes | Invalid PDF file |
| VR-UP-005 | Upload | File không vượt quá max size cấu hình | Yes | File too large |
| VR-UP-006 | Upload | `bundle_name` không được rỗng | Yes | bundle_name is required |
| VR-UP-007 | Upload | Không trùng `bundle_id` trong batch | Yes | Duplicate bundle_id |
| VR-UP-008 | Upload | File role chỉ thuộc answer_pdf/source_ref_pdf/source_content_pdf | Yes | Invalid file role |

---

## 2. PDF Parsing Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-PARSE-001 | Answer PDF | Không parse được text từ answer PDF | Yes | Cannot extract answer text |
| VR-PARSE-002 | Answer PDF | `answer_text_normalized` không được rỗng | Yes | Normalized answer text is required |
| VR-PARSE-003 | Metadata | Không parse được `article_code` | No | Generate internal article_code and flag warning |
| VR-PARSE-004 | Metadata | `confidence_score` nếu có phải trong 0.00–1.00 | No | Invalid confidence_score; set null |
| VR-PARSE-005 | Metadata | `created_date` nếu có phải parse được | No | Invalid date; set null |
| VR-PARSE-006 | Answer cleanup | UI/navigation/footer noise nên được loại khỏi normalized text | No | Warning if high noise remains |
| VR-PARSE-007 | Parser trace | Phải lưu parser_version và parse_status | Yes | Missing parser trace fields |

---

## 3. Source Reference Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-SRC-001 | Source Ref PDF | Phải parse được ít nhất 1 source | Yes | No source parsed from source reference PDF |
| VR-SRC-002 | Source | Mỗi source phải có `source_order` | Yes | Missing source_order |
| VR-SRC-003 | Source | `source_order` không trùng trong cùng parent task | Yes | Duplicate source_order |
| VR-SRC-004 | Source | Mỗi source phải có `source_title` | Yes | Missing source_title |
| VR-SRC-005 | Source | `source_tier` nếu không nhận diện được thì set `unknown` | No | Unknown tier |
| VR-SRC-006 | Source URL | `source_url` optional; nếu có phải là http/https | No | Invalid source_url; set null and warn |
| VR-SRC-007 | Source Content | Nếu source content PDF không parse được thì `source_parse_status = unparsed` | No | Source content unparsed |
| VR-SRC-008 | Source Content | Nếu PDF là scan/image thì `source_parse_status = ocr_required` | No | OCR required |

---

## 4. Citation / Source Mapping Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-MAP-001 | Citation | Citation marker `[n]` nên map được với `source_order = n` | Warning by default | Citation source missing |
| VR-MAP-002 | Claim-source | Mỗi claim phải có ít nhất 1 source candidate | Yes | Claim has no source candidate |
| VR-MAP-003 | Claim-source | Claim không map được source thì vào `source_mapping_required` | Yes | Source mapping required |
| VR-MAP-004 | Claim-source | Một claim được phép map nhiều source | No | N/A |
| VR-MAP-005 | Mapping confidence | Nếu có phải nằm trong 0.00–1.00 | No | Invalid mapping confidence |

---

## 5. Claim Extraction Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-CE-001 | Claim Extraction | Một parent task phải sinh ít nhất 1 claim | Yes | No claim extracted |
| VR-CE-002 | Claim | `claim_text_original` không được rỗng | Yes | Claim text is required |
| VR-CE-003 | Claim | `claim_order` phải >= 1 | Yes | Invalid claim_order |
| VR-CE-004 | Claim | `claim_order` không trùng trong parent task | Yes | Duplicate claim_order |
| VR-CE-005 | Claim Edit | Nếu sửa claim text phải lưu original/final | Yes | Claim edit history required |

---

## 6. LLM Pre-scoring Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-LLM-001 | LLM output | Phải có đủ 6 score: SF, SC, HR, SQ, REL, COMP | Yes | Missing required score |
| VR-LLM-002 | Score | Score nằm trong 0.00–1.00 | Yes | Score must be between 0.00 and 1.00 |
| VR-LLM-003 | Score | Tối đa 2 chữ số thập phân | Yes | Score supports max 2 decimal places |
| VR-LLM-004 | LLM output | Sai schema thì task `pre_scoring_failed` | Yes | Invalid LLM schema |
| VR-LLM-005 | Trace | Lưu provider/model/prompt_version/raw_response_reference | Yes | Missing LLM traceability fields |

---

## 7. Annotator Review Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-ANN-001 | Score | Không submit nếu thiếu score bắt buộc | Yes | Required score missing |
| VR-ANN-002 | Score | Score phải 0.00–1.00 | Yes | Score must be between 0.00 and 1.00 |
| VR-ANN-003 | Score | Score tối đa 2 chữ số thập phân | Yes | Score supports max 2 decimal places |
| VR-ANN-004 | Source | Source unparsed/inaccessible thì note bắt buộc | Yes | Source issue note is required |
| VR-ANN-005 | Claim edit | Nếu sửa claim text phải audit before/after | Yes | Claim edit audit required |
| VR-ANN-006 | Status | Không submit task không ở trạng thái ready/in_annotation | Yes | Invalid task status |

---

## 8. QA Review Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-QA-001 | QA decision | MVP chỉ cho `approved` hoặc `returned` | Yes | Invalid QA decision |
| VR-QA-002 | QA Return | Return bắt buộc có `qa_comment` | Yes | QA comment required |
| VR-QA-003 | QA Approve | Approve không bắt buộc comment | No | N/A |
| VR-QA-004 | QA status | QA không review task chưa submitted | Yes | Task not ready for QA |

---

## 9. Export Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-EXP-001 | Export | Default chỉ export approved claims | Yes | Claim not approved |
| VR-EXP-002 | Trace | Export phải có `bundle_id` | Yes | Missing bundle_id |
| VR-EXP-003 | Trace | Export phải có answer/source PDF filenames | Yes | Missing PDF file reference |
| VR-EXP-004 | Trace | Export phải có `article_code` | Yes | Missing article_code |
| VR-EXP-005 | Source | Export phải có mapped source info | Yes | Missing source mapping |
| VR-EXP-006 | CSV | CSV phải UTF-8 | Yes | Export encoding must be UTF-8 |
