"""Logic quản lý user (Admin tạo user + gán role per-project)."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.security import hash_password
from app.features.users.schemas import UserCreate
from app.models.user import UserAccount
from app.models.user_project_role import UserProjectRole


async def create_user(db: AsyncSession, payload: UserCreate) -> UserAccount:
    """Tạo user mới + mật khẩu tạm (hash) + gán role trong 1 project."""
    email = payload.email.lower()

    exists = await db.execute(select(UserAccount.id).where(UserAccount.email == email))
    if exists.scalar_one_or_none() is not None:
        raise AppError("Email đã tồn tại.", code="email_exists", status_code=409)

    user = UserAccount(
        email=email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.temp_password),
        status="active",
    )
    db.add(user)
    await db.flush()  # lấy user.id

    db.add(
        UserProjectRole(
            user_id=user.id,
            project_id=payload.project_id,
            role=payload.role.value,
            is_active=True,
        )
    )
    await db.commit()
    await db.refresh(user)
    return user


async def list_users(db: AsyncSession, limit: int, offset: int) -> list[UserAccount]:
    res = await db.execute(
        select(UserAccount).order_by(UserAccount.created_at.desc()).limit(limit).offset(offset)
    )
    return list(res.scalars().all())


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> UserAccount:
    res = await db.execute(select(UserAccount).where(UserAccount.id == user_id))
    user = res.scalar_one_or_none()
    if user is None:
        raise AppError("Không tìm thấy user.", code="not_found", status_code=404)
    return user
