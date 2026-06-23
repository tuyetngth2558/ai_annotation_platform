# 08 — Lựa chọn LLM Provider & Phân tích Chi phí

**Quyết định:** CHƯA CHỐT (OQ-002) — interface `LLMProvider` trừu tượng, cắm provider sau
**Trạng thái:** Đề xuất + bảng chi phí để stakeholder quyết · **Ngày:** 2026-06-09

> ⚠️ **Tài liệu cho stakeholder đọc và tự quyết.** Bảng giá cập nhật 06/2026 — giá LLM
> thay đổi liên tục, **kiểm tra lại giá hiện hành trước khi chốt**. Mọi con số chi phí là
> **ước tính theo giả định nêu rõ ở §4**; thay giả định → thay kết quả.

---

## 1. Bài toán

Hệ thống gọi LLM ở 2 chỗ (xem [05 — Worker](05-worker-queue.md)):
1. **Claim extraction** — tách answer thành claims (1 call/bài).
2. **Pre-scoring** — chấm 6 chiều từng claim (**1 call/claim, kèm source context**).

**Tài liệu này tập trung vào pre-scoring** — bước **tốn nhất** vì gọi theo từng claim và
phải kèm source context (claim + nguồn + prompt rubric). OQ-002 chưa chốt provider.

**Yêu cầu provider phải đáp ứng:**
- Output **structured JSON** đúng schema 6 chiều (VR-LLM-001..004).
- Prompt template chứa `{{claim_text}}` + `{{source_context}}` (BR-1.3).
- Chấm điểm ổn định, có lý do (rationale) — phục vụ annotator đối chiếu.
- Tiếng Việt tốt (dữ liệu Vivipedia là tiếng Việt — văn bản pháp luật).

---

## 2. So sánh model theo TIER

Nhóm theo 3 tier mục đích. Giá USD / 1 triệu token (**cập nhật 06/2026, tham khảo** — giá
LLM giảm liên tục ~80%/năm, **kiểm tra lại trước khi chốt**). Gồm các model **mới/hot nhất**.

### Tier RẺ — cho volume lớn, tác vụ đơn giản

| Model | Nhà | Input $/1M | Output $/1M | Cached input | Ghi chú |
|---|---|---:|---:|---:|---|
| **DeepSeek V4 Flash** ⭐mới | DeepSeek | 0.14 | 0.28 | 0.0028 (-98%) | Frontier-class siêu rẻ; context 1M; **cân nhắc data residency (TQ)** |
| Gemini 3.1 Flash-Lite ⭐mới | Google | 0.10 | 0.40 | — | Rẻ nhất nhóm proprietary |
| GPT-4o-mini | OpenAI | 0.15 | 0.60 | 0.075 | Phổ biến, ổn định |
| Gemini 3 Flash ⭐mới | Google | 0.50 | 3.00 | — | Cân bằng giá/chất lượng tốt |
| Grok 4.1 Fast ⭐mới | xAI | 0.20 | 0.50 | 0.05 | Nhanh, rẻ |
| **Claude Haiku 4.5** | Anthropic | 1.00 | 5.00 | 0.10 | JSON tốt, tiếng Việt khá |
| Llama 3.3 70B (Groq) | Meta/Groq | 0.59 | 0.79 | — | **Open-weight — tự host on-prem được** |

### Tier CÂN BẰNG — chất lượng/giá tốt

| Model | Nhà | Input $/1M | Output $/1M | Cached input | Ghi chú |
|---|---|---:|---:|---:|---|
| Gemini 2.5 Pro | Google | 1.25 | 10.00 | — | ≤200K context |
| Grok 4.3 ⭐mới | xAI | 1.25 | 2.50 | — | Flagship xAI, output rẻ |
| GPT-5.4 ⭐mới | OpenAI | 2.50 | 15.00 | 1.25 | Thế hệ mới OpenAI |
| **Claude Sonnet 4.6** | Anthropic | 3.00 | 15.00 | 0.30 | **Structured scoring mạnh, tiếng Việt tốt** |
| DeepSeek V4 Pro ⭐mới | DeepSeek | ~0.28 | ~0.42 | — | Bản mạnh hơn V4 Flash; rẻ |

### Tier MẠNH — độ chính xác cao nhất

