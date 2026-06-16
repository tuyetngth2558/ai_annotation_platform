"""Unit test — validate_storage_key chống path traversal (High finding)."""

from __future__ import annotations

import pytest

from app.integrations.storage.base import InvalidStorageKey, validate_storage_key


@pytest.mark.parametrize(
    "key",
    [
        "../etc/passwd",
        "../../secret",
        "a/../../b",
        "/absolute/path",
        "",
        "   ",
        "a\\b",  # backslash
        "a\x00b",  # null byte
    ],
)
def test_reject_malicious_keys(key):
    with pytest.raises(InvalidStorageKey):
        validate_storage_key(key)


@pytest.mark.parametrize(
    "key,expected",
    [
        ("bundles/1.pdf", "bundles/1.pdf"),
        ("a/b/c.pdf", "a/b/c.pdf"),
        ("./bundles/x.pdf", "bundles/x.pdf"),  # normalize bỏ ./
        ("exports/file.csv", "exports/file.csv"),
    ],
)
def test_accept_valid_keys(key, expected):
    assert validate_storage_key(key) == expected
