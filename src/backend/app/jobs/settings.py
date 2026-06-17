"""Cấu hình kết nối Redis cho ARQ (dùng chung giữa worker và enqueue-side)."""

from __future__ import annotations

import asyncio

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from app.core.config import settings


def get_redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(settings.redis_url)


# Pool ARQ cache theo process (enqueue-side) — tránh tạo pool mới mỗi request.
_arq_pool: ArqRedis | None = None
_pool_lock = asyncio.Lock()


async def get_arq_pool() -> ArqRedis:
    """Trả về ArqRedis pool dùng chung để enqueue job. Tạo lazy lần đầu.

    Double-checked locking với asyncio.Lock để tránh race condition khi nhiều
    request đồng thời vào đây cùng thấy _arq_pool is None → connection leak.
    """
    global _arq_pool
    if _arq_pool is not None:
        return _arq_pool
    async with _pool_lock:
        if _arq_pool is None:
            _arq_pool = await create_pool(get_redis_settings())
    return _arq_pool


async def close_arq_pool() -> None:
    """Đóng pool khi app shutdown (gọi từ FastAPI lifespan)."""
    global _arq_pool
    if _arq_pool is not None:
        await _arq_pool.close()
        _arq_pool = None
