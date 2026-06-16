"""Unit test extract_json — 4 strategy parse JSON từ response LLM (port tool cũ)."""

from __future__ import annotations

import pytest

from app.integrations.llm._json import extract_json


def test_direct_parse():
    assert extract_json('{"a": 1}') == {"a": 1}


def test_strips_surrounding_text():
    raw = 'Đây là kết quả: {"a": 1, "b": "x"} — hết.'
    assert extract_json(raw) == {"a": 1, "b": "x"}


def test_code_fence():
    raw = 'Output:\n```json\n{"a": 1}\n```\n'
    assert extract_json(raw) == {"a": 1}


def test_nested_braces_balanced_scan():
    raw = 'noise {"a": {"b": 2}, "c": [1, 2]} trailing'
    assert extract_json(raw) == {"a": {"b": 2}, "c": [1, 2]}


def test_brace_inside_string_not_counted():
    raw = '{"text": "có { dấu ngoặc } trong chuỗi", "n": 3}'
    assert extract_json(raw) == {"text": "có { dấu ngoặc } trong chuỗi", "n": 3}


def test_raises_when_no_json():
    with pytest.raises(ValueError):
        extract_json("không có json ở đây")
