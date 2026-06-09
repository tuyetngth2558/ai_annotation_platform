"""Logic auth — login/refresh/đổi mật khẩu thật (verify password DB + JWT).

Auth baseline đúng OQ-006: email/password + RBAC. KHÔNG register công khai (Admin tạo
user — xem features/users), KHÔNG OAuth/verify email/MFA (BA hoãn).

Mock login (3 user demo) vẫn giữ cho dev khi AUTH_MOCK_ENABLED=true.
"""

from __future__ import annotations

from datetime import UTC, datetime

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import Role
from app.core.exceptions import AuthError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.features.auth.schemas import (
    AccessTokenResponse,
    ChangePasswordRequest,
    LoginRequest,
    TokenResponse,
)
from app.models.user import UserAccount
from app.models.user_project_role import UserProjectRole

# 3 user mock — khớp prototype + seed (chỉ dùng khi AUTH_MOCK_ENABLED).
_MOCK_ACCOUNTS: dict[str, dict] = {
    "admin@vsf.local": {"password": "admin-demo-2026", "role": Role.ADMIN, "name": "Admin Demo"},
    "annotator@vsf.local": {
        "password": "annotator-demo-2026",
        "role": Role.ANNOTATOR,
        "name": "Annotator Demo",
    },
    "qa@vsf.local": {"password": "qa-demo-2026", "role": Role.QA, "name": "QA Demo"},
}


def mock_login(payload: LoginRequest) -> TokenResponse:
    """Đăng nhập bằng tài khoản mock (chỉ dev)."""
    account = _MOCK_ACCOUNTS.get(payload.email.lower())
    if not account or account["password"] != payload.password:
        raise AuthError("Email hoặc mật khẩu không đúng.")
    return _issue_tokens(
        subject=payload.email.lower(),
        email=payload.email,
        role=account["role"],
        name=account["name"],
    )


async def _get_primary_role(db: AsyncSession, user_id) -> Role:
    """Role chính của user — bản ghi USER_PROJECT_ROLE active đầu tiên.

    MVP: 1 role chính/user. require_project_role (per-project) hoàn thiện sau.
    """
    res = await db.execute(
        select(UserProjectRole.role)
        .where(UserProjectRole.user_id == user_id, UserProjectRole.is_active.is_(True))
        .limit(1)
    )
    role_str = res.scalar_one_or_none()
    if role_str is None:
        raise AuthError("Tài khoản chưa được gán vai trò.")
    return Role(role_str)


def _issue_tokens(subject: str, email: str, role: Role, name: str) -> TokenResponse:
    claims = {"role": role.value, "name": name}
    return TokenResponse(
        access_token=create_access_token(subject=subject, claims=claims),
        refresh_token=create_refresh_token(subject=subject, claims=claims),
        role=role,
        email=email,
    )


async def login(db: AsyncSession, payload: LoginRequest) -> TokenResponse:
    """Login thật — verify password trong DB, phát access + refresh token."""
    res = await db.execute(select(UserAccount).where(UserAccount.email == payload.email.lower()))
    user = res.scalar_one_or_none()

    # Verify password (luôn gọi verify để giảm timing leak; dùng hash giả nếu user None).
    valid = bool(
        user and user.password_hash and verify_password(payload.password, user.password_hash)
    )
    if not user or not valid:
        raise AuthError("Email hoặc mật khẩu không đúng.")
    if user.status != "active":
        raise AuthError("Tài khoản đã bị khóa.")

    role = await _get_primary_role(db, user.id)

    user.last_login_at = datetime.now(UTC)
    await db.commit()

    return _issue_tokens(subject=str(user.id), email=user.email, role=role, name=user.full_name)


def refresh(payload_token: str) -> AccessTokenResponse:
    """Đổi refresh token lấy access token mới."""
    try:
        data = decode_token(payload_token, expected_type="refresh")
    except jwt.PyJWTError as exc:
        raise AuthError("Refresh token không hợp lệ hoặc đã hết hạn.") from exc

    access = create_access_token(
        subject=data["sub"],
        claims={"role": data.get("role"), "name": data.get("name")},
    )
    return AccessTokenResponse(access_token=access)


async def change_password(db: AsyncSession, user_id: str, payload: ChangePasswordRequest) -> None:
    """Đổi mật khẩu — verify mật khẩu cũ rồi đặt mật khẩu mới."""
    res = await db.execute(select(UserAccount).where(UserAccount.id == user_id))
    user = res.scalar_one_or_none()
    if not user or not user.password_hash:
        raise AuthError("Không tìm thấy tài khoản.")
    if not verify_password(payload.old_password, user.password_hash):
        raise AuthError("Mật khẩu cũ không đúng.")

    user.password_hash = hash_password(payload.new_password)
    await db.commit()
