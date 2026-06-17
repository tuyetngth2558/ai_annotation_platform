# 06. Data Dictionary — PDF-native MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.6  
**Cập nhật:** 2026-06-12  
**Trạng thái:** Active markdown dictionary

---

## 1. Core Entities

### PROJECT

| Field | Type | Required | Notes |
|---|---|---:|---|
| `project_id` | uuid | Yes | Primary key |
| `project_code` | string | Yes | Example: `vivipedia` |
| `project_name` | string | Yes | Display name |
| `modality` | enum | Yes | MVP UI locks to `text`; extensible to `audio/image` later |
| `project_type` | enum | Yes | Example: `vivipedia_pdf_claim_review` |
| `status` | enum | Yes | `draft/active/paused/archived` |
| `created_at` | datetime | Yes | ISO datetime |

### BATCH

| Field | Type | Required | Notes |
|---|---|---:|---|
| `batch_id` | uuid | Yes | Primary key |
| `project_id` | uuid | Yes | FK to `PROJECT` |
| `batch_name` | string | Yes | User-facing batch name |
| `import_type` | enum | Yes | MVP: `pdf_bundle` |
| `total_bundles` | integer | Yes | >= 0 |
| `valid_bundles` | integer | Yes | >= 0 |
| `invalid_bundles` | integer | Yes | >= 0 |
| `created_at` | datetime | Yes | ISO datetime |

### PDF_BUNDLE

| Field | Type | Required | Notes |
|---|---|---:|---|
| `bundle_id` | uuid | Yes | Primary key |
| `batch_id` | uuid | Yes | FK to `BATCH` |
| `bundle_name` | string | Yes | Required at upload |
| `article_code` | string | Recommended | Parsed or generated |
| `title` | string | Recommended | Parsed from Answer PDF |
| `bundle_status` | enum | Yes | `uploaded/parsing/parsed/parse_failed/ready_for_annotation/invalid` |
| `uploaded_by` | uuid | Yes | FK to `USER_ACCOUNT` |
| `uploaded_at` | datetime | Yes | ISO datetime |
| `metadata_json` | json | No | Raw/extra metadata |

### PDF_FILE

| Field | Type | Required | Notes |
|---|---|---:|---|
| `file_id` | uuid | Yes | Primary key |
| `bundle_id` | uuid | Yes | FK to `PDF_BUNDLE` |
| `file_role` | enum | Yes | `answer_pdf/source_ref_pdf/source_content_pdf` |
| `original_filename` | string | Yes | Original upload name |
| `storage_path` | string | Yes | Object storage path |
| `mime_type` | string | Yes | Must be `application/pdf` |
| `file_size_bytes` | integer | Yes | Within max size |
| `parse_status` | enum | Yes | `pending/parsed/unparsed/ocr_required/failed/unknown` |
| `uploaded_at` | datetime | Yes | ISO datetime |

### PDF_PARSE_RESULT

| Field | Type | Required | Notes |
|---|---|---:|---|
| `parse_result_id` | uuid | Yes | Primary key |
| `bundle_id` | uuid | Yes | FK to `PDF_BUNDLE` |
| `parser_version` | string | Yes | Example: `pdf_parser_v1` |
| `answer_text_raw` | text | Yes | Raw extracted text |
| `answer_text_normalized` | text | Yes | Clean text for claim extraction |
| `metadata_extracted_json` | json | No | Includes article metadata |
| `source_list_extracted_json` | json | Yes | Source order/title/tier/url/file refs |
| `parse_warnings_json` | json | No | Warning list |
| `parse_status` | enum | Yes | `parsed/parsed_with_warnings/failed` |
| `parsed_at` | datetime | Yes | ISO datetime |

---

## 2. Task & Source Entities

### PARENT_TASK

| Field | Type | Required | Notes |
|---|---|---:|---|
| `parent_task_id` | uuid | Yes | Primary key |
| `bundle_id` | uuid | Yes | FK to `PDF_BUNDLE` |
| `batch_id` | uuid | Yes | FK to `BATCH` |
| `article_code` | string | Yes | Parsed/generated |
| `article_url` | text | No | Portal article URL if available |
| `title` | string | Yes | Article/page title |
| `domain` | string | Yes | Excel TA `Domain` |
| `subdomain` | string | Yes | Excel TA `Sub-domain` |
| `subdomain_id` | string | No | Example: `law_03` |
| `category` | string | No | Backward-compatible category |
| `tier` | string | No | Parsed tier |
| `confidence_score` | decimal | No | 0.00-1.00 |
| `created_date` | date | No | Parsed source date |
| `answer_text_normalized` | text | Yes | Denormalized for workspace |
| `answer_reference` | string | Yes | Reference to answer content |
| `status` | enum | Yes | Bundle/parent pipeline state |
| `total_claims` | integer | No | Generated claim count |

