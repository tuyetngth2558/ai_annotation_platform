# 01. ERD MVP and Extensible — PDF-ready Data Model

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.3  
**Mục tiêu:** Thiết kế ERD cho MVP text/Vivipedia, có bổ sung raw PDF input bundle để trace được từ output CSV về PDF gốc.

---

## 1. Nguyên tắc thiết kế

- MVP chỉ build text/Vivipedia.
- Input thực tế hiện tại là PDF bundle.
- Platform MVP có thể import normalized CSV/JSON, nhưng data model vẫn cần lưu được raw file reference.
- Một Project có nhiều Batch.
- Một Batch có nhiều Raw Input Bundle.
- Một Raw Input Bundle gồm nhiều Raw Input File.
- Một Raw Input Bundle tạo ra một Parent Task.
- Một Parent Task sinh nhiều Claim Task.
- Một Claim Task có một hoặc nhiều Source Reference.
- Một Claim Task có LLM Pre-score, Annotator Submission, và QA Review.
- Export CSV claim-level phải trace ngược được về `bundle_id`, `article_code`, và file PDF gốc.

---

## 2. Mermaid ERD

```mermaid
erDiagram
    PROJECT ||--o{ BATCH : contains
    PROJECT ||--o{ RUBRIC_VERSION : defines
    PROJECT ||--o{ USER_PROJECT_ROLE : assigns

    BATCH ||--o{ RAW_INPUT_BUNDLE : imports
    RAW_INPUT_BUNDLE ||--o{ RAW_INPUT_FILE : contains
    RAW_INPUT_BUNDLE ||--|| PARENT_TASK : normalizes_to

    PARENT_TASK ||--o{ CLAIM_TASK : has
    PARENT_TASK ||--o{ SOURCE_REFERENCE : has_source_list

    CLAIM_TASK ||--o{ CLAIM_SOURCE_MAP : maps_to
    SOURCE_REFERENCE ||--o{ CLAIM_SOURCE_MAP : supports

    CLAIM_TASK ||--o{ LLM_PRE_SCORE : has
    CLAIM_TASK ||--o{ ANNOTATION_SUBMISSION : receives
    CLAIM_TASK ||--o{ QA_REVIEW : reviewed_by

    USER_ACCOUNT ||--o{ USER_PROJECT_ROLE : has
    USER_ACCOUNT ||--o{ ANNOTATION_SUBMISSION : submits
    USER_ACCOUNT ||--o{ QA_REVIEW : performs
    USER_ACCOUNT ||--o{ AUDIT_LOG : triggers

    PROJECT ||--o{ AUDIT_LOG : contains

    PROJECT {
      uuid project_id PK
      string project_code
      string project_name
      string modality
      string project_type
      string status
      datetime created_at
    }

    BATCH {
      uuid batch_id PK
      uuid project_id FK
      string batch_name
      string import_mode
      string import_format
      int total_bundles
      int valid_bundles
      int invalid_bundles
      datetime imported_at
    }

    RAW_INPUT_BUNDLE {
      uuid bundle_id PK
      uuid batch_id FK
      string bundle_name
      string article_code
      string title
      string status
      uuid uploaded_by FK
      datetime uploaded_at
      json metadata_json
    }

    RAW_INPUT_FILE {
      uuid file_id PK
      uuid bundle_id FK
      string file_type
      string original_filename
      string storage_path
      string parse_status
      text extracted_text_reference
      json parse_warnings_json
      datetime uploaded_at
    }

    PARENT_TASK {
      uuid parent_task_id PK
      uuid bundle_id FK
      uuid batch_id FK
      string article_code
      string title
      string category
      string tier
      decimal confidence_score
      date created_date
      text answer_text_raw
      text answer_text_normalized
      string answer_reference
      string status
      int total_claims
      json metadata_json
    }

    SOURCE_REFERENCE {
      uuid source_id PK
      uuid parent_task_id FK
      int source_order
      string source_title
      string source_tier
      text source_url
      uuid source_file_id FK
      text source_text_reference
      string access_status
      string parse_status
    }

    CLAIM_TASK {
      uuid claim_id PK
      uuid parent_task_id FK
      int claim_order
      text claim_text_original
      text claim_text_final
      string citation_markers
      string status
      uuid assigned_annotator_id FK
      string rubric_version
      datetime submitted_at
      datetime approved_at
    }

    CLAIM_SOURCE_MAP {
      uuid claim_source_map_id PK
      uuid claim_id FK
      uuid source_id FK
      string mapping_method
      decimal mapping_confidence
      bool is_primary_source
    }

    LLM_PRE_SCORE {
      uuid pre_score_id PK
      uuid claim_id FK
      string provider
      string model
      string prompt_version
      decimal sf
      decimal sc
      decimal hr
      decimal sq
      decimal rel
      decimal comp
      decimal composite_score
      json rationale_json
      datetime created_at
    }

    ANNOTATION_SUBMISSION {
      uuid submission_id PK
      uuid claim_id FK
      uuid annotator_id FK
      decimal sf
      decimal sc
      decimal hr
      decimal sq
      decimal rel
      decimal comp
      decimal composite_score
      text annotator_note
      string source_access_status
      string status
      datetime submitted_at
    }

    QA_REVIEW {
      uuid qa_review_id PK
      uuid claim_id FK
      uuid qa_id FK
      string decision
      text qa_comment
      datetime reviewed_at
    }

    RUBRIC_VERSION {
      uuid rubric_version_id PK
      uuid project_id FK
      string version_name
      json dimensions_json
      json weights_json
      bool is_active
      datetime effective_from
    }

    USER_ACCOUNT {
      uuid user_id PK
      string full_name
      string email
      string status
      datetime created_at
    }

    USER_PROJECT_ROLE {
      uuid user_project_role_id PK
      uuid user_id FK
      uuid project_id FK
      string role
      bool is_active
    }

    AUDIT_LOG {
      uuid log_id PK
      uuid project_id FK
      uuid user_id FK
      string entity_type
      uuid entity_id
      string action_type
      json before_value
      json after_value
      string reason
      datetime timestamp
    }
```

