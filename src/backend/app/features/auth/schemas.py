"""Schema cho auth (login / token / refresh / đổi mật khẩu)."""

from __future__ import annotations

from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field

from app.constants import Role
from app.core.security import BCRYPT_MAX_BYTES


def _max_72_bytes(v: str) -> str:
    """Validate password ≤72 BYTE (bcrypt giới hạn theo byte, không phải ký tự).

    Unicode (tiếng Việt/emoji) có thể ≤72 ký tự nhưng >72 byte → reject ở schema
    (trả 422) thay vì để hash_password raise → 500.
    """
    if len(v.encode("utf-8")) > BCRYPT_MAX_BYTES:
        raise ValueError(f"Mật khẩu không được vượt {BCRYPT_MAX_BYTES} byte (UTF-8).")
    return v


# Password type dùng chung: 8 ký tự tối thiểu + ≤72 byte.
Password = Annotated[str, Field(min_length=8), AfterValidator(_max_72_bytes)]


class LoginRequest(BaseModel):
    # Dùng str (không EmailStr) để chấp nhận domain nội bộ/demo như `@vsf.local`
    # (.local là reserved domain — EmailStr từ chối).
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: Role
    email: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    """Trả về khi refresh — chỉ access token mới."""

    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: Password  # 8 ký tự tối thiểu + ≤72 byte (validate sớm → 422)


class BootstrapAdminRequest(BaseModel):
    """Tạo Admin đầu tiên — chỉ dùng 1 lần khi DB trống."""

    email: str
    full_name: str = Field(min_length=1, max_length=200)
    password: Password


class CurrentUser(BaseModel):
    id: str
    email: str
    full_name: str
    role: Role
