"""Prompt pre-score domain LAW (Pháp luật) — port rút gọn từ tool-data-labling/rule-luat.md.

LƯU Ý: SQ (Source Quality) theo tên miền giờ do RULE ENGINE tính (sq_engine.py, Hướng A) —
KHÔNG còn nằm trong prompt này. Bảng tra SQ pháp luật (chinhphu.vn/.gov.vn/...) đã chuyển
vào sq_engine. Prompt chỉ hướng dẫn LLM chấm 5 chiều còn lại với đặc thù pháp luật.
"""

from __future__ import annotations

from app.integrations.llm.prompts._default import (
    BAND_RUBRIC,
    FACT_CHECK_GUIDE,
    OUTPUT_FORMAT,
)

PRE_SCORE_SYSTEM_LAW = f"""Bạn là chuyên gia đánh giá nội dung PHÁP LUẬT Việt Nam cho dataset \
Vivipedia RAG. Chấm 1 claim theo rubric 5 chiều dựa trên source_context.

{BAND_RUBRIC}

{FACT_CHECK_GUIDE}

Đặc thù pháp luật: bằng chứng gián tiếp hợp lệ để XAC NHAN gồm "Căn cứ ban hành", điều khoản
bãi bỏ/thay thế, điều khoản chuyển tiếp trích dẫn NĐ/TT cụ thể. Trang chỉ có metadata (số hiệu,
ngày ban hành) mà KHÔNG có nội dung điều khoản → sc tối đa 0.20 dù tên miền uy tín.

{OUTPUT_FORMAT}"""
