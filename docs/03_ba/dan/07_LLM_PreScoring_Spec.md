# 07. Kiến trúc LLM Pre-Scoring — PDF-native MVP (REVISED v2.0)

**Owner:** Phạm Đan Kha
**Người cập nhật:** Assistant
**Phiên bản:** v0.5
**Ngày cập nhật:** 2026-06-09
**Trạng thái:** Draft — chờ review

---

## 1. Mục đích

Tài liệu này định nghĩa cơ chế **gọi LLM API** để chấm pre-score cho các claim, với sự tối ưu hóa token thuyen qua:

1. **Multi-claim batching** — gửi nhiều claim trong 1 API call
2. **Content relevance filtering** — chỉ gửi đoạn văn LIÊN QUAN đến claim (không gửi toàn bộ trang web)
3. **Source deduplication** — source được reuse chỉ tính token 1 lần
4. **Token counting trung gian** — chia batch đảm bảo không vượt context window

## 2. Luồng Pre-Scoring (Updated với Relevance Filter)

```
Parent Task (1 bài = N claims)
    |
    ├── Step 1: Source Fetch (per unique source URL)
    │       ├── HTTP GET URL
    │       ├── Parse HTML / PDF
    │       ├── ContentRelevanceFilter (claim-dependent!)
    │       │       ├── Chia source_text thành chunks
    │       │       ├── Score mỗi chunk vs claim
    │       │       ├── Chọn top-N chunks liên quan
    │       │       ├── Deduplicate
    │       │       └── Relevance Verification
    │       │               ├── Nếu relevant_score == 0: flag source_irrelevant
    │       │               └── SC sẽ = 0.00
    │       └── Cache source_text đã filter
    │
    └── Step 2: LLM Pre-scoring (per batch)
            ├── Batch Builder
            │       ├── Count tokens (system + claims + filtered_sources)
            │       ├── Nếu < 80% context window → 1 API call
            │       └── Nếu > 80% → split thành 2+ batches
            ├── Call LLM API (batch multi-claim)
            ├── Parse JSON output (6 scores + rationale)
            ├── Validate (VR-LLM-001..007)
            └── Save to DB
```

## 3. landing cho Step 1: Source Fetch với Relevance Filter

### Ví dụ minh họa (sau khi áp dụng Relevance Filter)

```
Claim: "Thông tư 66/2023/TT-BTC có hiệu lực từ ngày 14/12/2023."

Source URL: https://thuvienphapluat.vn/van-ban/Thong-tu-66-2023 (giả định)

BEFORE (fetch toàn bộ HTML):
    Input cho LLM: 5000+ tokens về ngân sách, Bộ Tài chính,
                    các văn bản pháp luật khác
    -> LLM confused, không
difference focus vào đâu

AFTER (sau ContentRelevanceFilter):
    Input cho LLM:
        "Thông tư 66/2023/TT-BTC có hiệu lực thi hành kể từ ngày 14/12/2023.
        Căn cứ Nghị định 114/2021/NĐ-CP..."
    -> Chỉ ~200 tokens, chính xác, dễ đánh giá
```

## 4. Chi tiết Step 2: LLM Pre-Scoring với Batching

### Cập nhật User Prompt (per batch)

```markdown
## CLAIMS TO EVALUATE

### Claim 1 [ID: clm_001]
**Claim Text:** "Thông tư 66/2023/TT-BTC có hiệu lực từ ngày 14/12/2023."
**Citations:** [1]

### Claim 2 [ID: clm_002]
**Claim Text:** "Các đơn vị phải cập nhật hồ sơ thanh toán theo tiêu chuẩn mới."
**Citations:** [1], [2]

## SOURCE TEXTS (Relevant excerpts only)

### Source [1] (URL: ...)
**Relevant Text:**
`Thông tư 66/2023/TT-BTC có hiệu lực thi hành kể từ ngày 14/12/2023...
Các đơn vị phải cập nhật hồ sơ thanh toán theo tiêu chuẩn mới...`
[Đã được filtered chỉ giữ lại đoạn liên quan claim 1 và claim 2]

### Source [2] (URL: ...)
**Relevant Text:**
`Theo Nghị định 114/2021/NĐ-CP, các cơ quan phải tuân thủ...`

## INSTRUCTION
Evaluate each claim against the provided RELEVANT source text excerpts.
Focus on whether the claim is supported by the extracted source text.
```

## 5. Cập nhật Prompt cho trường hợp Source không liên quan

Thêm vào System Prompt:

```markdown
## XỬ LÝ SOURCE KHÔNG LIÊN QUAN

Nếu source text KHÔNG chứa thông tin liên quan đến claim:
- SC (Source Coverage) = 0.00
- Rationale: "Source URL không chứa thông tin về [chủ đề claim]"
```

## 6. Token Optimization (Recap)

| Metric | Trước (Full HTML) | Sau (Relevance Filter) |
|---|---|---|
| Tokens per source | 5000+ | 200-500 |
| Tokens saved | - | ~90% |
| Claims per batch | ~5 | ~20-50 |
| API calls per article | 2-3 | 1-2 |
| Độ chính xác | Trung bình (noise) | Cao (clean) |

## 7. Error Handling Updates

| Error | Hành vi |
|---|---|
| Source không liên quan (relevance_score = 0) | Chấm SC=0.00, flag trong rationale |
| Source text rỗng sau filter | Chấm SC=0.00, ghi note "Source không có nội dung liên quan" |
| Source fetch fail + fallback cũng không có | Chấm SC=0.00, ghi note "Không thể truy cập source" |

## 8. References

- `06_Source_Fetch_Architecture.md` — Relevance Filter chi tiết
- `09_Source_Content_Extraction_Strategy.md` — Chiến lược trích xuất nội dung
- `02_Import_Export_Schema.md` — LLM Pre-scoring output schema