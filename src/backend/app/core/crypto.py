"""Mã hóa đối xứng (Fernet) cho secret at-rest.

Dùng để mã hóa LLM API key trước khi lưu DB (BR-1.2: encryption-at-rest,
UI chỉ hiển thị che dấu). Khóa lấy từ settings.secret_encryption_key.
"""

from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet

from app.core.config import settings


@lru_cache
def _fernet() -> Fernet:
    key = settings.secret_encryption_key
    if not key:
        # TODO(security): bắt buộc set khóa ở staging/prod. Dev có thể sinh tạm.
        raise RuntimeError(
            "SECRET_ENCRYPTION_KEY chưa được set. Sinh bằng: "
            'python -c "from cryptography.fernet import Fernet; '
            'print(Fernet.generate_key().decode())"'
        )
    return Fernet(key.encode())


def encrypt_secret(plain: str) -> str:
    """Mã hóa chuỗi (vd API key) → ciphertext lưu DB."""
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_secret(token: str) -> str:
    """Giải mã ciphertext từ DB → plain (chỉ dùng nội bộ khi gọi LLM)."""
    return _fernet().decrypt(token.encode()).decode()


def mask_secret(plain: str, visible: int = 0) -> str:
    """Trả chuỗi che dấu để hiển thị UI (BR-1.2)."""
    if not plain:
        return ""
    return "••••••••"
