"""Trích JSON từ response LLM — chịu được text thừa trước/sau (port từ tool cũ).

LLM đôi khi trả JSON kèm lời dẫn/markdown dù đã yêu cầu JSON thuần. 4 strategy theo
thứ tự ưu tiên để parse robust hơn `json.loads` thuần.
Nguồn: tool-data-labling/modules/response_parser.py::extract_json.
"""

from __future__ import annotations

import json
import re


def extract_json(raw: str) -> dict:
    """Parse JSON object từ response LLM. Raise ValueError nếu không strategy nào work.

    Thứ tự: (1) parse trực tiếp → (2) code fence ```json ... ``` →
    (3) balanced-brace scan (tôn trọng string/escape) → (4) greedy regex {...}.
    """
    raw = raw.strip()

    # Strategy 1: parse trực tiếp
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Strategy 2: code fence ```json ... ```
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Strategy 3: balanced-brace scan — tìm { đầu rồi đếm brace, bỏ qua brace trong string
    start = raw.find("{")
    if start != -1:
        depth = 0
        in_string = False
        escape_next = False
        for i, ch in enumerate(raw[start:], start):
            if escape_next:
                escape_next = False
                continue
            if ch == "\\" and in_string:
                escape_next = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    candidate = raw[start : i + 1]
                    try:
                        return json.loads(candidate)
                    except json.JSONDecodeError:
                        break  # thử strategy 4

    # Strategy 4: greedy regex — từ { đầu đến } cuối
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(
        f"Không parse được JSON từ response LLM ({len(raw)} ký tự, 300 đầu): {raw[:300]}"
    )
