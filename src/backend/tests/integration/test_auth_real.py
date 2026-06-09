"""Test login THẬT (verify password DB, không qua mock).

Gọi service.login trực tiếp với db_session (DB thật) — không phụ thuộc
AUTH_MOCK_ENABLED. Test: bcrypt verify, last_login_at, change-password, role từ DB,
user disabled. Cần postgres container + migration head (chạy: make test-be).

Tự tạo + dọn user/project để không phụ thuộc seed và không để rác.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import delete, select

from app.core.exceptions import AuthError
from app.core.security import hash_password
from app.features.auth import service
from app.features.auth.schemas import ChangePasswordRequest, LoginRequest
from app.models.project import Project
from app.models.user import UserAccount
from app.models.user_project_role import UserProjectRole


@pytest.fixture
async def real_user(db_session):
    """Tạo 1 project + user thật (ANNOTATOR), dọn sau test."""
    suffix = uuid.uuid4().hex[:8]
    email = f"real_{suffix}@test.local"
    project = Project(project_code=f"p_{suffix}", project_name="Test", modality="text")
    db_session.add(project)
    await db_session.flush()
    user = UserAccount(
        email=email,
        full_name="Real User",
        password_hash=hash_password("correct-pass-123"),
        status="active",
    )
    db_session.add(user)
    await db_session.flush()
    db_session.add(
        UserProjectRole(user_id=user.id, project_id=project.id, role="ANNOTATOR", is_active=True)
    )
    await db_session.commit()

    yield {"email": email, "password": "correct-pass-123", "id": user.id, "project_id": project.id}

    # Dọn
    await db_session.execute(delete(UserProjectRole).where(UserProjectRole.user_id == user.id))
    await db_session.execute(delete(UserAccount).where(UserAccount.id == user.id))
    await db_session.execute(delete(Project).where(Project.id == project.id))
    await db_session.commit()


async def test_real_login_correct_password(db_session, real_user):
    res = await service.login(
        db_session, LoginRequest(email=real_user["email"], password=real_user["password"])
    )
    assert res.role.value == "ANNOTATOR"
    assert res.access_token and res.refresh_token


async def test_real_login_wrong_password(db_session, real_user):
    with pytest.raises(AuthError):
        await service.login(
            db_session, LoginRequest(email=real_user["email"], password="wrong")
        )


async def test_real_login_updates_last_login_at(db_session, real_user):
    await service.login(
        db_session, LoginRequest(email=real_user["email"], password=real_user["password"])
    )
    res = await db_session.execute(
        select(UserAccount.last_login_at).where(UserAccount.id == real_user["id"])
    )
    assert res.scalar_one() is not None


async def test_real_login_disabled_user(db_session, real_user):
    await db_session.execute(
        select(UserAccount).where(UserAccount.id == real_user["id"])
    )
    user = (
        await db_session.execute(select(UserAccount).where(UserAccount.id == real_user["id"]))
    ).scalar_one()
    user.status = "disabled"
    await db_session.commit()
    with pytest.raises(AuthError):
        await service.login(
            db_session, LoginRequest(email=real_user["email"], password=real_user["password"])
        )


async def test_real_change_password(db_session, real_user):
    await service.change_password(
        db_session,
        str(real_user["id"]),
        ChangePasswordRequest(old_password=real_user["password"], new_password="new-pass-456"),
    )
    # login pass mới OK
    res = await service.login(
        db_session, LoginRequest(email=real_user["email"], password="new-pass-456")
    )
    assert res.role.value == "ANNOTATOR"
    # pass cũ không còn dùng được
    with pytest.raises(AuthError):
        await service.login(
            db_session, LoginRequest(email=real_user["email"], password=real_user["password"])
        )


async def test_real_change_password_wrong_old(db_session, real_user):
    with pytest.raises(AuthError):
        await service.change_password(
            db_session,
            str(real_user["id"]),
            ChangePasswordRequest(old_password="wrong-old", new_password="whatever-789"),
        )


async def test_refresh_revalidates_disabled_user(db_session, real_user):
    """Refresh PHẢI bị chặn nếu user bị disabled sau khi nhận refresh token (High)."""
    tokens = await service.login(
        db_session, LoginRequest(email=real_user["email"], password=real_user["password"])
    )
    # Disable user
    user = (
        await db_session.execute(select(UserAccount).where(UserAccount.id == real_user["id"]))
    ).scalar_one()
    user.status = "disabled"
    await db_session.commit()

    with pytest.raises(AuthError):
        await service.refresh(db_session, tokens.refresh_token)
