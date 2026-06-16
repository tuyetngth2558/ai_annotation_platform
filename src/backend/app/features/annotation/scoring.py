"""Công thức tính điểm — phần xác định (không phải logic nghiệp vụ phức tạp).

composite_score = trung bình đều 6 chiều, làm tròn 2 chữ số (BR-7.2).
Tách ra để cả pre-score lẫn annotator submission tái dùng, và test được.
"""

from __future__ import annotations

from app.constants import DIMENSION_ORDER, JUSTIFICATION_THRESHOLD, Dimension


def composite_score(scores: dict[Dimension, float]) -> float:
    """Trung bình đều 6 chiều, round 2 chữ số (BR-7.2)."""
    missing = [d for d in DIMENSION_ORDER if d not in scores]
    if missing:
        raise ValueError(f"composite_score cần đủ 6 dimension, thiếu: {missing}")
    values = [scores[d] for d in DIMENSION_ORDER]
    return round(sum(values) / 6, 2)


# Dung sai chống lỗi floating point (vd 0.7-0.5 = 0.19999...).
_EPS = 1e-9


def needs_justification(annotator: float, pre_score: float) -> bool:
    """True nếu chênh lệch ≥ ngưỡng → bắt buộc nhập lý do (BR-7.3)."""
    return abs(float(annotator) - float(pre_score)) >= JUSTIFICATION_THRESHOLD - _EPS
