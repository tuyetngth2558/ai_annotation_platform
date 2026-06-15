"""Bảo mật: hash/verify mật khẩu (bcrypt) + tạo/verify JWT.

Khung chạy được cho luồng auth mock; logic production hoàn thiện ở feature auth.
Tham chiếu: OQ-006 (security baseline), docs AC mục 1 (RBAC).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

from app.core.config import settings

# bcrypt giới hạn 72 byte. REJECT password dài hơn (không cắt âm thầm — tránh 2 password
# trùng 72 byte đầu thành tương đương). Validate ở schema (max_length) + chặn ở đây.
BCRYPT_MAX_BYTES = 72


class PasswordTooLongError(ValueError):
    """Password vượt 72 byte (giới hạn bcrypt)."""


def hash_password(plain: str) -> str:
    encoded = plain.encode("utf-8")
    if len(encoded) > BCRYPT_MAX_BYTES:
        raise PasswordTooLongError(
            f"Mật khẩu không được vượt {BCRYPT_MAX_BYTES} byte (UTF-8)."
        )
    return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    encoded = plain.encode("utf-8")
    if len(encoded) > BCRYPT_MAX_BYTES:
        return False  # password dài quá → không thể đúng (hash không bao giờ tạo từ >72B)
    try:
        return bcrypt.checkpw(encoded, hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def _encode(
    subject: str, token_type: str, expires: timedelta, claims: dict[str, Any] | None
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + expires,
        "type": token_type,
    }
    if claims:
        payload.update(claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str, claims: dict[str, Any] | None = None) -> str:
    """Tạo JWT access token (TTL ngắn). `subject` thường là user_id."""
    return _encode(subject, "access", timedelta(minutes=settings.jwt_access_ttl_minutes), claims)


def create_refresh_token(subject: str, claims: dict[str, Any] | None = None) -> str:
    """Tạo JWT refresh token (TTL dài) để gia hạn access mà không login lại."""
    return _encode(subject, "refresh", timedelta(days=settings.jwt_refresh_ttl_days), claims)


def decode_token(token: str, *, expected_type: str | None = None) -> dict[str, Any]:
    """Giải mã + verify JWT. Raise jwt.PyJWTError nếu sai/hết hạn.

    `expected_type` ("access"/"refresh") để chặn dùng nhầm loại token
    (vd gửi access token vào /refresh).
    """
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if expected_type is not None and payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(f"Sai loại token, cần {expected_type}.")
    return payload
