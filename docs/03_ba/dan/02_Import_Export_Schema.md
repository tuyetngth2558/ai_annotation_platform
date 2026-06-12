# 02. Import / Export Schema — PDF-native MVP

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.6  
**Cập nhật:** 2026-06-12  
**Baseline:** PDF Bundle import · Excel output theo mẫu Vivipedia TA · CSV claim-level kỹ thuật

---

## 1. Luồng import chính thức cho MVP

```text
PDF Bundle Upload
→ Validate required PDF files
→ Parse PDF files
→ Normalize answer/source data internally
→ Create Parent Task
→ Extract Source References
→ Claim Extraction (LLM #1)
→ Source Mapping
→ LLM Pre-scoring (LLM #2)
→ Annotator Review
→ Article Evaluation
→ QA Review
→ Export Excel workbook + optional CSV claim-level
```

CSV/JSON không phải input chính từ user. Hệ thống vẫn có internal normalized data để lưu DB, chạy LLM, review, QA và export.

---

## 2. PDF Bundle Upload Schema

### 2.1. Bundle-level request

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

### 2.2. File roles

| `file_role` | Required | Số lượng | Mô tả |
|---|---:|---:|---|
| `answer_pdf` | Yes | 1 | PDF câu trả lời/bài viết nguyên bản |
| `source_ref_pdf` | Yes | 1 | PDF danh sách nguồn, source order, title, tier và hyperlink nếu có |
| `source_content_pdf` | Yes | 1+ | PDF nội dung nguồn/văn bản gốc để đối chiếu |

---

## 3. PDF Parse Result Schema

```json
{
  "bundle_id": "bundle_001",
  "parser_version": "pdf_parser_v1",
  "parse_status": "parsed_with_warnings",
  "metadata_extracted": {
    "article_code": "ENC_20260512_375DE786",
    "article_url": "https://portal.v-app.vn/apps/miniportal.vsf.wikicms/articles/6040...",
    "title": "Thanh toán chi phí dự án ODA theo Nghị định 114/2021/NĐ-CP",
    "domain": "Pháp luật",
    "subdomain": "Hành chính",
    "subdomain_id": "law_03",
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
      "source_url": "https://chinhphu.vn/...",
      "source_url_origin": "source_ref_pdf_hyperlink",
      "source_file_ref": "1-1(1).pdf",
      "source_text_extract": "parsed source text",
      "source_parse_status": "parsed"
    }
  ],
  "parse_warnings": [
    {
      "warning_code": "SOURCE_URL_MISSING",
      "message": "Source title parsed but source URL not found in Source Reference PDF."
    }
  ]
}
```

---

## 4. Source Rule — Ref Hyperlink URL vs Source Content PDF

Rule canonical cho MVP theo Quang AC:

1. `source_content_pdf` là nguồn chứng cứ chính để annotator/LLM đối chiếu claim qua `source_text_extract`.
2. Hyperlink URL parse từ `source_ref_pdf` chỉ là metadata tham chiếu/phụ trợ trong MVP. Thiếu URL không block import.
3. Hệ thống không yêu cầu annotator mở URL ngoài để submit.
4. Nếu có URL, UI hiển thị URL như link tham khảo; không dùng URL fetch realtime để ghi đè `source_text_extract` trong MVP.
5. Source fetch realtime, site-specific parser và relevance filtering là Design-Only/Post-MVP. Nếu sau này bật, kết quả fetch phải lưu trace riêng và không làm mất dữ liệu PDF gốc.

Fallback chain một chiều:

```text
Source Content PDF parsed text
→ nếu không parse được: Source Ref metadata + optional hyperlink URL để annotator tham khảo
→ nếu vẫn không đủ căn cứ: source_access_status = unknown hoặc inaccessible
→ nếu inaccessible: SC = 0.00 và source_note bắt buộc
→ nếu claim không map được source: source_mapping_required trước khi vào annotation queue
```

Không fallback ngược theo kiểu fetch URL rồi sửa lại source order/title/tier đã parse từ PDF.

---

## 5. Internal Parent Task Schema

```json
{
  "parent_task_id": "pt_001",
  "bundle_id": "bundle_001",
  "batch_id": "batch_001",
  "article_code": "ENC_20260512_375DE786",
  "article_url": "https://portal.v-app.vn/apps/miniportal.vsf.wikicms/articles/6040...",
  "title": "Thanh toán chi phí dự án ODA theo Nghị định 114/2021/NĐ-CP",
  "domain": "Pháp luật",
  "subdomain": "Hành chính",
  "subdomain_id": "law_03",
  "tier": "T3",
  "confidence_score": 0.10,
  "created_date": "2026-05-12",
  "answer_text_normalized": "cleaned answer text",
  "answer_reference": "answer_ref_001",
  "status": "claim_extracting"
}
```

