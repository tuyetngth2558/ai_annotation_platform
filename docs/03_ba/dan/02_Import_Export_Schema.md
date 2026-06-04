# 02. Import / Export Schema — PDF Bundle Ready

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.3  
**Mục tiêu:** Định nghĩa schema input/output cho MVP sau khi đã khảo sát dữ liệu PDF thực tế.

---

## 1. Kết luận thiết kế import

Dữ liệu thật hiện tại là **PDF bundle**, nhưng MVP 4 tuần nên build import theo hướng:

```text
PDF bundle
→ manual/semi-automated preprocessing
→ normalized CSV/JSON
→ platform import
→ claim extraction
→ pre-scoring
→ annotator review
→ QA review
→ export CSV
```

Platform chưa nhất thiết phải parse PDF trực tiếp trong MVP. Tuy nhiên, normalized input phải giữ reference về PDF gốc.

---

## 2. Raw PDF Bundle Schema

Một bundle tương ứng với một bài/câu trả lời LLM.

| Field | Required | Type | Description |
|---|---:|---|---|
| `bundle_id` | Yes | string/uuid | ID nội bộ cho bộ input |
| `bundle_name` | Yes | string | Tên bundle, ví dụ `ODA_001` |
| `answer_pdf_file` | Yes | file ref | PDF câu trả lời nguyên bản |
| `source_ref_pdf_file` | Yes | file ref | PDF danh sách nguồn tham khảo |
| `source_content_pdf_files` | Optional/Yes | file ref list | Một hoặc nhiều PDF nội dung nguồn |
| `uploaded_by` | Yes | user id | Người upload/preprocess |
| `uploaded_at` | Yes | datetime | Thời điểm upload |
| `metadata_json` | Optional | json | Metadata phụ |

---

## 3. Normalized Import CSV Schema

Mỗi row = một Parent Task / một bài LLM answer đã normalize từ PDF bundle.

| Column | Required | Type | Example | Description |
|---|---:|---|---|---|
| `bundle_id` | Yes | string | `bundle_001` | ID bộ PDF gốc |
| `article_code` | Yes | string | `ENC_20260512_375DE786` | Mã bài trong portal |
| `project_code` | Yes | string | `vivipedia` | MVP fixed |
| `title` | Yes | string | `Thanh toán chi phí dự án ODA...` | Tiêu đề bài |
| `category` | Optional | string | `Hành chính` | Danh mục |
| `tier` | Optional | string | `T3` | Tầng |
| `confidence_score` | Optional | decimal | `0.10` | Confidence score từ portal |
| `created_date` | Optional | date | `2026-05-12` | Ngày tạo |
| `answer_text_raw` | Yes | text | `...` | Text parse thô từ PDF |
| `answer_text_normalized` | Yes | text | `...` | Text đã loại bỏ UI noise |
| `source_list_json` | Yes | json string | `[{"source_order":1,...}]` | Danh sách nguồn |
| `raw_file_refs_json` | Yes | json string | `{"answer_pdf":"1.pdf",...}` | Reference tới PDF gốc |
| `metadata_json` | Optional | json string | `{}` | Metadata phụ |

---

## 4. `source_list_json` structure

```json
[
  {
    "source_order": 1,
    "source_title": "Thông tư số 66/2023/TT-BTC của Bộ Tài chính",
    "source_tier": "Tier 1",
    "source_url": null,
    "source_file_ref": "1-1(1).pdf",
    "source_text_ref": "source_text_001",
    "parse_status": "parsed"
  }
]
```

### Source fields

| Field | Required | Description |
|---|---:|---|
| `source_order` | Yes | Số thứ tự nguồn, dùng để map citation `[1]` |
| `source_title` | Yes | Tiêu đề nguồn |
| `source_tier` | Optional | Tier 1, Tier 3 |
| `source_url` | Optional | URL nếu parse được |
| `source_file_ref` | Optional | File PDF nội dung nguồn |
| `source_text_ref` | Optional | Reference tới text extract |
| `parse_status` | Yes | parsed / unparsed / missing / unknown |

---

## 5. Claim Extraction Output Schema

```json
{
  "parent_task_id": "pt_001",
  "bundle_id": "bundle_001",
  "article_code": "ENC_20260512_375DE786",
  "extraction_version": "claim_extraction_v1",
  "claims": [
    {
      "claim_temp_id": "c1",
      "claim_order": 1,
      "claim_text": "Thông tư 66/2023/TT-BTC có hiệu lực từ ngày 14/12/2023.",
      "citation_markers": ["1", "3"],
      "source_order_candidates": [1, 3],
      "confidence": 0.86,
      "extraction_note": "Claim extracted from summary section."
    }
  ]
}
```

