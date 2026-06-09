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