---

## 6. Source Reference Schema

```json
{
  "source_id": "src_001",
  "parent_task_id": "pt_001",
  "source_order": 1,
  "source_title": "Thông tư số 66/2023/TT-BTC của Bộ Tài chính",
  "source_tier": "Tier 1",
  "source_url": "https://chinhphu.vn/...",
  "source_url_origin": "source_ref_pdf_hyperlink",
  "source_file_id": "file_003",
  "source_text_extract": "source text parsed from PDF",
  "source_parse_status": "parsed",
  "source_access_status": "source_text_parsed"
}
```

Rules:

| Field | Rule |
|---|---|
| `source_order` | Required, unique within `parent_task_id`, starts at 1 |
| `source_title` | Required |
| `source_tier` | Optional; if unknown, set `unknown` |
| `source_url` | Optional; must be `http/https` if present |
| `source_url_origin` | `source_ref_pdf_hyperlink`, `manual`, `post_mvp_fetch`, or `unknown` |
| `source_text_extract` | Preferred evidence text from Source Content PDF |
| `source_parse_status` | `parsed`, `unparsed`, `ocr_required`, `failed`, `unknown` |
| `source_access_status` | `source_text_parsed`, `inaccessible`, `unknown` |

---

## 7. Claim Extraction Output Schema

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

## 8. LLM Pre-scoring Output Schema

MVP platform vẫn có thể pre-score đủ 6 dimension để hỗ trợ UI, nhưng Excel TA mẫu tách 4 metric claim-level và 2 metric article-level. Nếu Dev chỉ build theo Excel mẫu, `rel`/`comp` nên lấy từ `article_evaluation`, không lấy từ từng claim.

```json
{
  "claim_id": "clm_001",
  "provider": "gemini",
  "model": "gemini-2.5-flash",
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
    "rel": "Article liên quan trực tiếp câu hỏi.",
    "comp": "Article đầy đủ ở mức tốt."
  },
  "confidence": 0.86,
  "raw_response_reference": "llm_raw_001"
}
```

**Platform deviation cần ghi rõ:** nếu UI chấm `REL`/`COMP` trên từng claim, đó là biến thể platform để hỗ trợ workflow nội bộ. Khi export Excel theo mẫu TA, `REL`/`COMP` phải aggregate hoặc lấy từ bảng `article_evaluation`, không đưa vào sheet `Annotation`.

---

## 9. Annotator Submission Schema

```json
{
  "claim_id": "clm_001",
  "annotator_id": "user_ann_001",
  "claim_text_final": "Thông tư 66/2023/TT-BTC có hiệu lực thi hành từ ngày 14/12/2023.",
  "fact_check_status": "XAC_NHAN",
  "fact_check_source_url": "https://chinhphu.vn/...",
  "source_access_status": "source_text_parsed",
  "scores": {
    "sf": 1.00,
    "sc": 0.90,
    "hr": 1.00,
    "sq": 0.90
  },
  "annotator_note": "SF=1.00: Source text trong PDF xác nhận ngày hiệu lực.\nSC=0.90: Nguồn cover trực tiếp claim.\nHR=1.00: Không có hallucination.\nSQ=0.90: Nguồn chính phủ.",
  "submitted_at": "2026-06-04T09:00:00Z"
}
```

`fact_check_status` export ra Excel theo giá trị tiếng Việt không dấu để dễ filter:

| Platform enum | Excel display |
|---|---|
| `confirmed` | `XAC NHAN` |
| `deviated` | `LECH` |
| `contradicted` | `MAU THUAN` |
| `not_found` | `KHONG TIM THAY` |
| `skipped` | `BO QUA` |

---

## 10. Article Evaluation Schema

Sheet `Article Evaluation` trong Excel mẫu là cấp bài, không phải cấp claim. Platform cần entity riêng hoặc view riêng:

```json
{
  "article_evaluation_id": "ae_001",
  "parent_task_id": "pt_001",
  "bundle_id": "bundle_001",
  "article_title": "Thanh toán chi phí dự án ODA theo Nghị định 114/2021/NĐ-CP",
  "article_url": "https://portal.v-app.vn/apps/miniportal.vsf.wikicms/articles/6040...",
  "domain": "Pháp luật",
  "subdomain": "Hành chính",
  "rel": 0.75,
  "rel_band": "Good",
  "rel_note": "Bài trả lời đúng trọng tâm nhưng chưa đi sâu quy trình thanh toán.",
  "comp": 0.65,
  "comp_band": "Borderline",
  "comp_note": "Thiếu hồ sơ, bước thực hiện và đối tượng áp dụng.",
  "note": null,
  "annotator_id": "anhpt244",
  "evaluated_at": "2026-05-13"
}
```

