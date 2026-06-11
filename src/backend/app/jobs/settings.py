"""Cấu hình kết nối Redis cho ARQ (dùng chung giữa worker và enqueue-side)."""

from __future__ import annotations

from arq.connections import RedisSettings

from app.core.config import settings


def get_redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(settings.redis_url)
