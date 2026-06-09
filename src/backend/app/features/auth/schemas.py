"""Schema cho auth (login / token / refresh / đổi mật khẩu)."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.constants import Role


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
    # max 72: giới hạn bcrypt (validate sớm → 422 thay vì lỗi tầng hash).
    new_password: str = Field(min_length=8, max_length=72, description="Mật khẩu mới 8-72 ký tự")


class CurrentUser(BaseModel):
    id: str
    email: str
    full_name: str
    role: Role
