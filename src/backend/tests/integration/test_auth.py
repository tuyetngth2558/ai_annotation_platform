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


async def test_rbac_users_endpoint_admin_only(client):
    """GET /users yêu cầu ADMIN — QA token bị 403."""
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "qa@vsf.local", "password": "qa-demo-2026"},
    )
    token = login.json()["access_token"]
    res = await client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
