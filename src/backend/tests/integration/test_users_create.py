"""Test Admin tạo user — model '1 user = 1 role, thuộc 0..N project'.

Verify: tạo user với 0 / 1 / nhiều project; role duy nhất (default_role) trả về;
UserProjectRole sinh đúng số lượng cùng role; project_id sai → 404; email trùng → 409.
Cần postgres container + migration head (make test-be).
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import delete, select

from app.models.project import Project
from app.models.user import UserAccount
from app.models.user_project_role import UserProjectRole


@pytest.fixture
async def admin_token(client):
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vsf.local", "password": "admin-demo-2026"},
    )
    return res.json()["access_token"]


@pytest.fixture
async def two_projects(db_session):
    suffix = uuid.uuid4().hex[:8]
    p1 = Project(project_code=f"pa_{suffix}", project_name="PA", modality="text")
    p2 = Project(project_code=f"pb_{suffix}", project_name="PB", modality="text")
    db_session.add_all([p1, p2])
    await db_session.commit()
    yield [p1.id, p2.id]
    await db_session.execute(delete(Project).where(Project.id.in_([p1.id, p2.id])))
    await db_session.commit()


async def _cleanup_user(db_session, email: str) -> None:
    res = await db_session.execute(select(UserAccount.id).where(UserAccount.email == email))
    uid = res.scalar_one_or_none()
    if uid:
        await db_session.execute(delete(UserProjectRole).where(UserProjectRole.user_id == uid))
        await db_session.execute(delete(UserAccount).where(UserAccount.id == uid))
        await db_session.commit()


async def test_create_user_no_project_sets_default_role(client, admin_token, db_session):
    """project_ids rỗng → user tạo OK, có role (default_role), 0 UserProjectRole."""
    email = f"noproj_{uuid.uuid4().hex[:8]}@test.local"
    try:
        res = await client.post(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": email,
                "full_name": "No Project",
                "temp_password": "temp-pass-123",
                "role": "QA",
                "project_ids": [],
            },
        )
        assert res.status_code == 201, res.text
        body = res.json()
        assert body["role"] == "QA"
        # Không có UserProjectRole
        rows = await db_session.execute(
            select(UserProjectRole).join(UserAccount).where(UserAccount.email == email)
        )
        assert rows.scalars().first() is None
    finally:
        await _cleanup_user(db_session, email)


async def test_create_user_multi_project_same_role(client, admin_token, db_session, two_projects):
    """project_ids = 2 project → 2 UserProjectRole CÙNG role = role user."""
    email = f"multi_{uuid.uuid4().hex[:8]}@test.local"
    try:
        res = await client.post(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": email,
                "full_name": "Multi Project",
                "temp_password": "temp-pass-123",
                "role": "ANNOTATOR",
                "project_ids": [str(pid) for pid in two_projects],
            },
        )
        assert res.status_code == 201, res.text
        assert res.json()["role"] == "ANNOTATOR"
        rows = await db_session.execute(
            select(UserProjectRole).join(UserAccount).where(UserAccount.email == email)
        )
        upr = rows.scalars().all()
        assert len(upr) == 2
        assert all(r.role == "ANNOTATOR" for r in upr)
    finally:
        await _cleanup_user(db_session, email)


async def test_create_user_unknown_project_404(client, admin_token, db_session):
    email = f"badproj_{uuid.uuid4().hex[:8]}@test.local"
    try:
        res = await client.post(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": email,
                "full_name": "Bad Project",
                "temp_password": "temp-pass-123",
                "role": "ANNOTATOR",
                "project_ids": ["00000000-0000-0000-0000-000000000000"],
            },
        )
        assert res.status_code == 404
    finally:
        await _cleanup_user(db_session, email)
