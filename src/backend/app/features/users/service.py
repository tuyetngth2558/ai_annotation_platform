"""Logic quản lý user (Admin tạo user + gán role per-project)."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, NotFoundError
from app.core.security import hash_password
from app.features.users.schemas import UserCreate
from app.models.project import Project
from app.models.user import UserAccount
from app.models.user_project_role import UserProjectRole


async def create_user(db: AsyncSession, payload: UserCreate) -> UserAccount:
    """Tạo user mới + mật khẩu tạm (hash) + role duy nhất + gán vào 0..N project.

    1 user = 1 role (payload.role) áp cho mọi project. project_ids rỗng → user chưa
    thuộc project nào (chỉ có default_role). Mỗi project_id → 1 UserProjectRole cùng role.
    """
    email = payload.email.lower()

    exists = await db.execute(select(UserAccount.id).where(UserAccount.email == email))
    if exists.scalar_one_or_none() is not None:
        raise AppError("Email đã tồn tại.", code="email_exists", status_code=409)

    # Validate tất cả project_ids tồn tại (loại trùng) → 404 nghiệp vụ thay vì FK 500.
    project_ids = list(dict.fromkeys(payload.project_ids))  # dedup, giữ thứ tự
    if project_ids:
        found = await db.execute(select(Project.id).where(Project.id.in_(project_ids)))
        found_ids = {row[0] for row in found.all()}
        missing = [str(pid) for pid in project_ids if pid not in found_ids]
        if missing:
            raise NotFoundError(f"Không tìm thấy project để gán role: {', '.join(missing)}")

    user = UserAccount(
        email=email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.temp_password),
        status="active",
        default_role=payload.role.value,  # role duy nhất của user
    )
    db.add(user)
    await db.flush()  # lấy user.id

    for pid in project_ids:
        db.add(
            UserProjectRole(
                user_id=user.id,
                project_id=pid,
                role=payload.role.value,  # cùng role ở mọi project
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