| Model | Nhà | Input $/1M | Output $/1M | Cached input | Ghi chú |
|---|---|---:|---:|---:|---|
| **Claude Opus 4.8** | Anthropic | 5.00 | 25.00 | 0.50 | Mạnh nhất; context 1M |
| Grok 4 | xAI | 3.00 | 15.00 | — | |
| GPT-5.4 Pro ⭐mới | OpenAI | 30.00 | 180.00 | — | Rất đắt — chỉ khi cực cần |

> ⭐ = model mới ra/được cập nhật 2026. **Giá biến động mạnh** — danh sách này là ảnh chụp
> 06/2026.

### Giảm chi phí có sẵn (áp dụng được cho pre-scoring)

| Cơ chế | Mức giảm | Áp dụng cho pre-scoring? |
|---|---|---|
| **Batch API** | thường **-50%** input+output | ✅ Rất hợp — pre-scoring chạy nền, không cần realtime |
| **Prompt caching** | **-90%** (đến -98% với DeepSeek) phần cache | ✅ Rubric + system prompt cố định giữa các claim → cache được |
| Kết hợp cả 2 | có thể về **~25-40%** giá gốc | ✅ Khuyến nghị bật cả hai |

---

## 3. Khuyến nghị provider (để stakeholder cân nhắc)

| Ưu tiên | Chọn | Vì sao |
|---|---|---|
| **Chất lượng + tiếng Việt + JSON** | **Claude Sonnet 4.6** | Cân bằng tốt nhất cho scoring 6 chiều văn bản pháp luật tiếng Việt; structured output ổn định. Khuyến nghị mặc định. |
| Tiết kiệm tối đa | DeepSeek V4 Flash / Gemini 3.1 Flash-Lite / GPT-4o-mini | Siêu rẻ; đánh đổi độ chính xác — cần thử nghiệm chất lượng trước. **DeepSeek lưu ý data residency (TQ)** |
| Cân bằng giá/chất lượng | Gemini 3 Flash / Grok 4.3 | Mới, giá tốt; thử nghiệm tiếng Việt |
| Độ chính xác cao nhất | Claude Opus 4.8 | Khi sai số scoring tốn kém hơn tiền API |
| Chủ quyền dữ liệu / tự host | Llama 3.3 70B | Open-weight, chạy on-prem nếu data nhạy cảm không được gửi ra ngoài |

**Lưu ý quan trọng:** không chốt bằng giá đơn thuần — **chất lượng scoring tiếng Việt**
là yếu tố quyết định (sai điểm → annotator phải sửa nhiều → tốn công người, đắt hơn tiền
API). Nên **chạy thử 20-50 claim thật** trên 2-3 model rồi so chất lượng trước khi chốt.
Nhờ interface `LLMProvider`, đổi provider để thử nghiệm **không phải sửa code**.

---

## 4. Ước tính chi phí PRE-SCORING

### 4.1. Giả định token (điều chỉnh theo dữ liệu thật)

Mỗi lần pre-score 1 claim gồm:

| Thành phần | Token (ước tính) | Ghi chú |
|---|---:|---|
| System prompt + rubric 6 chiều | ~800 | Cố định → **cache được** |
| Claim text | ~150 | 1 claim |
| Source context (đoạn nguồn liên quan) | ~1,500 | Phần nặng nhất; tùy độ dài nguồn |
| **→ Tổng INPUT / claim** | **~2,450** | (chưa tính cache) |
| Output: 6 score + rationale JSON | ~400 | |
| **→ Tổng OUTPUT / claim** | **~400** | |

> Đây là **giả định khởi điểm**. Văn bản pháp luật nguồn có thể dài hơn → input cao hơn.
> **Đo bằng `count_tokens` trên dữ liệu Vivipedia thật để chốt con số.**

### 4.2. Chi phí / 1 claim — KỊCH BẢN CHUẨN (không cache, không batch)

Công thức: `(input_tokens × giá_in + output_tokens × giá_out) / 1,000,000`
Với input ~2,450 + output ~400 token/claim:

