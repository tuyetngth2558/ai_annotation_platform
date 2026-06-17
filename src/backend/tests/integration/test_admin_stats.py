"""Test GET /admin/stats — thống kê tổng quan Dashboard ADMIN."""

from __future__ import annotations

import pytest


@pytest.fixture
async def admin_token(client):
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vsf.local", "password": "admin-demo-2026"},
    )
    return res.json()["access_token"]


async def test_admin_stats_shape(client, admin_token):
    res = await client.get(
        "/api/v1/admin/stats", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200, res.text
    body = res.json()
    # Có đủ các nhóm thống kê + kiểu đúng.
    assert set(body["users"]) == {"total", "admin", "annotator", "qa"}
    assert set(body["projects"]) == {"total", "active", "draft"}
    assert {"total", "ready", "submitted", "approved"} <= set(body["claims"])
    assert isinstance(body["audit_count"], int)
    # users.total = tổng theo role (nhất quán).
    u = body["users"]
    assert u["total"] >= u["admin"] + u["annotator"] + u["qa"] - 0  # các role khác có thể có


async def test_admin_stats_requires_admin(client):
    # Annotator không được xem.
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "annotator@vsf.local", "password": "annotator-demo-2026"},
    )
    token = login.json()["access_token"]
    res = await client.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
