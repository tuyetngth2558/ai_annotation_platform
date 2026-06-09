# 02. Import / Export Schema — PDF-native MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.4  
**Cập nhật:** Import chính là PDF Bundle Upload, không phải CSV/JSON.

---

## 1. Luồng import chính thức cho MVP

```text
User uploads PDF Bundle
→ Validate required PDF files
→ Parse PDF files
→ Normalize answer/source data internally
→ Create Parent Task
→ Extract Source References
→ Claim Extraction
→ Source Mapping
→ LLM Pre-scoring
→ Annotator Review
→ QA Review
→ Export CSV
```

CSV/JSON chỉ còn là **internal representation / debugging artifact**, không phải input chính từ user.

---

## 2. PDF Bundle Upload Schema

### 2.1 Bundle-level request

```json
{
  "project_code": "vivipedia",
  "batch_name": "MVP Batch 01",
  "bundles": [
    {
      "bundle_name": "ODA Article 001",
      "article_code_hint": "ENC_20260512_375DE786",
      "files": [
        {
          "file_role": "answer_pdf",
          "filename": "1(1).pdf"
        },
        {
          "file_role": "source_ref_pdf",
          "filename": "1-Ref(1).pdf"
        },
        {
          "file_role": "source_content_pdf",
          "filename": "1-1(1).pdf"
        }
      ]
    }
  ]
}
```

### 2.2 File roles

| file_role | Required | Số lượng | Mô tả |
|---|---:|---:|---|
| `answer_pdf` | Yes | 1 | PDF câu trả lời nguyên bản |
| `source_ref_pdf` | Yes | 1 | PDF danh sách nguồn tham khảo |
| `source_content_pdf` | Yes | 1+ | PDF nội dung nguồn/văn bản gốc |

---

## 3. PDF Parse Result Schema

Sau khi upload, hệ thống parse PDF và tạo parse result.

```json
{
  "bundle_id": "bundle_001",
  "parser_version": "pdf_parser_v1",
  "parse_status": "parsed_with_warnings",
  "metadata_extracted": {
    "article_code": "ENC_20260512_375DE786",
    "title": "Thanh toán chi phí dự án ODA theo Nghị định 114/2021/NĐ-CP",
    "category": "Hành chính",
    "tier": "T3",
    "confidence_score": 0.10,
    "created_date": "2026-05-12"
  },
  "answer_text_raw": "raw text extracted from answer PDF",
  "answer_text_normalized": "cleaned answer text used for claim extraction",
  "source_list_extracted": [
    {
      "source_order": 1,
      "source_title": "Thông tư số 66/2023/TT-BTC của Bộ Tài chính",
      "source_tier": "Tier 1",
      "source_url": null,
      "source_file_ref": "1-1(1).pdf",
      "source_text_extract": "parsed source text",
      "source_parse_status": "parsed"
    }
  ],
  "parse_warnings": [
    {
      "warning_code": "SOURCE_URL_MISSING",
      "message": "Source title parsed but source URL not found in PDF."
    }
  ]
}
```

---

## 4. Internal Parent Task Schema

```json
{
  "parent_task_id": "pt_001",
  "bundle_id": "bundle_001",
  "article_code": "ENC_20260512_375DE786",
  "title": "Thanh toán chi phí dự án ODA theo Nghị định 114/2021/NĐ-CP",
  "category": "Hành chính",
  "tier": "T3",
  "confidence_score": 0.10,
  "created_date": "2026-05-12",
  "answer_text_normalized": "cleaned answer text",
  "answer_reference": "answer_ref_001",
  "status": "ready_for_claim_extraction"
}
```

---

## 5. Source Reference Schema

```json
{
  "source_id": "src_001",
  "parent_task_id": "pt_001",
  "source_order": 1,
  "source_title": "Thông tư số 66/2023/TT-BTC của Bộ Tài chính",
  "source_tier": "Tier 1",
  "source_url": null,
  "source_file_id": "file_003",
  "source_text_extract": "source text parsed from PDF",
  "source_parse_status": "parsed",
  "access_status": "unknown"
}
```

### Rule quan trọng

- `source_order` và `source_title` là required.
- `source_url` là optional vì PDF hiện tại có thể không expose URL.
- `source_file_id` nên có nếu upload source content PDF.
- Nếu không parse được source text, `source_parse_status = unparsed`.

---

## 6. Claim Extraction Output Schema

```json
{
  "parent_task_id": "pt_001",
  "bundle_id": "bundle_001",
  "extraction_version": "claim_extraction_v1",
  "claims": [
    {
      "claim_temp_id": "c1",
      "claim_order": 1,
      "section_name": "Tóm tắt",
      "claim_text": "Thông tư 66/2023/TT-BTC có hiệu lực từ ngày 14/12/2023.",
      "citation_markers": ["1"],
      "source_order_candidates": [1],
      "confidence": 0.88,
      "extraction_note": "Claim extracted from answer summary."
    }
  ]
}
```

---

## 7. LLM Pre-scoring Output Schema

