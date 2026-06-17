# ADR 0008 — Pre-scoring prompt theo domain + claim extraction parser-first + SQ rule engine

**Trạng thái:** Accepted · **Ngày:** 2026-06-16 · **Liên quan:** [ADR 0007](0007-llm-provider-openrouter.md)

## Context
Vòng 1 (ADR 0007) đã nối pipeline pre-scoring chạy thật, nhưng prompt chấm điểm quá sơ sài
(1 dòng/chiều) so với nghiệp vụ thật. Team có tool cũ `tool-data-labling` (auto-click Claude.ai
qua Playwright, chạy đơn lẻ ghi Excel) chứa nghiệp vụ chấm điểm đã tinh chỉnh: band điểm chi
tiết/chiều, bảng tra SQ theo tên miền, fact_check_status, rule riêng theo domain.

Yêu cầu: làm thành hệ thống, kết hợp **docs BA (nguồn chân lý)** + **nghiệp vụ tool cũ (tham
khảo)**, và **mở rộng được** (tương lai mỗi domain có prompt riêng — tool cũ mới làm 3 domain).

## Decision

1. **Prompt pre-score theo domain — registry tĩnh trong code.**
   - `PromptSpec` (system + user_template + version) trong `app/integrations/llm/prompts/`.
   - `PRE_SCORE_REGISTRY: dict[domain_key, PromptSpec]` — hiện có 3 domain thật (`law`/`med`/`trv`,
     port rút gọn từ `rule-*.md`) + `PRE_SCORE_DEFAULT`. `get_pre_score_prompt(domain)` fallback
     default cho domain chưa khai báo.
   - **Mở rộng (v2/v3): thêm 1 entry vào registry + 1 file `prompts/<domain>.py` rồi deploy.**
     Chủ ý KHÔNG làm loader động/Admin-editable/đọc từ DB ở vòng này (quyết định team — khi nâng
     cấp sẽ tự code thêm). Pipeline/provider KHÔNG đổi khi thêm domain.
   - Domain detect bằng keyword scoring tiêu đề+heading (`pdf_parser._detect_domain`, không LLM),
     lưu trong `ParentTask.metadata_json["domain_key"]` (KHÔNG thêm cột DB).

2. **fact_check_status lưu trong `rationale_json`, KHÔNG thêm cột DB.**
   - LLM trả thêm `fact_check_status`/`fact_check_source_url` → `PreScoreResult.extra` →
     `llm_pre_score.rationale_json["_meta"]`. Tham khảo cho annotator/QA, KHÔNG ảnh hưởng điểm.
   - `FactCheckStatus` enum + `normalize_fact_check_status()` ở `app/constants.py`.

   **KHÁC BIỆT CỐT LÕI vs tool cũ — KHÔNG web search.** Tool cũ chạy trên Claude.ai (có web
   search built-in) nên LLM tự đi tìm/mở URL để fact-check. Platform gọi **API thuần
   (OpenRouter), KHÔNG có web search** → LLM chỉ đối chiếu claim với `source_context` ĐƯỢC
   CUNG CẤP trong prompt (text parse từ `source_content_pdf`). Hệ quả thiết kế:
   - `fact_check_status` = đối chiếu trong phạm vi `source_context`, KHÔNG suy đoán ngoài.
     Còn 6 giá trị LLM trả (XAC NHAN/LECH/MAU THUAN/OUTDATED/KHONG TIM THAY/BO QUA); `ERROR`
     do **backend** set khi `source_context` rỗng, LLM không trả.
   - Pipeline đưa URL+tiêu đề nguồn (parse từ `source_ref_pdf`, URL THẬT) vào mỗi block
     context (`_build_source_context`/`_format_source_block`) để LLM đối chiếu fact_check.
   - `fact_check_source_url` chỉ chép URL đã xuất hiện trong context; cấm bịa.
   - **MVP KHÔNG làm web search/tool-calling** (chốt với user). Nếu sau cần, nâng cấp provider.
   - **Bundle thật thường CHỈ có URL nguồn, KHÔNG có nội dung nguồn** (`source_content_pdf`):
     khi `source_context` chỉ có URL (phần "Nội dung:" rỗng) → `sf ≤ 0.40` / `hr ≤ 0.50` và
     `fact_check_status = KHONG TIM THAY` vì KHÔNG có text đối chiếu. **Fact-check thật do
     annotator làm thủ công** (mở URL, kiểm tra) — LLM chỉ là pre-score gợi ý, annotator quyết
     định cuối. Cấm LLM "xác nhận" claim bằng kiến thức nội tại khi thiếu nội dung nguồn.

