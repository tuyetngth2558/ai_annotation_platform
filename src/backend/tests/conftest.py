"""Pytest fixtures dùng chung.

- `app`: FastAPI app với AUTH_MOCK_ENABLED bật (để test login mock).
- `client`: httpx AsyncClient gắn vào app (không cần chạy server thật).
- `db_session`: AsyncSession với DB thật.

Giải pháp event loop:
- app.db.session.engine được tạo module-level với connection pool → gây
  "Event loop is closed" khi test thứ 2 chạy. Fix: patch engine dùng
  StaticPool (in-memory, không giữ connection qua event loop boundaries).
- client và db_session đều scope=function, mỗi test có event loop riêng.
"""

from __future__ import annotations

import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import NullPool

# Bật mock auth TRƯỚC khi import app (settings đọc env lúc import).
os.environ.setdefault("AUTH_MOCK_ENABLED", "true")


@pytest.fixture(scope="session")
def app():
    """Tạo app 1 lần cho cả session. Engine module-level dùng NullPool
    để không giữ connection qua event loop boundaries giữa các test."""
    from sqlalchemy.ext.asyncio import create_async_engine

    from app import db as db_module
    from app.core.config import settings
    from app.main import create_app

    # Patch engine sang NullPool trước khi create_app (không có startup event)
    new_engine = create_async_engine(settings.database_url, poolclass=NullPool)
    db_module.session.engine = new_engine
    db_module.session.SessionLocal.kw["bind"] = new_engine

    return create_app()


@pytest.fixture(autouse=True)
async def _seed_demo_users(app):
    """Seed 3 user demo (admin/annotator/qa) idempotent vào DB.

    Sau fix auth (subject = str(user.id)), mock_login tra DB lấy id thật → test login
    cần user demo tồn tại. Idempotent: bỏ qua nếu đã có (không xóa ở teardown để dùng lại).
    """
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool

    from app.core.config import settings
    from app.core.security import hash_password
    from app.models.user import UserAccount

    demo = [
        ("admin@vsf.local", "Admin Demo", "admin-demo-2026"),
        ("annotator@vsf.local", "Annotator Demo", "annotator-demo-2026"),
        ("qa@vsf.local", "QA Demo", "qa-demo-2026"),
    ]
    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    maker = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with maker() as s:
        for email, name, pw in demo:
            exists = await s.execute(select(UserAccount.id).where(UserAccount.email == email))
            if exists.scalar_one_or_none() is None:
                s.add(UserAccount(
                    email=email, full_name=name,
                    password_hash=hash_password(pw), status="active",
                ))
        await s.commit()
    await engine.dispose()


@pytest.fixture
async def client(app):
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.fixture
async def db_session():
    """AsyncSession với DB thật — tạo engine mới mỗi test với NullPool.

    Mỗi test tự dọn data nó tạo.
    Cần postgres + migration head; chạy trong container.
    """
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.core.config import settings

    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    maker = async_sessionmaker(bind=engine, expire_on_commit=False)
    try:
        async with maker() as session:
            yield session
    finally:
        await engine.dispose()
