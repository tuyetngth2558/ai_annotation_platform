"""FileStorage — interface trừu tượng cho object storage.

Tách interface để KHÔNG lock-in: dev dùng Local/MinIO, staging dùng MinIO tự host
hoặc Supabase Storage (cùng giao thức S3). Đổi backend = đổi .env, không sửa code.
Lưu PDF gốc (DR-004) + export CSV.
"""

from __future__ import annotations

import posixpath
from abc import ABC, abstractmethod


class InvalidStorageKey(ValueError):
    """Key không hợp lệ (path traversal, tuyệt đối, rỗng)."""


def validate_storage_key(key: str) -> str:
    """Chuẩn hóa + kiểm tra key an toàn (chống path traversal).

    Trả về key đã normalize. Raise InvalidStorageKey nếu:
    - rỗng / chỉ có '/'
    - tuyệt đối (bắt đầu '/')
    - chứa '..' (thoát khỏi root)
    - chứa backslash hoặc null byte

    Dùng cho MỌI backend (local + s3) trước khi đụng tới storage.
    """
    if not key or not key.strip():
        raise InvalidStorageKey("Storage key rỗng.")
    if "\\" in key or "\x00" in key:
        raise InvalidStorageKey("Storage key chứa ký tự không hợp lệ.")
    if key.startswith("/"):
        raise InvalidStorageKey("Storage key phải là đường dẫn tương đối.")

    # Normalize theo POSIX, rồi chặn thoát ra ngoài bằng '..'.
    normalized = posixpath.normpath(key)
    if normalized == "." or normalized.startswith("..") or "/../" in f"/{normalized}/":
        raise InvalidStorageKey(f"Storage key không hợp lệ (path traversal): {key!r}")
    return normalized


class FileStorage(ABC):
    """Hợp đồng tối thiểu cho storage backend."""

    @abstractmethod
    async def put(self, key: str, data: bytes, content_type: str | None = None) -> str:
        """Lưu object, trả về storage_path/key."""

    @abstractmethod
    async def get(self, key: str) -> bytes:
        """Đọc object theo key."""

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Xóa object."""

    @abstractmethod
    async def presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """URL tạm để client tải trực tiếp (vd xem PDF)."""
