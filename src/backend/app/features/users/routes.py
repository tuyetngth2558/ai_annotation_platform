"""User routes — Admin tạo/list user (AC-1.3: gán nhân sự).

RBAC: chỉ ADMIN. Đây là cách tạo user trong MVP (không đăng ký công khai — BA).
API path: /api/v1/users
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status

from app.constants import Role
from app.core.pagination import PageParams, page_params
from app.core.permissions import require_role
from app.db.session import get_db
from app.features.users import service
from app.features.users.schemas import UserCreate, UserOut

# Toàn bộ route users chỉ ADMIN.
router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db=Depends(get_db)) -> UserOut:
    """Tạo user + mật khẩu tạm + gán role trong project (AC-1.3)."""
    user = await service.create_user(db, payload)
    return UserOut.model_validate(user)


@router.get("", response_model=list[UserOut])
async def list_users(pg: PageParams = Depends(page_params), db=Depends(get_db)) -> list[UserOut]:
    """Danh sách user (phân trang)."""
    users = await service.list_users(db, pg.limit, pg.offset)
    return [UserOut.model_validate(u) for u in users]


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: uuid.UUID, db=Depends(get_db)) -> UserOut:
    user = await service.get_user(db, user_id)
    return UserOut.model_validate(user)
