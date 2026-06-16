"""Unit test — Projects schema validation (BR-1.1, BR-1.2, BR-1.3, AC-1.2)."""

from __future__ import annotations

import uuid

import pytest
from pydantic import ValidationError

from app.constants import Role
from app.features.projects.schemas import AssignMemberIn, LlmConfigIn, ProjectCreate

# ---------------------------------------------------------------------------
# LlmConfigIn — BR-1.3 (prompt vars) + URL validation
# ---------------------------------------------------------------------------

VALID_LLM = dict(
    endpoint="https://api.openai.com/v1",
    api_key="sk-test-key",
    model="gpt-4o",
    prompt_template="Evaluate: {{claim_text}} using sources: {{source_context}}",
)


def test_llm_config_valid():
    cfg = LlmConfigIn(**VALID_LLM)
    assert cfg.model == "gpt-4o"


def test_llm_config_missing_claim_text_var():
    """Prompt thiếu {{claim_text}} → ValidationError (BR-1.3)."""
    bad = {**VALID_LLM, "prompt_template": "Only {{source_context}} here"}
    with pytest.raises(ValidationError, match="claim_text"):
        LlmConfigIn(**bad)


def test_llm_config_missing_source_context_var():
    """Prompt thiếu {{source_context}} → ValidationError (BR-1.3)."""
    bad = {**VALID_LLM, "prompt_template": "Only {{claim_text}} here"}
    with pytest.raises(ValidationError, match="source_context"):
        LlmConfigIn(**bad)


def test_llm_config_missing_both_vars():
    """Prompt thiếu cả 2 biến → ValidationError (BR-1.3)."""
    bad = {**VALID_LLM, "prompt_template": "No vars here, just text" * 2}
    with pytest.raises(ValidationError):
        LlmConfigIn(**bad)


def test_llm_config_invalid_endpoint():
    bad = {**VALID_LLM, "endpoint": "ftp://not-http.com"}
    with pytest.raises(ValidationError, match="http"):
        LlmConfigIn(**bad)


def test_llm_config_empty_api_key():
    bad = {**VALID_LLM, "api_key": ""}
    with pytest.raises(ValidationError):
        LlmConfigIn(**bad)


def test_llm_config_prompt_too_short():
    """Prompt ngắn hơn 10 ký tự → lỗi min_length (ngay cả không có vars)."""
    bad = {**VALID_LLM, "prompt_template": "short"}
    with pytest.raises(ValidationError):
        LlmConfigIn(**bad)


# ---------------------------------------------------------------------------
# ProjectCreate — AC-1.1, BR-1.1
# ---------------------------------------------------------------------------

VALID_PROJECT = dict(
    project_code="VIVIPEDIA_2026",
    project_name="Vivipedia ODA 2026",
    llm_config=VALID_LLM,
)


def test_project_create_valid():
    p = ProjectCreate(**VALID_PROJECT)
    assert p.project_code == "VIVIPEDIA_2026"


def test_project_create_code_too_short():
    bad = {**VALID_PROJECT, "project_code": ""}
    with pytest.raises(ValidationError):
        ProjectCreate(**bad)


def test_project_create_name_too_short():
    bad = {**VALID_PROJECT, "project_name": "ab"}  # min 3 chars
    with pytest.raises(ValidationError):
        ProjectCreate(**bad)


def test_project_create_description_too_long():
    bad = {**VALID_PROJECT, "description": "x" * 501}
    with pytest.raises(ValidationError):
        ProjectCreate(**bad)


def test_project_create_invalid_code_chars():
    bad = {**VALID_PROJECT, "project_code": "has space!"}
    with pytest.raises(ValidationError):
        ProjectCreate(**bad)


# ---------------------------------------------------------------------------
# AssignMemberIn — AC-1.3: ADMIN role không được gán qua endpoint này
# ---------------------------------------------------------------------------


def test_assign_member_admin_role_rejected():
    """Không gán role ADMIN qua assign_members (AC-1.3)."""
    with pytest.raises(ValidationError, match="ADMIN"):
        AssignMemberIn(user_id=uuid.uuid4(), role=Role.ADMIN)


def test_assign_member_annotator_ok():
    m = AssignMemberIn(user_id=uuid.uuid4(), role=Role.ANNOTATOR)
    assert m.role == Role.ANNOTATOR


def test_assign_member_qa_ok():
    m = AssignMemberIn(user_id=uuid.uuid4(), role=Role.QA)
    assert m.role == Role.QA
