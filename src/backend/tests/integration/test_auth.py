"""Integration test mẫu — health + mock login (auth flow).

Mẫu để Test/QA team bám theo khi viết test API. Dùng `client` fixture (conftest).
"""

from __future__ import annotations

import pytest

from tests.fixtures.users import MOCK_USERS


async def test_health_ok(client):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.parametrize("key", ["admin", "annotator", "qa"])
async def test_mock_login_returns_token_and_role(client, key):
    user = MOCK_USERS[key]
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": user["email"], "password": user["password"]},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["role"] == user["role"]
    assert body["access_token"]


async def test_mock_login_wrong_password(client):
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vsf.local", "password": "wrong"},
    )
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "unauthorized"


async def test_login_subject_is_user_id_not_email(client, db_session):
    """JWT subject = str(user.id), KHÔNG phải email (fix #1 auth — khớp downstream resolve).

    /auth/me trả subject; phải là UUID của user demo trong DB, không phải 'admin@vsf.local'.
    """
    import uuid as _uuid

    from sqlalchemy import select

    from app.models.user import UserAccount

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vsf.local", "password": "admin-demo-2026"},
    )
    token = login.json()["access_token"]
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    subject = me.json()["subject"]
    # subject parse được thành UUID (không phải email)
    parsed = _uuid.UUID(subject)
    assert "@" not in subject
    # và đúng id của admin trong DB
    row = await db_session.execute(
        select(UserAccount.id).where(UserAccount.email == "admin@vsf.local")
    )
    assert row.scalar_one() == parsed


async def test_login_returns_refresh_token(client):
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vsf.local", "password": "admin-demo-2026"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"] and body["refresh_token"]


async def test_refresh_returns_new_access_token(client):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vsf.local", "password": "admin-demo-2026"},
    )
    refresh_token = login.json()["refresh_token"]

    res = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert res.status_code == 200
    assert res.json()["access_token"]


async def test_refresh_rejects_access_token(client):
    """Gửi access token vào /refresh phải bị từ chối (sai type)."""
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vsf.local", "password": "admin-demo-2026"},
    )
    access_token = login.json()["access_token"]

    res = await client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
    assert res.status_code == 401


async def test_me_requires_token(client):
    assert (await client.get("/api/v1/auth/me")).status_code == 401


async def test_me_returns_user(client):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "qa@vsf.local", "password": "qa-demo-2026"},
    )
    token = login.json()["access_token"]
    res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["role"] == "QA"


async def test_refresh_token_cannot_access_protected_route(client):
    """Refresh token (TTL dài) KHÔNG được gọi route bảo vệ — phải 401 (High finding)."""
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vsf.local", "password": "admin-demo-2026"},
    )
    refresh_token = login.json()["refresh_token"]
    res = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {refresh_token}"}
    )
    assert res.status_code == 401


async def test_rbac_users_endpoint_admin_only(client):
    """GET /users yêu cầu ADMIN — QA token bị 403."""
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "qa@vsf.local", "password": "qa-demo-2026"},
    )
    token = login.json()["access_token"]
    res = await client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


async def test_create_user_rejects_long_password_bytes(client):
    """Password ≤72 ký tự nhưng >72 BYTE (Unicode) → 422, không phải 500 (Medium)."""
    admin = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vsf.local", "password": "admin-demo-2026"},
    )
    token = admin.json()["access_token"]
    # 30 ký tự tiếng Việt có dấu → mỗi ký tự ~3 byte UTF-8 → ~90 byte > 72.
    long_pw = "mậtkhẩurấtdàivàcódấuTiếngViệt" * 2
    assert len(long_pw) <= 72 and len(long_pw.encode("utf-8")) > 72  # tiền đề test
    res = await client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": "x@test.local",
            "full_name": "X",
            "temp_password": long_pw,
            "role": "ANNOTATOR",
            "project_ids": [],
        },
    )
    assert res.status_code == 422
