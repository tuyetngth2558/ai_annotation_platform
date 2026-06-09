"""Auth routes — login / me.

Tham chiếu: docs AC mục 1 (RBAC), OQ-006 (security baseline).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.features.auth import service
from app.features.auth.deps import CurrentUser, get_current_user
from app.features.auth.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest) -> TokenResponse:
    """Đăng nhập. Dev: dùng mock (AUTH_MOCK_ENABLED). Prod: login thật (TODO)."""
    if settings.auth_mock_enabled:
        return service.mock_login(payload)
    return await service.login(payload)


@router.get("/me")
async def me(user: CurrentUser = Depends(get_current_user)) -> dict:
    """Thông tin user hiện tại từ JWT (hoạt động với token mock + thật)."""
    return {"subject": user.subject, "role": user.role.value, "name": user.name}
