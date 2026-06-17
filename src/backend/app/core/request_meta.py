"""Helper lấy metadata request (client IP) cho audit log (BR-10.2).

Truyền client_ip từ route xuống service tường minh (không dùng contextvar magic).
"""

from __future__ import annotations

from fastapi import Request


def get_client_ip(request: Request) -> str | None:
    """IP client gửi request. Ưu tiên X-Forwarded-For (sau reverse proxy), fallback peer.

    X-Forwarded-For có thể là 'client, proxy1, proxy2' → lấy IP đầu (client thật).
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    return request.client.host if request.client else None