### Claim extraction rules

| Rule | Description |
|---|---|
| CE-001 | Một Parent Task phải sinh ít nhất 1 claim |
| CE-002 | Mỗi claim phải có `claim_order` |
| CE-003 | Claim text không được rỗng |
| CE-004 | Citation markers trong answer nên được giữ lại |
| CE-005 | Nếu claim không có source candidate, status = `source_mapping_required` |
| CE-006 | Annotator/QA được sửa claim text |
| CE-007 | Luôn lưu original và final claim text |

---

## 6. LLM Pre-scoring Output Schema

```json
{
  "claim_id": "clm_001",
  "provider": "fixed_provider_mvp",
  "model": "model_name",
  "prompt_version": "pre_score_v1",
  "scores": {
    "sf": 0.85,
    "sc": 0.75,
    "hr": 0.90,
    "sq": 0.80,
    "rel": 0.88,
    "comp": 0.70
  },
  "rationales": {
    "sf": "Claim phần lớn khớp với nguồn.",
    "sc": "Nguồn hỗ trợ một phần.",
    "hr": "Không thấy dấu hiệu hallucination rõ.",
    "sq": "Nguồn tương đối đáng tin cậy.",
    "rel": "Claim liên quan trực tiếp đến câu hỏi.",
    "comp": "Claim chưa bao phủ đủ toàn bộ khía cạnh."
  },
  "source_orders_used": [1, 3],
  "confidence": 0.82,
  "raw_response_reference": "llm_raw_001"
}
```

---

## 7. Annotator Submission Schema

```json
{
  "claim_id": "clm_001",
  "annotator_id": "user_001",
  "claim_text_final": "Thông tư 66/2023/TT-BTC có hiệu lực thi hành từ ngày 14/12/2023.",
  "source_access_status": "accessible",
  "scores": {
    "sf": 1.00,
    "sc": 0.90,
    "hr": 1.00,
    "sq": 0.90,
    "rel": 1.00,
    "comp": 0.85
  },
  "annotator_note": "Nguồn [1] nêu rõ hiệu lực thi hành từ ngày 14/12/2023.",
  "submitted_at": "2026-06-04T09:00:00Z"
}
```

---

## 8. QA Review Schema

MVP plan mới nhất chỉ build QA cơ bản Approve / Return.

```json
{
  "claim_id": "clm_001",
  "qa_id": "user_qa_001",
  "decision": "approved",
  "qa_comment": null,
  "reviewed_at": "2026-06-04T10:00:00Z"
}
```

Nếu Return:

```json
{
  "claim_id": "clm_001",
  "qa_id": "user_qa_001",
  "decision": "returned",
  "qa_comment": "Claim cần kiểm tra lại source [3], chưa đủ căn cứ.",
  "reviewed_at": "2026-06-04T10:00:00Z"
}
```

---

## 9. Export CSV Claim-level Schema

Mỗi row = một claim.

| Column | Required | Description |
|---|---:|---|
| `project_id` | Yes | ID dự án |
| `batch_id` | Yes | ID batch |
| `bundle_id` | Yes | ID bộ PDF gốc |
| `article_code` | Yes | Mã bài portal |
| `parent_task_id` | Yes | ID parent task |
| `answer_reference` | Yes | Reference tới full answer, không lặp full text |
| `title` | Yes | Tiêu đề bài |
| `category` | Optional | Danh mục |
| `confidence_score` | Optional | Confidence từ portal |
| `claim_id` | Yes | ID claim |
| `claim_order` | Yes | Thứ tự claim |
| `claim_text_original` | Yes | Claim do extraction tạo |
| `claim_text_final` | Optional | Claim sau khi sửa |
| `citation_markers` | Optional | Ví dụ `[1][3]` |
| `mapped_source_orders` | Yes | Ví dụ `1;3` |
| `mapped_source_titles` | Yes | Tiêu đề nguồn |
| `source_tiers` | Optional | Tier 1;Tier 3 |
| `source_access_status` | Yes | accessible / inaccessible / unparsed / unknown |
| `source_note` | Optional | Ghi chú nguồn |
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
| `qa_decision` | Yes | approved / returned |
| `qa_comment` | Optional | Comment nếu return |
| `status` | Yes | final status |
| `submitted_at` | Yes | Thời gian submit |
| `reviewed_at` | Optional | Thời gian QA |

---

## 10. Export rule

- Default MVP: export only `approved` claims.
- Nếu stakeholder cần kiểm tra returned task, có thể thêm filter export all statuses.
- Export phải giữ trace:
  - `bundle_id`
  - `article_code`
  - `mapped_source_orders`
  - `answer_reference`
