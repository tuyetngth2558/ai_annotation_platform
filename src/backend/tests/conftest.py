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


@pytest.fixture
async def db_session():
    """AsyncSession dùng DB thật (postgres container) — cho test chạm DB.

    Tạo engine riêng PER-TEST với NullPool: pytest-asyncio tạo event loop mới mỗi
    test, dùng engine module-level (pool) sẽ lỗi "Event loop is closed" lúc teardown.
    NullPool không giữ connection qua loop → sạch. Mỗi test tự dọn data nó tạo.
    Cần postgres + migration head; chạy trong container (make test-be).
    """
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool

    from app.core.config import settings

    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    maker = async_sessionmaker(bind=engine, expire_on_commit=False)
    try:
        async with maker() as session:
            yield session
    finally:
        await engine.dispose()
