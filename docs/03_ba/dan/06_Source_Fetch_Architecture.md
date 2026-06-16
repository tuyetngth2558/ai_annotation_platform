# 06. Kiến trúc Source Fetch — PDF-native MVP (REVISED v2.0)

**Owner:** Phạm Đan Kha  
**Người cập nhật:** Assistant  
**Phiên bản:** v0.5  
**Ngày cập nhật:** 2026-06-09  
**Trạng thái:** Draft — chờ review  

---

## 1. Mục đích

Tài liệu này định nghĩa kiến trúc **SourceFetchService** kết hợp với **ContentRelevanceFilter** — cốt lõi là trích xuất CHỈ những đoạn văn bản LIÊN QUAN đến claim từ URL nguồn (source URL), để tối ưu token cho LLM và tăng độ chính xác chấm điểm.

## 2. Vấn đề đã giải quyết

| Vấn đề | Giải pháp |
|---|---|
| Fetch HTML nhưng toàn là noise (nav, footer, ads) | Site-specific content extractor |
| Source text dài quá (>5000 từ), tốn token | ContentRelevanceFilter — chỉ giữ đoạn liên quan claim |
| URL source không liên quan đến claim | Claim-Source Relevance Verification |
| Không biết claim được đề cập ở đâu trong trang | Keyword matching + semantic similarity |

## 3. Kiến trúc tổng thể

```
Parent Task (1 bài)
    ├── Parse Answer PDF → Claims (với citations)
    ├── Parse Source Ref PDF → source_urls
    │
    └── SourceFetchService
            ├── Cache Hit? → Return source_text
            └── Cache Miss?
                    ├── HTTP GET URL
                    ├── Content-Type = text/html
                    │       ├── thuvienphapluat.vn → Parse HTML bằng CSS selector chuyên biệt
                    │       ├── chinhphu.vn/.gov.vn → Parse bằng semantic HTML5 selector
                    │       └── domain khác → Generic heuristic parser
                    ├── Content-Type = application/pdf → Extract text
                    ├── ContentRelevanceFilter (claim-dependent)
                    │       ├── Chia text thành chunks
                    │       ├── Score mỗi chunk dựa trên overlap với claim
                    │       ├── Chọn top N chunks liên quan nhất
                    │       ├── Deduplicate (Jaccard similarity)
                    │       └── Return: chỉ đoạn text liên quan claim
                    └── [Fallback] Nếu relevance score < threshold → flag source_irrelevant
```

## 4. Content Relevance Filter (Chi tiết)

### Mục tiêu
Từ một trang web dài 5000+ từ, chỉ trích xuất 2-3 đoạn (~200-500 từ) liên quan trực tiếp đến claim.

### Ví dụ minh họa

```
Claim: "Thông tư 66/2023/TT-BTC có hiệu lực từ ngày 14/12/2023."

URL: https://thuvienphapluat.vn/van-ban/Thong-tu-66-2023 (giả định)

Source text (full fetch): 5000 từ về ngân sách, Bộ Tài chính, các văn bản,
                           phần về Thông tư 66 chỉ 2 đoạn ngắn

→ Sau ContentRelevanceFilter:
   Đoạn 1: "Thông tư 66/2023/TT-BTC có hiệu lực thi hành kể từ ngày 14/12/2023..."
   Đoạn 2: "Căn cứ Nghị định 114/2021/NĐ-CP..."

→ Result: ~200 tokens (thay vì 5000), chính xác hơn cho LLM
```

### Implementation

```python
class ContentRelevanceFilter:
    """Extract ONLY the most relevant content for LLM scoring."""
    
    def __init__(self, claim: str, full_text: str, source_domain: str):
        self.claim = claim
        self.full_text = full_text
        self.source_domain = source_domain
    
    def extract_relevant(self, max_tokens: int = 1000) -> str:
        if not self.clain or not self.full_text:
            return ""
        
        # 1. Pre-processing
        clean_text = self._preprocess(self.full_text)
        
        # 2. Chunking (overlapping chunks)
        chunks = self._chunk_text(clean_text)
        
        # 3. Scoring (keyword overlap, weighted by TF-IDF-like importance)
        chunk_scores = []
        claim_words = self._extract_significant_terms(self.claim)
        
        for i, chunk in enumerate(chunks):
            score = self._score_chunk(claim_words, chunk)
            chunk_scores.append((i, score, chunk))
        
        # 4. Select top-N non-overlapping chunks
        chunk_scores.sort(key=lambda x: x[1], reverse=True)
        selected = self._select_top_chunks(chunk_scores, max_tokens)
        
        # 5. Concatenate and return
        return "\n\n...\n\n".join(selected)
    
    def _score_chunk(self, claim_terms: set, chunk: str) -> int:
        """Score a chunk based on overlap with claim terms."""
        chunk_terms = set(chunk.lower().split())
        # Weight: longer matching terms = higher score
        return sum(
            len(term) for term in claim_terms if term in chunk.lower()
        )
```

## 5. Relevance Verification (Claim-Source Match)

Trước khi chấm điểm, xác định xem source có đề cập đến claim không:

```python
def verify_relevance(claim: str, relevant_text: str) -> dict:
    """
    Returns: {
        "is_relevant": bool,      # Source có đề cập đến claim không?
        "relevance_score": float,  # 0.0 - 1.0 (keyword coverage)
        "relevant_text": str       # Chỉ đoạn text liên quan
    }
    """
    if not relevant_text:
        return {"is_relevant": False, "relevance_score": 0.0, "relevant_text": ""}
    
    # Heuristic: nếu không có từ khóa nào của claim trong text → không relevant
    claim_keywords = extract_keywords(claim)
    text_lower = relevant_text.lower()
    
    matches = sum(1 for kw in claim_keywords if kw in text_lower)
    coverage = matches / len(claim_keywords) if claim_keywords else 0
    
    if coverage >= 0.3:  # Có ít nhất 30% từ khóa xuất hiện
        return {"is_relevant": True, "relevance_score": coverage, "relevant_text": relevant_text}
    else:
        return {"is_relevant": False, "relevance_score": 0.0, "relevant_text": relevant_text}
```

## 6. Interfaces

### Database

**SOURCE_REFERENCE** (không thay đổi):
- `source_url` vẫn giữ nguyên
- Không lưu `source_text_fetched` (transient)

**LLM_PRE_SCORE** (bổ sung comment):
- `pre_scoring_rationale` nên ghi rõ nếu source không liên quan
- Ví dụ: `"SC=0.00: Source URL không chứa thông tin về Thông tư 66"`

## 7. Updates cho ERD / Database

**Không cần update ERD** vì source text vẫn không lưu DB.

## 8. References

- `02_Import_Export_Schema.md` — Source Reference schema
- `03_Validation_Rules.md` — VR-FETCH rules
- `09_Source_Content_Extraction_Strategy.md` — Chiến lược trích xuất nội dung chuyên sâu
