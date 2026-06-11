"""Helper phân trang (limit/offset) dùng chung cho list endpoint.

My Tasks, QA Queue, Audit Log, Project List... đều cần phân trang nhất quán.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Query


@dataclass
class PageParams:
    """Tham số phân trang lấy từ query string."""

    limit: int
    offset: int


def page_params(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> PageParams:
    """Dependency: `Depends(page_params)` để inject limit/offset."""
    return PageParams(limit=limit, offset=offset)


# TODO(core): helper build Page[T] từ (items, total, page_params) — xem schemas/common.py