Band rule:

| Score range | Band |
|---|---|
| `0.00–0.24` | `Block` |
| `0.25–0.49` | `Poor` |
| `0.50–0.74` | `Borderline` |
| `0.75–0.89` | `Good` |
| `0.90–1.00` | `Excellent` |

---

## 11. QA Review Schema

```json
{
  "claim_id": "clm_001",
  "qa_id": "user_qa_001",
  "decision": "returned",
  "error_category": "incorrect_source_status",
  "qa_comment": "Claim cần kiểm tra lại mapping source.",
  "reviewed_at": "2026-06-04T10:00:00Z"
}
```

Rules:

| Field | Rule |
|---|---|
| `decision` | `approved` or `returned` only |
| `error_category` | Required when `decision = returned` |
| `qa_comment` | Required when `decision = returned`, trim length >= 10 |
| QA edit score | Not allowed in MVP |

Allowed `error_category`:

| Value | Meaning |
|---|---|
| `wrong_score` | Sai điểm số |
| `missing_notes` | Thiếu ghi chú/justification |
| `incorrect_source_status` | Sai trạng thái nguồn |
| `bad_claim_text` | Claim text chưa đúng |

---

## 12. Excel Export Workbook Schema

MVP cần export được `.xlsx` theo format mẫu `[Vivipedia] - Annonate Output - TA - 13.5.xlsx`.

### 12.1. Sheet list

| Sheet | Build source | Required in export | Notes |
|---|---|---:|---|
| `Scoring Guide` | Static template | Yes | Rubric definitions and score anchors |
| `Domain-Subdomain List` | Static seed/template | Yes | 13 domains, 69 sub-domains; dropdown source |
| `Annotation` | Claim tasks + submissions | Yes | 1 row = 1 claim; only `SF/SC/HR/SQ` |
| `Article Evaluation` | `article_evaluation` | Yes | 1 row = 1 article; `REL/COMP` |
| `Summary Dashboard` | Excel formulas/pivots | Yes | Auto-calculated from other sheets |

### 12.2. Sheet `Annotation` mapping

| Excel col | Excel header | Platform field | CSV/debug field | Required |
|---|---|---|---|---:|
| A | `#` | `claim_task.claim_order` or export row index | `claim_order` | Yes |
| B | `Article / Page Title` | `parent_task.title` | `title` | Yes |
| C | `Domain` | `parent_task.domain` | `domain` | Yes |
| D | `Sub-domain` | `parent_task.subdomain` | `subdomain` | Yes |
| E | `Sub-domain / ID` | `parent_task.subdomain_id` | `subdomain_id` | Yes |
| F | `Claim (block nguyên văn)` | `claim_task.claim_text_final` fallback `claim_text_original` | `claim_text_final` | Yes |
| G | `Fact-check / Status` | `annotation_submission.fact_check_status` | `fact_check_status` | Yes |
| H | `Fact-check / Source URL` | joined `source_reference.source_url` from mapped sources | `fact_check_source_url` | Optional |
| I | `Source / Fidelity / (SF)` | `annotation_submission.sf` | `ann_sf` | Yes |
| J | `Source / Coverage / (SC)` | `annotation_submission.sc` | `ann_sc` | Yes |
| K | `Hallucination / Rate (HR) / (inv.)` | `annotation_submission.hr` | `ann_hr` | Yes |
| L | `Source / Quality / (SQ)` | `annotation_submission.sq` | `ann_sq` | Yes |
| M | `Annotator Notes` | `annotation_submission.annotator_note` | `annotator_note` | Optional |
| N | `Annotator / ID` | `annotation_submission.annotator_id` | `annotator_id` | Yes |
| O | `Date` | `annotation_submission.submitted_at` as date | `submitted_date` | Yes |
| P | Reserved/blank in current template | blank | n/a | No |
| Q | Reserved/blank in current template | blank | n/a | No |
| R | Reserved/blank in current template | blank | n/a | No |

### 12.3. Sheet `Article Evaluation` mapping

