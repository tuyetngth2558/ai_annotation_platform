"""Logic auth.

Đợt scaffold: hỗ trợ MOCK LOGIN (3 user demo) để luồng đăng nhập + điều hướng
theo role chạy được. Mock CHỈ hoạt động khi settings.auth_mock_enabled = True
(dev). Staging/prod tắt → raise (tránh quên mock login lên môi trường thật).

Login thật (verify password DB + JWT) để TODO.
"""

from __future__ import annotations

from app.constants import Role
from app.core.exceptions import AuthError
from app.core.security import create_access_token
from app.features.auth.schemas import LoginRequest, TokenResponse

# 3 user mock — khớp prototype (src/frontend/prototype/login.html).
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
    """Đăng nhập bằng tài khoản mock (chỉ dev). Trả JWT thật để FE giữ luồng."""
    account = _MOCK_ACCOUNTS.get(payload.email.lower())
    if not account or account["password"] != payload.password:
        raise AuthError("Email hoặc mật khẩu không đúng.")

    token = create_access_token(
        subject=payload.email.lower(),
        claims={"role": account["role"].value, "name": account["name"]},
    )
    return TokenResponse(access_token=token, role=account["role"], email=payload.email)


async def login(payload: LoginRequest) -> TokenResponse:
    """Login thật — verify password trong DB.

    TODO(auth): query UserAccount theo email, verify_password(payload.password,
    user.password_hash), lấy role từ USER_PROJECT_ROLE, phát JWT.
    """
    raise AuthError("Login thật chưa implement (scaffold). Bật AUTH_MOCK_ENABLED để dùng mock.")
