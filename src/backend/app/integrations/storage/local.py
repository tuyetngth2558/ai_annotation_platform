"""LocalStorage — lưu file ra ổ đĩa local (dev nhanh, không cần MinIO).

Bật khi STORAGE_BACKEND=local. Dùng LOCAL_STORAGE_DIR.
"""

from __future__ import annotations

from pathlib import Path

from app.core.config import settings
from app.integrations.storage.base import (
    FileStorage,
    InvalidStorageKey,
    validate_storage_key,
)


class LocalStorage(FileStorage):
    def __init__(self, root: str | None = None):
        self.root = Path(root or settings.local_storage_dir).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        # Lớp 1: validate key (chống '..', tuyệt đối...).
        safe_key = validate_storage_key(key)
        path = (self.root / safe_key).resolve()
        # Lớp 2: defense-in-depth — đảm bảo path thật sự nằm trong root
        # (chặn cả symlink / edge case mà validate có thể bỏ sót).
        if not path.is_relative_to(self.root):
            raise InvalidStorageKey(f"Storage key thoát khỏi root: {key!r}")
        return path

    async def put(self, key: str, data: bytes, content_type: str | None = None) -> str:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    async def get(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    async def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)

    async def presigned_url(self, key: str, expires_in: int = 3600) -> str:
        # Local không có presign thật — trả path tương đối; FE dev tải qua API.
        # TODO(storage): expose endpoint /files/{key} để stream khi dùng local backend.
        safe_key = validate_storage_key(key)
        return f"/files/{safe_key}"