| Excel col | Excel header | Platform field | CSV/debug field | Required |
|---|---|---|---|---:|
| A | `#` | row index per article | `article_row_index` | Yes |
| B | `Tên bài viết` | `parent_task.title` | `title` | Yes |
| C | `URL bài` | `parent_task.article_url` | `article_url` | Optional |
| D | `Domain` | `parent_task.domain` | `domain` | Yes |
| E | `Sub-domain` | `parent_task.subdomain` | `subdomain` | Yes |
| F | `Rel / (0-1)` | `article_evaluation.rel` | `article_rel` | Yes |
| G | `Rel Band / (auto)` | formula from `rel` | `article_rel_band` | Auto |
| H | `Nhận xét Relevance` | `article_evaluation.rel_note` | `article_rel_note` | Optional |
| I | `Comp / (0-1)` | `article_evaluation.comp` | `article_comp` | Yes |
| J | `Comp Band / (auto)` | formula from `comp` | `article_comp_band` | Auto |
| K | `Nhận xét Completeness` | `article_evaluation.comp_note` | `article_comp_note` | Optional |
| L | `Note` | `article_evaluation.note` | `article_note` | Optional |
| M | `Annotator / ID` | `article_evaluation.annotator_id` | `article_annotator_id` | Yes |
| N | `Ngày` | `article_evaluation.evaluated_at` | `article_evaluated_date` | Yes |

---

## 13. CSV Claim-level Schema

CSV là technical/debug export phẳng. Excel workbook là deliverable chính cho stakeholder theo mẫu TA.

| Column | Required | Description |
|---|---:|---|
| `project_id` | Yes | ID dự án |
| `batch_id` | Yes | ID batch upload |
| `bundle_id` | Yes | ID PDF bundle |
| `answer_pdf_filename` | Yes | File answer PDF gốc |
| `source_ref_pdf_filename` | Yes | File source reference PDF |
| `article_code` | Yes | Mã bài |
| `article_url` | Optional | URL bài trên portal nếu parse/nhập được |
| `parent_task_id` | Yes | ID parent task |
| `answer_reference` | Yes | Reference tới answer normalized/full text |
| `title` | Yes | Tiêu đề |
| `domain` | Yes | Domain theo Vivipedia |
| `subdomain` | Yes | Sub-domain |
| `subdomain_id` | Optional | ID sub-domain, ví dụ `law_03` |
| `category` | Optional | Backward-compatible category field |
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
| `source_urls` | Optional | URL nguồn, joined by `;` |
| `source_file_refs` | Optional | File PDF nguồn liên quan |
| `source_parse_status` | Yes | `parsed/unparsed/ocr_required/failed/unknown` |
| `source_access_status` | Yes | `source_text_parsed/inaccessible/unknown` |
| `source_note` | Optional | Note nguồn |
| `fact_check_status` | Yes | `confirmed/deviated/contradicted/not_found/skipped` |
| `fact_check_source_url` | Optional | URL dùng trong Excel col H |
| `pre_sf` | Optional | LLM pre-score |
| `pre_sc` | Optional | LLM pre-score |
| `pre_hr` | Optional | LLM pre-score |
| `pre_sq` | Optional | LLM pre-score |
| `pre_rel` | Optional | LLM pre-score article/platform deviation |
| `pre_comp` | Optional | LLM pre-score article/platform deviation |
| `ann_sf` | Yes | Annotator score |
| `ann_sc` | Yes | Annotator score |
| `ann_hr` | Yes | Annotator score |
| `ann_sq` | Yes | Annotator score |
| `article_rel` | Optional | From article evaluation |
| `article_comp` | Optional | From article evaluation |
| `claim_composite_score` | Optional | Average of `SF/SC/HR/SQ` if needed |
| `article_composite_score` | Optional | Average of `REL/COMP` if needed |
| `annotator_id` | Yes | Người annotate |
| `annotator_note` | Optional | Note |
| `qa_id` | Optional | QA reviewer |
| `qa_decision` | Yes | `approved/returned` |
| `error_category` | Required if returned | QA return category |
| `qa_comment` | Optional | Comment QA |
| `status` | Yes | Final status |
| `submitted_at` | Yes | Time submit |
| `reviewed_at` | Optional | Time QA |

---

## 14. Export behavior

- Default stakeholder export: Excel workbook `.xlsx` theo sheet/column ở §12.
- Optional technical export: CSV claim-level theo §13.
- Export chỉ lấy task `approved` theo default MVP.
- Returned/submitted/in-annotation không export mặc định.
- CSV phải UTF-8, quote đúng text có dấu phẩy/xuống dòng.
- Excel phải giữ sheet names, header rows, formulas/bands và dashboard summary giống template.
- Export bắt buộc trace được về `bundle_id`, PDF filenames, `article_code` và `parent_task_id`.