| Model | $/1 claim | Ghi chú |
|---|---:|---|
| Gemini 3.1 Flash-Lite | ~0.00041 | (2450×0.10 + 400×0.40)/1M — rẻ nhất |
| **DeepSeek V4 Flash** | ~0.00045 | (2450×0.14 + 400×0.28)/1M |
| GPT-4o-mini | ~0.00061 | (2450×0.15 + 400×0.60)/1M |
| Grok 4.1 Fast | ~0.00069 | (2450×0.20 + 400×0.50)/1M |
| Gemini 3 Flash | ~0.00243 | (2450×0.50 + 400×3.00)/1M |
| Grok 4.3 | ~0.00406 | (2450×1.25 + 400×2.50)/1M |
| **Claude Haiku 4.5** | ~0.00445 | (2450×1.00 + 400×5.00)/1M |
| GPT-5.4 | ~0.01213 | (2450×2.50 + 400×15.00)/1M |
| **Claude Sonnet 4.6** | ~0.01335 | (2450×3.00 + 400×15.00)/1M |
| Claude Opus 4.8 | ~0.02225 | (2450×5.00 + 400×25.00)/1M |

### 4.3. NHIỀU KỊCH BẢN giảm chi phí (cho 3 model đại diện)

Pre-scoring chạy nền → áp dụng được **Batch (-50%)** và **caching** (~800 token rubric cố
định cache -90%). Bảng dưới tính $/1 claim theo 4 kịch bản, cho 3 model đại diện mỗi tier:

| Kịch bản | DeepSeek V4 Flash (rẻ) | Claude Sonnet 4.6 (cân bằng) | Claude Opus 4.8 (mạnh) |
|---|---:|---:|---:|
| **A. Chuẩn** (không tối ưu) | $0.00045 | $0.01335 | $0.02225 |
| **B. + Batch API** (-50%) | $0.00022 | $0.00668 | $0.01113 |
| **C. + Caching rubric** (-90% phần 800tk) | $0.00035 | $0.01119 | $0.01865 |
| **D. + Batch + Caching** (gộp) | $0.00018 | $0.00560 | $0.00933 |

> Kịch bản D là thực tế nhất khi vận hành tối ưu. Tiết kiệm ~55-60% so với A.

### 4.4. Bảng tổng chi phí theo NHIỀU QUY MÔ × kịch bản

Đơn vị: USD. (1 bài ~10 claim. 100 bài ≈ 1,000 claim.)

**DeepSeek V4 Flash (tier rẻ):**
| Kịch bản | 100 | 500 | 1,000 | 5,000 | 10,000 | 50,000 |
|---|---:|---:|---:|---:|---:|---:|
| A. Chuẩn | $0.05 | $0.23 | $0.45 | $2.25 | $4.50 | $22.50 |
| D. Batch+Cache | $0.02 | $0.09 | $0.18 | $0.90 | $1.80 | $9.00 |

**Claude Sonnet 4.6 (cân bằng — khuyến nghị):**
| Kịch bản | 100 | 500 | 1,000 | 5,000 | 10,000 | 50,000 |
|---|---:|---:|---:|---:|---:|---:|
| A. Chuẩn | $1.34 | $6.68 | $13.35 | $66.75 | $133.50 | $667.50 |
| B. Batch | $0.67 | $3.34 | $6.68 | $33.40 | $66.80 | $334.00 |
| D. Batch+Cache | $0.56 | $2.80 | $5.60 | $28.00 | $56.00 | $280.00 |

**Claude Opus 4.8 (mạnh):**
| Kịch bản | 100 | 500 | 1,000 | 5,000 | 10,000 | 50,000 |
|---|---:|---:|---:|---:|---:|---:|
| A. Chuẩn | $2.23 | $11.13 | $22.25 | $111.25 | $222.50 | $1,112.50 |
| D. Batch+Cache | $0.93 | $4.67 | $9.33 | $46.65 | $93.30 | $466.50 |

### 4.5. KỊCH BẢN VẬN HÀNH theo thời gian (ví dụ cho stakeholder)

Giả định 1 dự án chạy đều, ước tính chi phí LLM/tháng:

| Kịch bản vận hành | Claim/tháng | DeepSeek V4 (D) | Sonnet 4.6 (D) | Opus 4.8 (D) |
|---|---:|---:|---:|---:|
| **Demo/UAT** (1-2 batch nhỏ) | ~500 | $0.09 | $2.80 | $4.67 |
| **Pilot** (vài batch) | ~5,000 | $0.90 | $28.00 | $46.65 |
| **Vận hành nhẹ** | ~20,000 | $3.60 | $112.00 | $186.60 |
| **Vận hành lớn** | ~100,000 | $18.00 | $560.00 | $933.00 |