```json
{
  "claim_id": "clm_001",
  "provider": "fixed_provider_mvp",
  "model": "model_name",
  "prompt_version": "pre_score_v1",
  "source_orders_used": [1],
  "scores": {
    "sf": 0.90,
    "sc": 0.85,
    "hr": 0.95,
    "sq": 0.90,
    "rel": 0.92,
    "comp": 0.80
  },
  "rationales": {
    "sf": "Claim khớp với nội dung nguồn.",
    "sc": "Nguồn cover trực tiếp claim.",
    "hr": "Không phát hiện thông tin bịa đặt.",
    "sq": "Nguồn là văn bản pháp luật chính thức.",
    "rel": "Claim liên quan trực tiếp câu hỏi.",
    "comp": "Claim đầy đủ ở mức tốt."
  },
  "confidence": 0.86,
  "raw_response_reference": "llm_raw_001"
}
```

---

## 8. Annotator Submission Schema

```json
{
  "claim_id": "clm_001",
  "annotator_id": "user_ann_001",
  "claim_text_final": "Thông tư 66/2023/TT-BTC có hiệu lực thi hành từ ngày 14/12/2023.",
  "source_access_status": "source_text_parsed",
  "scores": {
    "sf": 1.00,
    "sc": 0.90,
    "hr": 1.00,
    "sq": 0.90,
    "rel": 1.00,
    "comp": 0.85
  },
  "annotator_note": "Source text trong PDF xác nhận ngày hiệu lực.",
  "submitted_at": "2026-06-04T09:00:00Z"
}
```

---

## 9. QA Review Schema

MVP chỉ build QA cơ bản Approve / Return.

```json
{
  "claim_id": "clm_001",
  "qa_id": "user_qa_001",
  "decision": "approved",
  "qa_comment": null,
  "reviewed_at": "2026-06-04T10:00:00Z"
}
```

Return:

```json
{
  "claim_id": "clm_001",
  "qa_id": "user_qa_001",
  "decision": "returned",
  "qa_comment": "Claim cần kiểm tra lại mapping source.",
  "reviewed_at": "2026-06-04T10:00:00Z"
}
```

---

## 10. Export CSV Claim-level Schema

Mỗi row = 1 claim.

| Column | Required | Description |
|---|---:|---|
| `project_id` | Yes | ID dự án |
| `batch_id` | Yes | ID batch upload |
| `bundle_id` | Yes | ID PDF bundle |
| `answer_pdf_filename` | Yes | File answer PDF gốc |
| `source_ref_pdf_filename` | Yes | File source reference PDF |
| `article_code` | Yes | Mã bài |
| `parent_task_id` | Yes | ID parent task |
| `answer_reference` | Yes | Reference tới answer normalized/full text |
| `title` | Yes | Tiêu đề |
| `category` | Optional | Danh mục |
| `confidence_score` | Optional | Confidence từ portal |
| `claim_id` | Yes | ID claim |
| `claim_order` | Yes | Thứ tự claim |
| `section_name` | Optional | Section chứa claim |
| `claim_text_original` | Yes | Claim extraction sinh ra |
| `claim_text_final` | Optional | Claim sau khi sửa |
| `citation_markers` | Optional | `[1];[3]` |
| `mapped_source_orders` | Yes | `1;3` |
| `mapped_source_titles` | Yes | Tên nguồn |
| `source_tiers` | Optional | Tier nguồn |
| `source_file_refs` | Optional | File PDF nguồn liên quan |
| `source_parse_status` | Yes | parsed/unparsed/ocr_required |
| `source_access_status` | Yes | source_text_parsed/inaccessible/unknown |
| `source_note` | Optional | Note nguồn |
| `pre_sf` | Optional | LLM pre-score |
| `pre_sc` | Optional | LLM pre-score |
| `pre_hr` | Optional | LLM pre-score |
| `pre_sq` | Optional | LLM pre-score |
| `pre_rel` | Optional | LLM pre-score |
| `pre_comp` | Optional | LLM pre-score |
| `ann_sf` | Yes | Annotator score |
| `ann_sc` | Yes | Annotator score |
| `ann_hr` | Yes | Annotator score |
| `ann_sq` | Yes | Annotator score |
| `ann_rel` | Yes | Annotator score |
| `ann_comp` | Yes | Annotator score |
| `composite_score` | Yes | Điểm tổng hợp |
| `annotator_id` | Yes | Người annotate |
| `annotator_note` | Optional | Note |
| `qa_id` | Optional | QA reviewer |
| `qa_decision` | Yes | approved/returned |
| `qa_comment` | Optional | Comment QA |
| `status` | Yes | final status |
| `submitted_at` | Yes | Time submit |
| `reviewed_at` | Optional | Time QA |

---

## 11. Export behavior

- Default MVP export: only approved claims.
- Returned claims không export mặc định.
- CSV phải UTF-8.
- Export phải quote đúng text có dấu phẩy/xuống dòng.
- Export bắt buộc có `bundle_id` và file names để trace về PDF gốc.
