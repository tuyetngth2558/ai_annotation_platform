"""Test RBAC: mỗi endpoint chỉ cho phép role đúng, chặn role sai.

Dùng mock auth (AUTH_MOCK_ENABLED=true) — không cần DB thật cho RBAC check.
Mock users khớp với fixtures/users.py.

Coverage:
- B2-01: Admin truy cập được /import-bundles (ADMIN-only)
- B2-02: Annotator bị chặn /import-bundles → 403
- B2-03: QA bị chặn /import-bundles → 403
- B2-04: Annotator truy cập được /tasks (ANNOTATOR-only)
- B2-05: Admin bị chặn /tasks → 403
- B2-06: QA bị chặn /tasks → 403
- B2-07: QA truy cập được /qa-reviews/queue
- B2-08: Admin truy cập được /qa-reviews/queue (ADMIN cũng có quyền QA)
- B2-09: Annotator bị chặn /qa-reviews/queue → 403
- B2-10: Admin truy cập được /exports/{id}/download
- B2-11: Annotator bị chặn /exports → 403
- B2-12: QA bị chặn /exports → 403
- B2-13: Không có token → 401
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

from tests.fixtures.users import MOCK_USERS


async def _login(client: AsyncClient, role: str) -> str:
    """Đăng nhập mock user, trả về access token."""
    u = MOCK_USERS[role]
    resp = await client.post("/api/v1/auth/login", json={
        "email": u["email"],
        "password": u["password"],
    })
    assert resp.status_code == 200, f"Login {role} thất bại: {resp.text}"
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# B2-01~03: /import-bundles — chỉ ADMIN
# ---------------------------------------------------------------------------

async def test_import_bundles_admin_allowed(client):
    token = await _login(client, "admin")
    # validate endpoint với body rỗng → 422 (schema error), KHÔNG phải 403
    resp = await client.post("/api/v1/import-bundles/validate", json={}, headers=_auth(token))
    assert resp.status_code != 403


async def test_import_bundles_annotator_blocked(client):
    token = await _login(client, "annotator")
    resp = await client.post("/api/v1/import-bundles/validate", json={}, headers=_auth(token))
    assert resp.status_code == 403


async def test_import_bundles_qa_blocked(client):
    token = await _login(client, "qa")
    resp = await client.post("/api/v1/import-bundles/validate", json={}, headers=_auth(token))
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# B2-04~06: /tasks — chỉ ANNOTATOR
# ---------------------------------------------------------------------------

async def test_tasks_annotator_allowed(client):
    token = await _login(client, "annotator")
    resp = await client.get("/api/v1/tasks", headers=_auth(token))
    # Service cần DB nên mock trả 500 hoặc 200 — nhưng KHÔNG 403
    assert resp.status_code != 403


async def test_tasks_admin_blocked(client):
    token = await _login(client, "admin")
    resp = await client.get("/api/v1/tasks", headers=_auth(token))
    assert resp.status_code == 403


async def test_tasks_qa_blocked(client):
    token = await _login(client, "qa")
    resp = await client.get("/api/v1/tasks", headers=_auth(token))
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# B2-07~09: /qa-reviews/queue — QA + ADMIN
# ---------------------------------------------------------------------------

async def test_qa_queue_qa_allowed(client):
    token = await _login(client, "qa")
    resp = await client.get("/api/v1/qa-reviews/queue", headers=_auth(token))
    assert resp.status_code != 403


async def test_qa_queue_admin_allowed(client):
    token = await _login(client, "admin")
    resp = await client.get("/api/v1/qa-reviews/queue", headers=_auth(token))
    assert resp.status_code != 403


async def test_qa_queue_annotator_blocked(client):
    token = await _login(client, "annotator")
    resp = await client.get("/api/v1/qa-reviews/queue", headers=_auth(token))
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# B2-10~12: /exports — chỉ ADMIN
# ---------------------------------------------------------------------------

async def test_export_admin_allowed(client):
    token = await _login(client, "admin")
    fake_id = uuid.uuid4()
    resp = await client.get(f"/api/v1/exports/{fake_id}/download", headers=_auth(token))
    # Không có approved claim → 400 no_approved_claims (không phải 403)
    # Hoặc 500 nếu DB mock không khả dụng — nhưng không phải 403
    assert resp.status_code != 403


async def test_export_annotator_blocked(client):
    token = await _login(client, "annotator")
    resp = await client.get(f"/api/v1/exports/{uuid.uuid4()}/download", headers=_auth(token))
    assert resp.status_code == 403


async def test_export_qa_blocked(client):
    token = await _login(client, "qa")
    resp = await client.get(f"/api/v1/exports/{uuid.uuid4()}/download", headers=_auth(token))
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# B2-13: Không có token → 401
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("method,url", [
    ("GET", "/api/v1/tasks"),
    ("GET", "/api/v1/qa-reviews/queue"),
    ("POST", "/api/v1/import-bundles/validate"),
])
async def test_unauthenticated_returns_401(client, method: str, url: str):
    if method == "GET":
        resp = await client.get(url)
    else:
        resp = await client.post(url, json={})
    assert resp.status_code == 401
