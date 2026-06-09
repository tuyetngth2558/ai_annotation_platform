"""Schema dùng chung: error, pagination, health.

Chuẩn hóa shape response để FE (TypeScript) bám vào nhất quán. Mọi feature
tái dùng các type này thay vì tự chế.
"""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: str | None = None


class ErrorResponse(BaseModel):
    """Khớp với handler trong core/middleware.py."""

    error: ErrorDetail


class PageMeta(BaseModel):
    total: int
    limit: int
    offset: int


class Page(BaseModel, Generic[T]):
    """Bao kết quả list có phân trang."""

    items: list[T]
    meta: PageMeta


class HealthResponse(BaseModel):
    status: str = "ok"
    app: str
    env: str
    version: str = "0.1.0"
