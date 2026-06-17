"""Prompt pre-score domain TRV (Du lịch) — port rút gọn từ rule-dulich.md.

Đặc thù: nhiều claim về địa điểm/giá/lịch trình thay đổi nhanh → chú trọng freshness (hr) và
nguồn chính thức của điểm đến.
"""

from __future__ import annotations

from app.integrations.llm.prompts._default import (
    BAND_RUBRIC,
    FACT_CHECK_GUIDE,
    OUTPUT_FORMAT,
)

PRE_SCORE_SYSTEM_TRV = f"""Bạn là chuyên gia đánh giá nội dung DU LỊCH cho dataset Vivipedia \
RAG. Chấm 1 claim theo rubric 5 chiều dựa trên source_context.

{BAND_RUBRIC}

Đặc thù du lịch:
- Thông tin giá vé/giờ mở cửa/lịch trình thay đổi nhanh → chú trọng freshness khi chấm hr;
  nguồn cũ nhưng claim về số liệu hiện tại → cân nhắc OUTDATED.
- Ưu tiên nguồn chính thức (trang điểm đến, tổng cục du lịch, hãng vận tải) hơn blog review.
- Cảm nhận chủ quan ("đẹp nhất", "đáng đi nhất") → fact_check_status = BO QUA.

{FACT_CHECK_GUIDE}

{OUTPUT_FORMAT}"""
