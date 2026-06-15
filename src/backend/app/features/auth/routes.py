"""Auth routes — login / refresh / change-password / me.

Tham chiếu: docs AC mục 1 (RBAC), OQ-006 (security baseline).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.features.auth import service
from app.features.auth.deps import CurrentUser, get_current_user
from app.features.auth.schemas import (
    AccessTokenResponse,
    ChangePasswordRequest,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Đăng nhập. Dev: mock (AUTH_MOCK_ENABLED). Prod: verify password DB."""
    if settings.auth_mock_enabled:
        return service.mock_login(payload)
    return await service.login(db, payload)


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(
    payload: RefreshRequest, db: AsyncSession = Depends(get_db)
) -> AccessTokenResponse:
    """Đổi refresh token lấy access token mới (revalidate user trong DB)."""
    return await service.refresh(db, payload.refresh_token)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Đổi mật khẩu của chính mình (verify mật khẩu cũ)."""
    await service.change_password(db, user.subject, payload)


@router.get("/me")
async def me(user: CurrentUser = Depends(get_current_user)) -> dict:
    """Thông tin user hiện tại từ JWT."""
    return {"subject": user.subject, "role": user.role.value, "name": user.name}
