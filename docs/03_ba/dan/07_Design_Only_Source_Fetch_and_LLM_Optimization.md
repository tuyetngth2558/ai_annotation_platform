# 07. Design-Only — Source Fetch & LLM Optimization

**Owner:** Phạm Đan Kha  
**Phiên bản:** v0.6  
**Cập nhật:** 2026-06-12  
**Trạng thái:** Design-Only / Post-MVP

---

## 1. Vì sao tài liệu này là Design-Only?

Baseline MVP theo Quang AC ưu tiên PDF-native:

```text
Source Content PDF → source_text_extract → Annotator/LLM review
```

Hyperlink URL trong Source Reference PDF là optional metadata. MVP không phụ thuộc realtime URL fetch, site-specific HTML parser, relevance filter, multi-claim batching hay token-cost tracking để hoàn thành end-to-end.

Vì vậy các nội dung trước đây ở:

- `06_Source_Fetch_Architecture.md`
- `07_LLM_PreScoring_Spec.md`
- `09_Source_Content_Extraction_Strategy.md`

được gộp và hạ xuống tài liệu Design-Only này.

---

## 2. MVP Rule — Source Evidence Priority

| Priority | Source | MVP behavior |
|---:|---|---|
| 1 | `source_text_extract` từ Source Content PDF | Evidence chính cho LLM pre-score và annotator review |
| 2 | `source_url` từ Source Ref hyperlink | Optional reference link; hiển thị nếu parse được |
| 3 | Manual/source mapping note | Dùng khi PDF source text thiếu hoặc mapping chưa rõ |
| 4 | Realtime URL fetch | Post-MVP only |

Fallback một chiều:

```text
PDF source text parsed
→ nếu thiếu: dùng source metadata + optional URL để annotator tham khảo
→ nếu vẫn không đủ: unknown/inaccessible + note
→ nếu inaccessible: SC = 0.00
```

Không dùng realtime fetch để ghi đè dữ liệu PDF parse trong MVP.

---

## 3. Post-MVP SourceFetchService

Khi đủ scope, có thể thiết kế `SourceFetchService`:

```text
source_url
→ HTTP GET
→ detect content type
→ extract main content
→ optional site-specific parser
→ relevance filter by claim
→ return fetched_source_text with trace
```

Design rules:

- Không ghi đè `source_text_extract` từ PDF.
- Lưu trace riêng: URL, fetch timestamp, HTTP status, extractor version, fallback reason.
- Cache theo job/session để giảm rate limit.
- Fallback về Source Content PDF nếu fetch fail.

---

## 4. Post-MVP Content Extraction Strategy

Domain-specific parser có thể ưu tiên:

| Domain | Strategy |
|---|---|
| `thuvienphapluat.vn` | CSS selector cho vùng văn bản pháp luật chính |
| `chinhphu.vn` / `.gov.vn` | `article`, `main`, hoặc content container |
| Generic domain | Paragraph density, text-to-link ratio, remove nav/footer |

Relevance filtering:

1. Clean main text.
2. Chunk text.
3. Score chunks theo keyword overlap hoặc semantic similarity với claim.
4. Chọn top chunks.
5. Deduplicate chunks.
6. Return excerpts only.

---

## 5. Post-MVP LLM Optimization

Các tối ưu sau không bắt buộc MVP:

| Optimization | Purpose | MVP status |
|---|---|---|
| Multi-claim batching | Giảm API calls | Optional/Post-MVP |
| Token counting before request | Tránh context overflow | Optional/Post-MVP |
| Source dedup in prompt | Giảm token | Optional/Post-MVP |
| Cost tracking per API call | Theo dõi chi phí | Optional/Post-MVP |
| Relevance verifier | Chấm SC=0 nếu source không liên quan | Optional/Post-MVP |

Nếu bật batching, áp dụng rule mềm:

```text
estimated_tokens(system + claims + sources + output_budget) < 80% context window
```

Nếu vượt, split batch.

---

## 6. References

- `02_Import_Export_Schema.md` §4 — Source fallback canonical rule
- `03_Validation_Rules.md` §10 — VR-FETCH Post-MVP
- `04_Edge_Cases.md` §9 — EC-FETCH Post-MVP
- `05_Data_Risk_Notes.md` — DR-014..016
