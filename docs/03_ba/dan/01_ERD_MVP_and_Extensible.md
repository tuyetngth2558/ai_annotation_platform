# 01. ERD MVP and Extensible — PDF-native Import

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.6  
**Mục tiêu:** ERD cho MVP khi input chính thức là PDF bundle.

---

## 1. Nguyên tắc thiết kế

- Input chính của MVP là PDF bundle.
- CSV/JSON không còn là import chính.
- Sau upload, hệ thống parse PDF thành dữ liệu nội bộ có cấu trúc.
- Dữ liệu chuẩn được lưu trong DB/Supabase; dashboard, Excel workbook và CSV technical đều là output từ dữ liệu này.
- Mọi claim/export phải trace được về file PDF gốc.
- MVP build text/PDF only nhưng data model vẫn giữ hướng mở rộng multi-project/multi-modality.

---

## 2. Mermaid ERD

```mermaid
erDiagram
    PROJECT ||--o{ BATCH : contains
    PROJECT ||--o{ USER_PROJECT_ROLE : assigns
    PROJECT ||--o{ RUBRIC_VERSION : defines

    BATCH ||--o{ PDF_BUNDLE : contains
    PDF_BUNDLE ||--o{ PDF_FILE : contains
    PDF_BUNDLE ||--o{ PDF_PARSE_RESULT : has
    PDF_BUNDLE ||--|| PARENT_TASK : creates

    PARENT_TASK ||--o{ SOURCE_REFERENCE : has_sources
    PARENT_TASK ||--o{ CLAIM_TASK : has_claims

    CLAIM_TASK ||--o{ CLAIM_SOURCE_MAP : maps_to
    SOURCE_REFERENCE ||--o{ CLAIM_SOURCE_MAP : supports

    CLAIM_TASK ||--o{ LLM_PRE_SCORE : has
    CLAIM_TASK ||--o{ ANNOTATION_SUBMISSION : receives
    CLAIM_TASK ||--o{ QA_REVIEW : reviewed_by
    PARENT_TASK ||--o{ ARTICLE_EVALUATION : has

    USER_ACCOUNT ||--o{ USER_PROJECT_ROLE : has
    USER_ACCOUNT ||--o{ ANNOTATION_SUBMISSION : submits
    USER_ACCOUNT ||--o{ ARTICLE_EVALUATION : evaluates
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
      string import_type
      int total_bundles
      int valid_bundles
      int invalid_bundles
      datetime created_at
    }

    PDF_BUNDLE {
      uuid bundle_id PK
      uuid batch_id FK
      string bundle_name
      string article_code
      string title
      string bundle_status
      uuid uploaded_by FK
      datetime uploaded_at
      json metadata_json
    }

    PDF_FILE {
      uuid file_id PK
      uuid bundle_id FK
      string file_role
      string original_filename
      string storage_path
      string mime_type
      int file_size_bytes
      string parse_status
      datetime uploaded_at
    }

    PDF_PARSE_RESULT {
      uuid parse_result_id PK
      uuid bundle_id FK
      string parser_version
      text answer_text_raw
      text answer_text_normalized
      json metadata_extracted_json
      json source_list_extracted_json
      json parse_warnings_json
      string parse_status
      datetime parsed_at
    }

    PARENT_TASK {
      uuid parent_task_id PK
      uuid bundle_id FK
      uuid batch_id FK
      string article_code
      string article_url
      string title
      string domain
      string subdomain
      string subdomain_id
      string category
      string tier
      decimal confidence_score
      date created_date
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
      string source_url_origin
      uuid source_file_id FK
      text source_text_extract
      string source_parse_status
      string source_access_status
    }

    CLAIM_TASK {
      uuid claim_id PK
      uuid parent_task_id FK
      int claim_order
      string section_name
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
      string fact_check_status
      text fact_check_source_url
      string source_access_status
      text annotator_note
      string status
      datetime submitted_at
    }

    ARTICLE_EVALUATION {
      uuid article_evaluation_id PK
      uuid parent_task_id FK
      uuid bundle_id FK
      decimal rel
      string rel_band
      text rel_note
      decimal comp
      string comp_band
      text comp_note
      text note
      uuid annotator_id FK
      datetime evaluated_at
    }

    QA_REVIEW {
      uuid qa_review_id PK
      uuid claim_id FK
      uuid qa_id FK
      string decision
      string error_category
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
| PROJECT | Có | Project Vivipedia, giữ hướng multi-project |
| BATCH | Có | Một lần upload nhiều PDF bundle |
| PDF_BUNDLE | Có | Một bài input gồm nhiều PDF |
| PDF_FILE | Có | Lưu từng PDF: answer, source ref, source content |
| PDF_PARSE_RESULT | Có | Kết quả parse/normalize từ PDF |
| PARENT_TASK | Có | Bài/answer sau parse |
| SOURCE_REFERENCE | Có | Source order/title/tier/text/url |
| CLAIM_TASK | Có | Đơn vị annotation |
| CLAIM_SOURCE_MAP | Có | Map claim-source |
| LLM_PRE_SCORE | Có | Điểm LLM gợi ý |
| ANNOTATION_SUBMISSION | Có | Điểm annotator |
| ARTICLE_EVALUATION | Có | Relevance/Completeness cấp bài để export Excel TA |
| QA_REVIEW | Có | Approve/Return |
| RUBRIC_VERSION | Có đơn giản | 6 tiêu chí fixed v1 |
| USER_ACCOUNT | Có | User |
| USER_PROJECT_ROLE | Có | RBAC |
| AUDIT_LOG | Có tối thiểu | Trace action chính |

---

## 4. Design notes

### Vì sao cần PDF_BUNDLE?

Vì một article input không còn là một row CSV mà là một nhóm file PDF. `PDF_BUNDLE` cho phép hệ thống quản lý một đơn vị input hoàn chỉnh.

### Vì sao cần PDF_FILE?

Để lưu từng file trong bundle:
- `answer_pdf`
- `source_ref_pdf`
- `source_content_pdf` (optional, 0..N)

### Vì sao cần PDF_PARSE_RESULT?

Để tách dữ liệu raw khỏi dữ liệu normalized:
- `answer_text_raw`: text parse thô.
- `answer_text_normalized`: text đã clean dùng cho claim extraction.
- `source_list_extracted_json`: danh sách source parse từ PDF ref.
- `parse_warnings_json`: warning về noise, thiếu URL, OCR required.

### Vì sao vẫn cần internal normalization?

Dù không dùng CSV/JSON làm input chính, hệ thống vẫn cần dữ liệu có cấu trúc trong database để chạy claim extraction, scoring, review, QA, dashboard và export.

### Vì sao cần ARTICLE_EVALUATION?

File Excel TA mẫu tách `REL` và `COMP` ra sheet `Article Evaluation` cấp bài, trong khi sheet `Annotation` chỉ chứa 4 metric claim-level `SF`, `SC`, `HR`, `SQ`. Vì vậy data model cần một entity riêng để lưu đánh giá cấp bài thay vì ép `REL/COMP` vào từng claim khi export stakeholder workbook.

### Source URL và Source Content PDF dùng thế nào?

Khi có, `source_text_extract` từ `source_content_pdf` là evidence chính trong MVP; `source_content_pdf` là optional (0..N) — nếu bundle không có, annotator/LLM dựa vào `source_ref_pdf` metadata + optional URL. `source_url` parse từ hyperlink trong `source_ref_pdf` là metadata optional để hiển thị/tham khảo, không bắt buộc fetch realtime và không được ghi đè nội dung PDF đã parse trong MVP.