### SOURCE_REFERENCE

| Field | Type | Required | Notes |
|---|---|---:|---|
| `source_id` | uuid | Yes | Primary key |
| `parent_task_id` | uuid | Yes | FK to `PARENT_TASK` |
| `source_order` | integer | Yes | Unique within parent task |
| `source_title` | text | Yes | From Source Ref PDF |
| `source_tier` | enum | No | `Tier 1/Tier 2/Tier 3/unknown` |
| `source_url` | text | No | Optional hyperlink from Source Ref PDF |
| `source_url_origin` | enum | No | `source_ref_pdf_hyperlink/manual/post_mvp_fetch/unknown` |
| `source_file_id` | uuid | No | FK to source content PDF file |
| `source_text_extract` | text | No | Evidence text from Source Content PDF |
| `source_parse_status` | enum | Yes | `parsed/unparsed/ocr_required/failed/unknown` |
| `source_access_status` | enum | Yes | `source_text_parsed/inaccessible/unknown` |

### CLAIM_TASK

| Field | Type | Required | Notes |
|---|---|---:|---|
| `claim_id` | uuid | Yes | Primary key |
| `parent_task_id` | uuid | Yes | FK to `PARENT_TASK` |
| `claim_order` | integer | Yes | Starts at 1, unique within parent |
| `section_name` | string | No | Source answer section |
| `claim_text_original` | text | Yes | From LLM claim extraction |
| `claim_text_final` | text | No | Annotator-edited text |
| `citation_markers` | string/json | No | Example: `[1];[3]` |
| `status` | enum | Yes | `assigned/in_annotation/submitted/returned/approved/exported`, plus system states |
| `assigned_annotator_id` | uuid | Yes | FK to `USER_ACCOUNT` |
| `rubric_version` | string | Yes | Example: `vivipedia_v1` |
| `submitted_at` | datetime | No | Set on submit |
| `approved_at` | datetime | No | Set on approve |

### CLAIM_SOURCE_MAP

| Field | Type | Required | Notes |
|---|---|---:|---|
| `claim_source_map_id` | uuid | Yes | Primary key |
| `claim_id` | uuid | Yes | FK to `CLAIM_TASK` |
| `source_id` | uuid | Yes | FK to `SOURCE_REFERENCE` |
| `mapping_method` | enum | Yes | `citation_marker/llm_mapping/manual_mapping` |
| `mapping_confidence` | decimal | No | 0.00-1.00 |
| `is_primary_source` | boolean | Yes | Default false |

---

## 3. Scoring & Review Entities

### LLM_PRE_SCORE

| Field | Type | Required | Notes |
|---|---|---:|---|
| `pre_score_id` | uuid | Yes | Primary key |
| `claim_id` | uuid | Yes | FK to `CLAIM_TASK` |
| `provider` | string | Yes | MVP working provider via `LLMProvider` |
| `model` | string | Yes | Example: `gemini-2.5-flash` |
| `prompt_version` | string | Yes | Version trace |
| `sf` | decimal | Yes | 0.00-1.00 |
| `sc` | decimal | Yes | 0.00-1.00 |
| `hr` | decimal | Yes | 0.00-1.00, UI label `NH` acceptable |
| `sq` | decimal | Yes | 0.00-1.00 |
| `rel` | decimal | No | Platform deviation/article-level hint |
| `comp` | decimal | No | Platform deviation/article-level hint |
| `rationale_json` | json | No | Rationale per metric |
| `raw_response_reference` | string | No | Raw LLM trace |
| `created_at` | datetime | Yes | ISO datetime |

### ANNOTATION_SUBMISSION

