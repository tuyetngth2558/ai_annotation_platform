"""Schema cho auth (login / token / current user)."""

from __future__ import annotations

from pydantic import BaseModel

from app.constants import Role


class LoginRequest(BaseModel):
    # Dùng str (không EmailStr) để chấp nhận domain nội bộ/demo như `@vsf.local`
    # (.local là reserved domain — EmailStr từ chối). Validate format thật ở
    # tầng đăng ký nếu cần (TODO auth).
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    email: str


class CurrentUser(BaseModel):
    id: str
    email: str
    full_name: str
    role: Role