---

## 3. Entity summary

| Entity | Build MVP? | Mục đích |
|---|---:|---|
| PROJECT | Có | Lưu project Vivipedia, giữ khả năng multi-project |
| BATCH | Có | Một lần import data |
| RAW_INPUT_BUNDLE | Có | Một bộ PDF input gốc |
| RAW_INPUT_FILE | Có / tối thiểu metadata | Lưu từng PDF trong bundle |
| PARENT_TASK | Có | Một bài/câu trả lời gốc sau normalize |
| SOURCE_REFERENCE | Có | Danh sách nguồn được đánh số |
| CLAIM_TASK | Có | Đơn vị annotation chính |
| CLAIM_SOURCE_MAP | Có | Map claim với source order/source id |
| LLM_PRE_SCORE | Có | Điểm LLM gợi ý |
| ANNOTATION_SUBMISSION | Có | Điểm annotator |
| QA_REVIEW | Có | Approve/Return |
| RUBRIC_VERSION | Có, đơn giản | 6 tiêu chí fixed v1 |
| USER_ACCOUNT | Có | User hệ thống |
| USER_PROJECT_ROLE | Có | RBAC cơ bản |
| AUDIT_LOG | Có, tối thiểu | Log action chính |

---

## 4. Extensibility notes

Để hỗ trợ audio/image/table sau MVP, giữ các field sau:

| Field | Lý do |
|---|---|
| `project.modality` | text / image / audio / table / video |
| `project.project_type` | vivipedia_claim_review, image_region_review, audio_segment_review |
| `raw_input_file.file_type` | answer_pdf, source_ref_pdf, source_content_pdf, image, audio, table |
| `parent_task.metadata_json` | Lưu metadata đặc thù theo modality |
| `source_reference.source_text_reference` | Có thể thay bằng transcript, OCR text, table extract |
| `claim_task.claim_text_*` | Với image/audio có thể mở rộng thành annotation unit text/label |
| `claim_source_map.mapping_method` | citation_marker, llm_mapping, manual_mapping |
| `rubric_version.dimensions_json` | Mỗi project/modality có rubric khác nhau |

---

## 5. Quyết định thiết kế quan trọng

| ID | Decision | Lý do |
|---|---|---|
| ERD-D01 | Thêm `RAW_INPUT_BUNDLE` và `RAW_INPUT_FILE` | Trace được từ export về PDF gốc |
| ERD-D02 | Tách `SOURCE_REFERENCE` khỏi `CLAIM_TASK` | Một source có thể support nhiều claim |
| ERD-D03 | Dùng `CLAIM_SOURCE_MAP` | Một claim có thể map nhiều source |
| ERD-D04 | Không lặp full `answer_text` trong export claim-level | Giảm kích thước CSV, dùng `answer_reference` |
| ERD-D05 | Lưu cả `answer_text_raw` và `answer_text_normalized` | Debug parser và phục vụ LLM |
| ERD-D06 | QA MVP chỉ lưu decision/comment | Theo scope 4 tuần Approve/Return |
