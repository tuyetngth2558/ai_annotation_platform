"""Factory chọn storage backend theo settings.STORAGE_BACKEND."""

from __future__ import annotations

from functools import lru_cache

from app.core.config import settings
from app.integrations.storage.base import FileStorage
from app.integrations.storage.local import LocalStorage
from app.integrations.storage.s3 import S3Storage


@lru_cache
def get_storage() -> FileStorage:
    if settings.storage_backend == "local":
        return LocalStorage()
    return S3Storage()


__all__ = ["FileStorage", "get_storage"]