> So sánh: 1 annotator chấm ~100-200 claim/ngày. Chi phí nhân công 1 tháng ≫ chi phí LLM ở
> mọi kịch bản. **Tiền LLM gần như không phải là yếu tố ngân sách lớn** — kể cả Opus ở quy
> mô lớn cũng < $1,000/tháng.

### 4.6. Đọc bảng thế nào (cho stakeholder)

- **Quy mô MVP/demo (~100-500 claim):** chi phí **rất nhỏ** kể cả Opus (<$5). → Chọn theo
  **chất lượng**, đừng lo tiền.
- **Vận hành thật:** kể cả model mạnh nhất + quy mô lớn vẫn < $1,000/tháng. Tier rẻ
  (DeepSeek) chỉ vài chục $/tháng.
- **Tiền API KHÔNG phải chi phí lớn nhất** — công annotator/QA mới là phần đắt. Một model
  chấm sai khiến annotator sửa nhiều sẽ **đắt hơn nhiều** tiền tiết kiệm từ model rẻ.
- **Khuyến nghị ngân sách:** chọn model theo chất lượng (Sonnet/Opus), bật Batch+Cache, đặt
  cảnh báo ngân sách. Không tối ưu giá xuống đáy đổi lấy chất lượng kém.

---

## 5. Rủi ro VỀ CHI PHÍ

> Đây là tài liệu chi phí — mục này **chỉ liệt kê rủi ro ảnh hưởng tới chi phí/ngân sách**.
> Rủi ro kỹ thuật/vận hành của LLM (provider lỗi, sai schema, hallucination, data residency)
> nằm ở [docs/03_ba/dan/05_Data_Risk_Notes.md](../../03_ba/dan/05_Data_Risk_Notes.md) và mục
> §6 (việc cần làm) bên dưới.

| Rủi ro chi phí | Khả năng | Ảnh hưởng ngân sách | Cách kiểm soát |
|---|---|---|---|
| Giá provider tăng / model bị khai tử | Cao | TB | Đổi provider = đổi `.env` (không sửa code); theo dõi changelog giá |
| Token thực cao hơn ước tính (nguồn dài) | Trung bình | TB | Đo `count_tokens` trên data thật; bảng §4 dễ tính lại với số mới |
| Quên bật Batch/Cache → trả giá đầy | Trung bình | TB | Bật Batch+Cache mặc định; review cấu hình trước khi chạy batch lớn |
| Chi phí test/tinh chỉnh prompt vượt dự tính | Trung bình | Thấp-TB | Tính sẵn trong §4b; dùng tier rẻ cho vòng thử đầu; cap số vòng |
| Vượt budget khi scale ngoài dự kiến | Thấp | TB | **Budget alert** ở provider; dashboard token; trần chi phí thấp (§4) |

**Kiểm soát chi phí xuyên suốt:** log token mỗi call → dashboard; đặt budget alert ở
provider; bật Batch+Cache; dùng tier rẻ cho vòng thử nghiệm. Vì interface trừu tượng, giá
tăng ở 1 nhà → đổi nhà khác không tốn công code.

---

## 5b. Chi phí TEST & TINH CHỈNH PROMPT (giai đoạn đầu)

Trước khi chốt provider và đưa vào vận hành, sẽ có **chi phí thử nghiệm**: chạy nhiều model
trên data mẫu, tinh chỉnh prompt rubric qua nhiều vòng, đo chất lượng. **Đây là chi phí
thật, một lần (one-off) ở giai đoạn đầu** — phải tính vào ngân sách.

### Giả định thử nghiệm

| Hạng mục | Giả định | Ghi chú |
|---|---|---|
| Số model thử | 3 model | vd Sonnet + DeepSeek V4 + Gemini 3 Flash |
| Bộ claim thử | ~50 claim thật | đủ để đánh giá chất lượng |
| Số vòng tinh chỉnh prompt | ~10 vòng | mỗi vòng chạy lại 50 claim để so kết quả |
| → Tổng lượt pre-score thử | 3 model × 50 claim × 10 vòng = **1,500 lượt** | |

### Chi phí thử nghiệm ước tính (one-off, kịch bản A — không tối ưu, để tính trần)

