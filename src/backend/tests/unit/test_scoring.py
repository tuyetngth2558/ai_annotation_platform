"""Unit test mẫu — công thức điểm (BR-7.2, BR-7.3).

Mẫu để Test/QA team bám theo khi viết test cho logic nghiệp vụ.
"""

from __future__ import annotations

import pytest

from app.constants import Dimension
from app.features.annotation.scoring import composite_score, needs_justification


def _scores(sf, sc, nh, sq, rel, comp):
    return {
        Dimension.SF: sf,
        Dimension.SC: sc,
        Dimension.NH: nh,
        Dimension.SQ: sq,
        Dimension.REL: rel,
        Dimension.COMP: comp,
    }


def test_composite_is_simple_average_rounded_2dp():
    # (1 + 0.9 + 1 + 0.9 + 1 + 0.85) / 6 = 0.9416... -> 0.94
    assert composite_score(_scores(1.0, 0.9, 1.0, 0.9, 1.0, 0.85)) == 0.94


def test_composite_all_zero():
    assert composite_score(_scores(0, 0, 0, 0, 0, 0)) == 0.0


def test_composite_requires_six_dimensions():
    with pytest.raises(ValueError):
        composite_score({Dimension.SF: 1.0})


@pytest.mark.parametrize(
    "annotator,pre,expected",
    [(0.9, 0.7, True), (0.8, 0.7, False), (0.5, 0.7, True), (0.7, 0.7, False)],
)
def test_needs_justification_threshold(annotator, pre, expected):
    assert needs_justification(annotator, pre) is expected
