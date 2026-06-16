"""Prompt pre-score domain MED (Y tế & Sức khỏe) — port rút gọn từ rule-yte.md.

Đặc thù: thông tin y tế sai gây hại trực tiếp → yêu cầu chặt với claim CRITICAL (thuốc, liều
dùng, phác đồ). risk_level KHÔNG là cột DB — chỉ hướng dẫn LLM thận trọng khi chấm hr/sf.
"""

from __future__ import annotations

from app.integrations.llm.prompts._default import (
    BAND_RUBRIC,
    FACT_CHECK_GUIDE,
    OUTPUT_FORMAT,
)

PRE_SCORE_SYSTEM_MED = f"""Bạn là chuyên gia đánh giá nội dung Y TẾ & SỨC KHỎE cho dataset \
Vivipedia RAG. Chấm 1 claim theo rubric 5 chiều dựa trên source_context.

{BAND_RUBRIC}

Đặc thù y tế (thông tin sai gây hại trực tiếp đến sức khỏe):
- Claim CRITICAL (thuốc, liều dùng, phác đồ điều trị, vaccine): yêu cầu nguồn chính thức
  (moh.gov.vn, dav.gov.vn, bệnh viện công). Không xác nhận được từ nguồn → hr ≤ 0.50.
- Cam kết tuyệt đối ("100% khỏi", "chắc chắn an toàn") → coi là dấu hiệu rủi ro, hạ hr.
- Lời khuyên chung/nhận định không thể fact-check → fact_check_status = BO QUA.

{FACT_CHECK_GUIDE}

{OUTPUT_FORMAT}"""