5. **SQ (Source Quality) — RULE ENGINE, KHÔNG dùng LLM (phương án điều chỉnh SQ, Hướng A+D).**
   - SQ là thuộc tính KHÁCH QUAN của nguồn (tên miền + tier + parse_status), tra bảng
     deterministic → tách khỏi LLM. LLM chỉ chấm **5 chiều** (sf/sc/hr/rel/comp); pipeline gọi
     `sq_engine.compute_sq()` điền cột `sq` rồi tính composite **đủ 6 chiều** (BR-7.2 KHÔNG đổi).
   - Lý do: deterministic (không hallucinate SQ), không tốn token LLM cho SQ, audit rõ (rule
     nào → điểm nào). Bảng SQ-theo-tên-miền (cũ trong `prompts/law.py`) chuyển vào `sq_engine`.
   - Rule: base theo tier (`Tier 1`=0.92...`unknown`=0.60) → floor theo domain uy tín
     (gov_vn 0.80, intl_org 0.85, academic 0.75) / cap social_or_blog 0.49 → cap 0.49 nếu
     unparsed/inaccessible (BR-SQ-04). `classify_domain()` heuristic, KHÔNG fetch URL.
   - Tín hiệu phụ (`sq_domain_class`, `sq_tier`, `sq_needs_review`) lưu `rationale_json["_meta"]`
     để FE hiển thị + nhắc annotator verify (nút "Mở URL gốc" khi tier unknown — Hướng B, FE).
   - Hướng C (HEAD-fetch access_status) **defer Phase 1.5** — MVP không fetch URL.

3. **Claim extraction parser-first, LLM fallback.**
   - Answer PDF đã tách paragraph theo citation `[n]` → mỗi paragraph = 1 claim (không tốn LLM).
   - Chỉ gọi `provider.extract_claims()` khi parser ra 0 claim (PDF không có citation rõ).

4. **JSON parse robust** — `extract_json()` 4-strategy (direct → code fence → balanced-brace →
   greedy regex), port từ `response_parser.py`, thay `json.loads` thuần.

## Giữ nguyên (không đi ngược docs BA)
- **6 chiều `sf/sc/hr(NH)/sq/rel/comp` + composite = trung bình 6 round 2 (BR-7.2)** — KHÔNG đổi.
  (Chỉ đổi NGUỒN tính sq: LLM 5 chiều + rule engine cho sq, kết quả vẫn đủ 6 cột.)
- Schema DB `llm_pre_score` (6 cột) + `annotation_submission`.
- KHÔNG web-fetch URL như tool cũ — platform dùng `source_content_pdf` → `source_context` text.

## Consequences
- Vượt scope MVP "single-domain, 6 chiều cố định" trong CLAUDE.md một cách có kiểm soát: chỉ
  làm giàu prompt + metadata, không đổi data model/công thức.
- Khác biệt kiến trúc cố hữu so với tool cũ: tool cũ (Claude.ai có web search) để LLM tự fetch
  URL; platform (API thuần, KHÔNG web search) đưa URL+tiêu đề+text nguồn từ PDF vào prompt →
  LLM đối chiếu/tra SQ trong phạm vi context → chất lượng SQ/SC/fact_check phụ thuộc parse được
  nội dung `source_content_pdf` + URL trong `source_ref_pdf`.
- Tổ chức `prompts/` 1 file/domain → dễ thêm domain, prompt dài không làm rối 1 file.
- Test: +17 (domain detect, json extract, prompt registry, provider domain/fact_check, pipeline
  parser-first). 115/115 pass.
