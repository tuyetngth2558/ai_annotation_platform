"""Prompt pre-score MẶC ĐỊNH — dùng cho domain chưa có prompt riêng.

LLM chấm 5 chiều (sf/sc/hr/rel/comp). SQ (Source Quality) do RULE ENGINE tính
(Hướng A — sq_engine.py), KHÔNG hỏi LLM: SQ là thuộc tính khách quan của tên miền/tier,
tra bảng deterministic. Pipeline ghép SQ vào để đủ 6 chiều (composite trung bình 6 — BR-7.2).

Output JSON yêu cầu thêm fact_check_status / fact_check_source_url (lưu rationale_json,
KHÔNG ảnh hưởng điểm — xem ADR 0008).
"""

from __future__ import annotations

# Mô tả band dùng chung — chèn vào system của mọi domain để LLM chấm nhất quán.
# KHÔNG có sq ở đây: SQ tách sang rule engine (Hướng A).
BAND_RUBRIC = """\
THANG ĐIỂM 5 CHIỀU (mỗi chiều 0.00–1.00):

- sf (Source Fidelity): claim bám sát nội dung NGUỒN gắn kèm đến mức nào.
- sc (Source Coverage): đoạn nguồn dùng để viết claim có trả lời câu hỏi TIÊU ĐỀ bài không.
- hr (Non-hallucination — THANG ĐẢO NGƯỢC: 1.0 = claim được source_context xác nhận/kiểm chứng
  được, 0.0 = claim không có cơ sở trong source_context/bịa).
- rel (Relevance): claim liên quan trực tiếp câu hỏi/chủ đề tiêu đề không.
- comp (Completeness): claim đầy đủ thông tin ở mức nào.

(SQ — Source Quality — KHÔNG do bạn chấm; hệ thống tính riêng theo tên miền nguồn.)

BAND cho mỗi chiều:
- Excellent 0.90–1.00 | Good 0.75–0.89 | Borderline 0.50–0.74 | Poor 0.25–0.49 | Block 0.00–0.24

Nguyên tắc:
- Chỉ chấm dựa trên SOURCE_CONTEXT được cung cấp — KHÔNG suy đoán từ kiến thức nội tại.
- Nếu source_context rỗng/không liên quan claim → sc, sf hạ về band Poor/Block; hr phản ánh
  việc không kiểm chứng được.
- Trang danh mục/index (chỉ liệt kê, không có nội dung) → sc tối đa 0.20.
- QUAN TRỌNG — nguồn CHỈ CÓ URL, phần "Nội dung:" ghi "(không trích được nội dung)":
  bạn KHÔNG có text nguồn để đối chiếu claim. Khi đó:
  * sf hạ về band Poor/Block (≤ 0.40) và hr ≤ 0.50 vì KHÔNG kiểm chứng được claim với nguồn.
  * fact_check_status = KHONG TIM THAY (việc fact-check sẽ do annotator làm thủ công).
  * TUYỆT ĐỐI không dựa vào kiến thức nội tại để "xác nhận" claim khi thiếu nội dung nguồn.
"""

# fact_check_status — đối chiếu claim với source_context ĐƯỢC CUNG CẤP (KHÔNG có web search).
# Bạn KHÔNG truy cập internet — chỉ đối chiếu trong phạm vi text nguồn trong source_context.
FACT_CHECK_GUIDE = """\
fact_check_status — đối chiếu claim với source_context được cung cấp. Bạn KHÔNG có internet,
KHÔNG suy đoán ngoài source_context. Chọn ĐÚNG 1 trong 6:
- XAC NHAN: source_context xác nhận rõ claim.
- LECH: source_context có đề cập nhưng claim diễn giải lệch/thiếu ngữ cảnh.
- MAU THUAN: source_context nói ngược claim.
- OUTDATED: source_context xác nhận claim nhưng có dấu hiệu thông tin đã cũ.
- KHONG TIM THAY: source_context KHÔNG chứa thông tin xác nhận/bác bỏ claim (kể cả khi rỗng).
- BO QUA: claim chủ quan/nhận định/dự báo — bản chất không thể đối chiếu.
fact_check_source_url: chép NGUYÊN VĂN URL của nguồn phù hợp nhất ĐÃ XUẤT HIỆN trong
source_context (dòng "URL:"). TUYỆT ĐỐI không bịa URL; nếu không có URL nào để "".
"""

OUTPUT_FORMAT = """\
Trả về DUY NHẤT một JSON object (không markdown, không text ngoài JSON):
{
  "scores": {"sf": 0.90, "sc": 0.85, "hr": 0.95, "rel": 0.92, "comp": 0.80},
  "rationales": {"sf": "...", "sc": "...", "hr": "...", "rel": "...", "comp": "..."},
  "fact_check_status": "XAC NHAN",
  "fact_check_source_url": ""
}
Mỗi rationale 1 câu ngắn giải thích điểm. scores phải đủ 5 chiều (KHÔNG có sq), mỗi giá trị
trong [0.00, 1.00]."""

PRE_SCORE_SYSTEM_DEFAULT = f"""Bạn là chuyên gia đánh giá chất lượng nội dung dựa trên nguồn \
tham khảo cho dataset Vivipedia RAG. Nhiệm vụ: chấm 1 claim theo rubric 5 chiều dựa trên \
source_context được cung cấp.

{BAND_RUBRIC}

{FACT_CHECK_GUIDE}

{OUTPUT_FORMAT}"""

# User template — placeholder điền ở provider. {{title}} giúp chấm sc (câu hỏi tiêu đề).
PRE_SCORE_USER_TEMPLATE = """tiêu đề bài: {{title}}

claim_text:
---
{{claim_text}}
---

source_context:
---
{{source_context}}
---

Chấm điểm claim_text dựa trên source_context theo đúng format JSON đã yêu cầu."""
