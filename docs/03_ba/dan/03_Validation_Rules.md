# 03. Validation Rules — PDF-ready MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.3

---

## 1. PDF Bundle Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-PDF-001 | PDF Bundle | Mỗi bundle phải có answer PDF | Yes | Missing answer PDF |
| VR-PDF-002 | PDF Bundle | Mỗi bundle phải có source reference PDF | Yes | Missing source reference PDF |
| VR-PDF-003 | PDF Bundle | Bundle phải có `bundle_id` duy nhất | Yes | Duplicate bundle_id |
| VR-PDF-004 | PDF Bundle | File phải là PDF hợp lệ | Yes | Invalid PDF file |
| VR-PDF-005 | PDF Bundle | File size không vượt giới hạn cấu hình | Yes | File too large |
| VR-PDF-006 | PDF Bundle | File type phải thuộc: answer_pdf, source_ref_pdf, source_content_pdf | Yes | Invalid file_type |

---

## 2. PDF Parsing / Normalization Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-PARSE-001 | Answer parsing | Không parse được `answer_text_raw` → bundle invalid | Yes | Cannot extract answer text |
| VR-PARSE-002 | Answer parsing | Không parse được `article_code` → tạo internal ID và flag warning | No | Missing article_code; internal ID generated |
| VR-PARSE-003 | Answer parsing | `answer_text_normalized` không được rỗng | Yes | Normalized answer text is required |
| VR-PARSE-004 | Metadata | `confidence_score` nếu có phải là số 0.00–1.00 | No | Invalid confidence score; set null |
| VR-PARSE-005 | Metadata | `created_date` nếu có phải parse được thành date | No | Invalid date; set null |
| VR-PARSE-006 | UI noise | Navigation/footer text nên được loại khỏi normalized answer | No | Warning if high noise detected |

---

## 3. Source List Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-SRC-001 | Source list | Source reference list phải có ít nhất 1 source | Yes | At least one source is required |
| VR-SRC-002 | Source list | Mỗi source phải có `source_order` | Yes | Missing source_order |
| VR-SRC-003 | Source list | `source_order` không được trùng trong cùng parent task | Yes | Duplicate source_order |
| VR-SRC-004 | Source list | Mỗi source nên có `source_title` | Yes | Missing source_title |
| VR-SRC-005 | Source tier | Nếu có tier thì tier phải thuộc enum hợp lệ | No | Unknown tier; set `unknown` |
| VR-SRC-006 | Source URL | Nếu có URL thì phải bắt đầu bằng `http://` hoặc `https://` | No/Yes configurable | Invalid source URL |
| VR-SRC-007 | Source content | Source content PDF không parse được → status = `unparsed` | No | Source text unparsed |

---

## 4. Citation / Source Mapping Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-MAP-001 | Citation | Citation marker `[n]` trong answer nên map được với `source_order = n` | Warning by default | Citation source missing |
| VR-MAP-002 | Claim mapping | Mỗi claim phải có ít nhất 1 source candidate | Yes | Claim has no source candidate |
| VR-MAP-003 | Claim mapping | Nếu không map được source → status = `source_mapping_required` | Yes | Source mapping required |
| VR-MAP-004 | Claim mapping | Một claim được phép map nhiều source | No | N/A |
| VR-MAP-005 | Claim mapping | Mapping confidence nếu có phải nằm trong 0.00–1.00 | No | Invalid mapping confidence |

---

## 5. Claim Extraction Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-CE-001 | Claim extraction | Một parent task phải sinh ít nhất 1 claim | Yes | No claim extracted |
| VR-CE-002 | Claim | `claim_text` không được rỗng | Yes | Claim text is required |
| VR-CE-003 | Claim | `claim_order` phải >= 1 | Yes | Invalid claim_order |
| VR-CE-004 | Claim | `claim_order` không trùng trong cùng parent task | Yes | Duplicate claim_order |
| VR-CE-005 | Claim edit | Nếu annotator/QA sửa claim text, phải lưu original/final | Yes | Claim edit history required |

---

## 6. LLM Pre-scoring Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-LLM-001 | LLM output | Output phải có đủ 6 score: SF, SC, HR, SQ, REL, COMP | Yes | Missing required score |
| VR-LLM-002 | Score | Mỗi score nằm trong 0.00–1.00 | Yes | Score must be between 0.00 and 1.00 |
| VR-LLM-003 | Score | Score tối đa 2 chữ số thập phân | Yes | Score supports max 2 decimal places |
| VR-LLM-004 | LLM output | Nếu LLM response sai schema → `pre_scoring_failed` | Yes | Invalid LLM schema |
| VR-LLM-005 | Traceability | Lưu provider/model/prompt_version/raw_response_reference | Yes | Missing LLM traceability fields |

---

## 7. Annotator Review Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-ANN-001 | Score | Không submit nếu thiếu dimension bắt buộc | Yes | Required score missing |
| VR-ANN-002 | Score | Score phải 0.00–1.00 | Yes | Score must be between 0.00 and 1.00 |
| VR-ANN-003 | Score | Score tối đa 2 chữ số thập phân | Yes | Score supports max 2 decimal places |
| VR-ANN-004 | Source | Source inaccessible → note bắt buộc `Không truy cập được` | Yes | Note required for inaccessible source |
| VR-ANN-005 | Claim edit | Nếu sửa claim text phải lưu audit before/after | Yes | Claim edit audit required |
| VR-ANN-006 | Submission | Không submit nếu task không ở trạng thái ready/in_annotation | Yes | Invalid task status |

---

## 8. QA Review Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-QA-001 | QA decision | Decision chỉ thuộc `approved` hoặc `returned` trong MVP | Yes | Invalid QA decision |
| VR-QA-002 | QA Return | Return bắt buộc có `qa_comment` | Yes | QA comment is required when returning task |
| VR-QA-003 | QA Approve | Approve không bắt buộc comment | No | N/A |
| VR-QA-004 | QA action | QA không review task chưa submitted | Yes | Task is not ready for QA |

---

## 9. Export Validation

| Rule ID | Area | Rule | Blocking? | Error Message / Behavior |
|---|---|---|---:|---|
| VR-EXP-001 | Export | Default chỉ export approved claims | Yes | Claim not approved |
| VR-EXP-002 | Export | Export phải có `bundle_id` | Yes | Missing bundle_id |
| VR-EXP-003 | Export | Export phải có `article_code` | Yes | Missing article_code |
| VR-EXP-004 | Export | Export phải có `claim_id` | Yes | Missing claim_id |
| VR-EXP-005 | Export | Export phải có mapped source info | Yes | Missing mapped sources |
| VR-EXP-006 | Export | CSV phải dùng UTF-8 | Yes | Export encoding must be UTF-8 |
