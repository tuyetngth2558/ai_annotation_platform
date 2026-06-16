# 09. Chiến lược Trích xuất Nội dung Nguồn (Source Content Extraction Strategy)

**Owner:** Phạm Đan Kha  
**Phiên bản:** v1.0  
**Cập nhật:** 2026-06-09  
**Trạng thái:** Draft — chờ review  

---

## 1. Tóm tắt Vấn đề

Khi fetch content từ URL (đặc biệt là `thuvienphapluat.vn`, `chinhphu.vn`, `.gov.vn`), gặp phải các vấn đề:

| Vấn đề | Mô tả | Ảnh hưởng |
|---|---|---|
| **HTML Noise** | Trang web có nhiều thành phần không liên quan: navigation, footer, sidebar, ads | Source text dài, nhiều noise, tốn token |
| **Long-form Content** | Văn bản pháp luật dài, có thể lên đến 20K+ tokens | Vượt context window nếu gửi toàn bộ |
| **Irrelevant Content** | Claim nói về "Thông tư 66", nhưng source là trang tổng hợp danh sách thông tư (không phải nội dung thông tư) | LLM chấm sai vì không có context đúng |
| **Not found/404** | URL trong source_ref_pdf có thể hỏng, hoặc dẫn đến trang không liên quan | Cần xác định và chấm SC=0 |

## 2. Chiến lược Giải quyết: Site-Specific Parsing + Smart Filtering

### Phase 1: Site-Specific Content Extraction (Parser chuyên biệt)

Với mỗi domain phổ biến, xây dựng parser riêng để trích xuất **main content** chính xác.

**thuvienphapluat.vn:**

```python
# Selector cho thuvienphapluat.vn
content_area = soup.select_one('div#ctl00_Content_ThongTinVB_pnlDocContent')
# Hoặc tìm div chứa class liên quan đến văn bản
```

**chinhphu.vn (typical .gov.vn):**

```python
# Selector cho chinhphu.vn (semantic HTML5)
content_area = soup.select_one('article') or soup.select_one('main') or soup.select_one('div.content')
```

**Generic855 / generic:**

Nếu không có parser chuyên biệt → dùng **heuristic** (paragraph density, text-to-link ratio).

### Phase 2: Content Relevance Filtering (Smart Filtering)

Sau khi extract main content, **chỉ giữ lại đoạn văn LIÊN QUAN đến claim**.

```python
class ContentRelevanceFilter:
    def extract_relevant(self, claim: str, full_text: str) -> str:
        # 1. Chia text thành các đoạn (chunks)
        # 2. Score mỗi đoạn dựa trên sự trùng lặp từ khóa với claim
        # 3. Chọn top N đoạn có score cao nhất
        # 4. Loại bỏ đoạn trùng lặp (Jaccard similarity > 0.8)
        # 5. Return concatenated relevant text
```

**Ví dụ:**

```
Claim: "Thông tư 66/2023/TT-BTC có hiệu lực từ ngày 14/12/2023."

Source text (full): [5000 words về ngân sách nhà nước, 
                     các văn bản pháp luật liên quan,
                     phần về Thông tư 66 chỉ là 2 đoạn ngắn]

→ Sau filtering:
   Đoạn 1: "Thông tư 66/2023/TT-BTC có hiệu lực thi hành kể từ ngày 14/12/2023..."
   Đoạn 2: "Căn cứ Nghị định 114/2021/NĐ-CP, Bộ Tài chính ban hành Thông tư 66..."
   
→ Result: 2 đoạn liên quan, ~200 tokens (thay vì 5000 tokens)
```

### Phase 3: Claim-Source Relevance Verification

Trước khi chấm điểm, xác định xem source có đề cập đến claim không:

```python
def verify_relevance(claim: str, source_text: str) -> dict:
    """
    Returns: {
        "is_relevant": bool,
        "relevance_score": float,  # 0.0 - 1.0
        "explanation": str
    }
    """
    # Dùng LLM để kiểm tra: "Source này có đề cập đến claim không?"
    # Hoặc dùng keyword matching nếu đơn giản
```

**Nếu source KHÔNG liên quan:**
- Flag `source_irrelevant = true`
- Chấm SC (Source Coverage) = 0.00
- Rationale: "Source URL không chứa nội dung liên quan đến claim"

## 3. So sánh 2 strategies

| | Fetch toàn bộ HTML | Site-specific + Relevance Filter |
|---|---|---|---|
| **Độ chính xác** | Thấp (nhiều noise) | Cao (chỉ content liên quan) |
| **Token usage** | Cao (5000+ tokens) | Thấp (200-500 tokens) |
| **Chi phí LLM** | Cao | Thấp |
| **Độ phức tạp** | Thấp | Trung bình |
| **Xử lý edge case** | Kém | Tốt (detect irrelevant source) |

## 4. Cập nhật cho ERD & Schema

**Không cần update ERD** (vì source text không lưu DB).

**Cần update:**
- `06_Source_Fetch_Architecture.md`: Thêm ContentRelevanceFilter
- `07_LLM_PreScoring_Spec.md`: Thêm bước verify relevance trước khi chấm điểm
- `03_Validation_Rules.md`: Thêm VR kiểm tra source relevance

## 5. Implementation Task cho Dev

- [ ] Implement `SiteSpecificParser` class với parser cho `thuvienphapluat.vn` và `.gov.vn`
- [ ] Implement `ContentRelevanceFilter` với keyword matching + dedup
- [ ] Implement `RelevanceVerifier` (dùng LLM hoặc heuristic để check claim-source match)
- [ ] Unit test với 10+ URLs thật từ các domain khác nhau
- [ ] Benchmark: độ dài source text trước/sau filtering, độ chính xác chấm điểm
