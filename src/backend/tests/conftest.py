"""Pytest fixtures dùng chung.

- `app`: FastAPI app với AUTH_MOCK_ENABLED bật (để test login mock).
- `client`: httpx AsyncClient gắn vào app (không cần chạy server thật).

DB fixture (async engine) để TODO khi có test cần DB — xem tests/fixtures/.
"""

from __future__ import annotations

import os

import pytest
from httpx import ASGITransport, AsyncClient

# Bật mock auth TRƯỚC khi import app (settings đọc env lúc import).
os.environ.setdefault("AUTH_MOCK_ENABLED", "true")


@pytest.fixture
def app():
    from app.main import create_app

    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# TODO(test): db_session fixture (async engine + create_all trên aiosqlite/postgres test)
#   để integration test chạm DB. Dùng fixtures/ cho seed data.
