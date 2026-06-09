"""Auth dependencies — lấy user hiện tại từ JWT (Bearer token).

Hoạt động với cả token mock (mock login) và token thật sau này, vì cả hai đều là
JWT có claim `role`. Dùng làm nền cho RBAC (core/permissions.py).
"""

from __future__ import annotations

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.constants import Role
from app.core.exceptions import AuthError
from app.core.security import decode_token

# auto_error=False → tự ném AuthError (đúng shape ErrorResponse) thay vì 403 mặc định.
_bearer = HTTPBearer(auto_error=False)


class CurrentUser:
    """User rút từ JWT. MVP: subject (email/id) + role."""

    def __init__(self, subject: str, role: Role, name: str | None = None):
        self.subject = subject
        self.role = role
        self.name = name


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> CurrentUser:
    if creds is None:
        raise AuthError("Thiếu token xác thực.")
    try:
        payload = decode_token(creds.credentials)
    except jwt.PyJWTError as exc:
        raise AuthError("Token không hợp lệ hoặc đã hết hạn.") from exc

    role_raw = payload.get("role")
    try:
        role = Role(role_raw)
    except ValueError as exc:
        raise AuthError("Token thiếu role hợp lệ.") from exc

    return CurrentUser(subject=payload.get("sub", ""), role=role, name=payload.get("name"))