| Model thử | $/1 claim | × 500 lượt/model (50×10) | Ghi chú |
|---|---:|---:|---|
| DeepSeek V4 Flash | 0.00045 | ~$0.23 | |
| Gemini 3 Flash | 0.00243 | ~$1.22 | |
| Claude Sonnet 4.6 | 0.01335 | ~$6.68 | |
| **→ Tổng test 3 model** | | **~$8.1** | < 250k VND |

> Nếu thử cả Opus hoặc nhiều vòng hơn: vẫn chỉ vài chục $. **Chi phí test gần như không
> đáng kể** so với giá trị (chọn đúng model + prompt tốt). Dùng tier rẻ cho vòng thử thô,
> chỉ chạy model đắt ở vòng so sánh cuối để tiết kiệm thêm.

### Phương án dự phòng provider (cũng giúp kiểm soát chi phí)
1. Bắt đầu provider khuyến nghị (Sonnet 4.6); lỗi/đắt → đổi `.env` sang provider khác.
2. Data nhạy cảm → Llama tự host on-prem.
3. Dev/test luồng → `MockProvider` (không tốn tiền).

---

## 5c. TỔNG CHI PHÍ LLM ƯỚC TÍNH (gộp test + vận hành)

Gộp chi phí **một lần (test/tinh chỉnh)** + **định kỳ (vận hành)** cho 2 mốc, dùng model
khuyến nghị (Sonnet 4.6, kịch bản D = Batch+Cache):

| Giai đoạn | Test/tinh chỉnh (one-off) | Vận hành (định kỳ) | Tổng giai đoạn |
|---|---:|---:|---|
| **MVP / Demo-UAT** (~500 claim) | ~$8 (test 3 model) | ~$2.8 | **~$11** (~280k VND) |
| **Mở rộng / Vận hành** | ~$8 (đã trả ở MVP) + tinh chỉnh lại ~$10/lần | ~$28-560/tháng tùy quy mô | **chủ yếu là phần vận hành** |

> **Kết luận ngân sách:** chi phí LLM cho cả MVP (gồm test) **dưới ~300k VND**. Khi mở rộng,
> phần test là one-off nhỏ; chi phí thực là vận hành theo quy mô (§4.5), kể cả lớn vẫn
> < ~14 triệu đ/tháng với model mạnh nhất. Tiền LLM không phải hạng mục ngân sách lớn.

---

## 6. Quyết định & việc cần làm

> **Provider chưa chốt (OQ-002).** Khuyến nghị: **Claude Sonnet 4.6** làm mặc định (cân
> bằng chất lượng/tiếng Việt/JSON), nhưng **chạy thử 20-50 claim thật trên 2-3 model**
> trước khi chốt — chất lượng scoring quan trọng hơn giá. Mọi con số chi phí ở §4 là ước
> tính theo giả định token; **đo bằng dữ liệu thật để chốt**.

**Việc cần làm:**
- [ ] Đo token thật của 1 pre-score bằng `count_tokens` trên data Vivipedia.
- [ ] Chạy thử nghiệm chất lượng 2-3 model, so kết quả với annotator.
- [ ] Chốt provider + bật Batch API + prompt caching cho rubric.
- [ ] Implement provider thật trong `app/integrations/llm/` (hiện chỉ có Mock).

## 7. Tham chiếu
- ADR: [0001-tech-stack.md](../../adr/0001-tech-stack.md) · OQ-002 (docs/03_ba/tuyet/04)
- Liên quan: [05 — Worker](05-worker-queue.md) (gọi LLM async + Batch), [06 — Auth](06-auth.md) (API key encrypt — BR-1.2)
- **Giá tham khảo (06/2026)**: Anthropic, OpenAI (GPT-4o-mini/5.4), Google Gemini (2.5/3
  Flash, 3.1 Flash-Lite), DeepSeek (V4 Flash/Pro), xAI Grok (4.1 Fast/4.3/4), Meta Llama
  (Groq). Tổng hợp từ trang giá chính thức + so sánh (pricepertoken, artificialanalysis,
  cloudzero...). **Giá LLM thay đổi liên tục — BẮT BUỘC kiểm tra giá hiện hành khi chốt.**
- **Quy đổi VND (tham khảo):** nhân ~25,000 (vd Sonnet vận hành nhẹ ~$112/th ≈ 2.8 triệu đ).