| Field | Type | Required | Notes |
|---|---|---:|---|
| `submission_id` | uuid | Yes | Primary key |
| `claim_id` | uuid | Yes | FK to `CLAIM_TASK` |
| `annotator_id` | uuid | Yes | FK to `USER_ACCOUNT` |
| `sf` | decimal | Yes | Claim-level metric |
| `sc` | decimal | Yes | Claim-level metric |
| `hr` | decimal | Yes | Claim-level metric |
| `sq` | decimal | Yes | Claim-level metric |
| `fact_check_status` | enum | Yes | `confirmed/deviated/contradicted/not_found/skipped` |
| `fact_check_source_url` | text | No | Excel col H |
| `source_access_status` | enum | Yes | Source status selected by annotator |
| `source_note` | text | No | Required if source inaccessible/unparsed |
| `annotator_note` | text | No | Excel col M |
| `status` | enum | Yes | `draft/submitted/superseded` |
| `submitted_at` | datetime | Yes | ISO datetime |

### ARTICLE_EVALUATION

| Field | Type | Required | Notes |
|---|---|---:|---|
| `article_evaluation_id` | uuid | Yes | Primary key |
| `parent_task_id` | uuid | Yes | FK to `PARENT_TASK` |
| `bundle_id` | uuid | Yes | FK to `PDF_BUNDLE` |
| `rel` | decimal | Yes | Article-level Relevance, 0.00-1.00 |
| `rel_band` | string | Auto | Derived from `rel` |
| `rel_note` | text | No | Excel col H |
| `comp` | decimal | Yes | Article-level Completeness, 0.00-1.00 |
| `comp_band` | string | Auto | Derived from `comp` |
| `comp_note` | text | No | Excel col K |
| `note` | text | No | Excel col L |
| `annotator_id` | uuid | Yes | FK to `USER_ACCOUNT` |
| `evaluated_at` | date/datetime | Yes | Excel col N |

### QA_REVIEW

| Field | Type | Required | Notes |
|---|---|---:|---|
| `qa_review_id` | uuid | Yes | Primary key |
| `claim_id` | uuid | Yes | FK to `CLAIM_TASK` |
| `qa_id` | uuid | Yes | FK to `USER_ACCOUNT` |
| `decision` | enum | Yes | `approved/returned` |
| `error_category` | enum | Required if returned | `wrong_score/missing_notes/incorrect_source_status/bad_claim_text` |
| `qa_comment` | text | Required if returned | Trim length >= 10 |
| `reviewed_at` | datetime | Yes | ISO datetime |

---

## 4. Support Entities

### USER_ACCOUNT

| Field | Type | Required | Notes |
|---|---|---:|---|
| `user_id` | uuid | Yes | Primary key |
| `full_name` | string | Yes | Display name |
| `email` | string | Yes | Unique valid email |
| `status` | enum | Yes | `active/inactive` |
| `created_at` | datetime | Yes | ISO datetime |

### USER_PROJECT_ROLE

| Field | Type | Required | Notes |
|---|---|---:|---|
| `user_project_role_id` | uuid | Yes | Primary key |
| `user_id` | uuid | Yes | FK to `USER_ACCOUNT` |
| `project_id` | uuid | Yes | FK to `PROJECT` |
| `role` | enum | Yes | `admin/annotator/qa` |
| `is_active` | boolean | Yes | Default true |

### AUDIT_LOG

| Field | Type | Required | Notes |
|---|---|---:|---|
| `log_id` | uuid | Yes | Primary key |
| `project_id` | uuid | Yes | FK to `PROJECT` |
| `user_id` | uuid | No | Nullable for system |
| `entity_type` | enum | Yes | `pdf_bundle/pdf_file/parent_task/claim/source/submission/article_evaluation/qa/export` |
| `entity_id` | uuid/string | Yes | Target object ID |
| `action_type` | string | Yes | `import/claim_edit/submit/article_evaluate/approve/return/export` |
| `before_value` | json | No | Optional diff |
| `after_value` | json | No | Optional diff |
| `reason` | string | No | Optional reason |
| `timestamp` | datetime | Yes | ISO datetime |

---

## 5. Export-Specific Notes

- Excel sheet `Annotation` maps from `PARENT_TASK`, `CLAIM_TASK`, `SOURCE_REFERENCE`, `ANNOTATION_SUBMISSION`.
- Excel sheet `Article Evaluation` maps from `PARENT_TASK` and `ARTICLE_EVALUATION`.
- CSV claim-level is technical/debug output, not stakeholder workbook replacement.
- `REL/COMP` are article-level for Excel TA export.
