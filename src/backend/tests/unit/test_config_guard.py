"""Unit test startup guard config (#7) — chặn cấu hình dev nguy hiểm ở staging/prod."""

from __future__ import annotations

import pytest

from app.core.config import Settings


def _settings(**over) -> Settings:
    base = dict(
        app_env="production",
        app_debug=False,
        jwt_secret="a-strong-secret-value",
        auth_mock_enabled=False,
        secret_encryption_key="some-fernet-key",
        s3_secret_key="strong-s3-secret",
    )
    base.update(over)
    return Settings(**base)


def test_development_skips_guard():
    # Dev: cấu hình mặc định (debug, secret dev) KHÔNG raise.
    _settings(app_env="development", app_debug=True,
              jwt_secret="dev-only-change-me-please").assert_safe_for_env()


def test_production_rejects_debug():
    with pytest.raises(RuntimeError, match="app_debug"):
        _settings(app_debug=True).assert_safe_for_env()


def test_production_rejects_default_jwt_secret():
    with pytest.raises(RuntimeError, match="jwt_secret"):
        _settings(jwt_secret="dev-only-change-me-please").assert_safe_for_env()


def test_production_rejects_mock_auth():
    with pytest.raises(RuntimeError, match="auth_mock_enabled"):
        _settings(auth_mock_enabled=True).assert_safe_for_env()


def test_production_rejects_missing_encryption_key():
    with pytest.raises(RuntimeError, match="secret_encryption_key"):
        _settings(secret_encryption_key="").assert_safe_for_env()


def test_production_rejects_default_s3_secret():
    with pytest.raises(RuntimeError, match="s3_secret_key"):
        _settings(s3_secret_key="minioadmin").assert_safe_for_env()


def test_production_passes_when_all_safe():
    _settings().assert_safe_for_env()  # không raise
