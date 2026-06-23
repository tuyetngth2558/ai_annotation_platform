"""Unit test prompt registry — chọn prompt pre-score theo domain + fallback default.

Cũng chứng minh khả năng MỞ RỘNG: thêm 1 entry vào PRE_SCORE_REGISTRY thì
get_pre_score_prompt trả prompt mới mà không cần sửa pipeline/provider (ADR 0008).
"""

from __future__ import annotations

from app.integrations.llm.prompts import (
    PRE_SCORE_DEFAULT,
    PRE_SCORE_REGISTRY,
    PromptSpec,
    get_pre_score_prompt,
)


def test_known_domains_have_specs():
    for dk in ("law", "med", "trv"):
        spec = get_pre_score_prompt(dk)
        assert isinstance(spec, PromptSpec)
        assert spec.version.startswith("pre_score_")
        assert "{{claim_text}}" in spec.user_template


def test_law_prompt_is_legal_and_has_no_sq_table():
    # SQ tách sang rule engine (Hướng A) → prompt law KHÔNG còn bảng tra SQ.
    spec = get_pre_score_prompt("law")
    assert "PHÁP LUẬT" in spec.system
    assert "BẢNG TRA SQ" not in spec.system


def test_unknown_domain_falls_back_default():
    assert get_pre_score_prompt("fin") is PRE_SCORE_DEFAULT
    assert get_pre_score_prompt(None) is PRE_SCORE_DEFAULT
    assert get_pre_score_prompt("") is PRE_SCORE_DEFAULT


def test_domain_key_case_insensitive():
    assert get_pre_score_prompt("LAW") is get_pre_score_prompt("law")


def test_extensible_add_new_domain(monkeypatch):
    """Thêm domain mới = thêm entry vào registry; pipeline/provider không đổi."""
    new_spec = PromptSpec(system="fin system", user_template="{{claim_text}}", version="fin_v1")
    monkeypatch.setitem(PRE_SCORE_REGISTRY, "fin", new_spec)
    assert get_pre_score_prompt("fin") is new_spec
    # domain khác vẫn fallback default
    assert get_pre_score_prompt("xyz") is PRE_SCORE_DEFAULT
