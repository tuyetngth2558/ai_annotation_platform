"""Test exception handler — AppError + lỗi 500 trả đúng shape ErrorResponse + request_id.

FE bám vào shape {"error": {"code", "message", "request_id"}}. Verify handler ở middleware.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.exceptions import AppError, NotFoundError
from app.main import create_app


@pytest.fixture
def app_with_probe():
    """App thật + route tạm raise lỗi để test handler (không đụng DB).

    Ép app_debug=False để mô phỏng production: Starlette KHÔNG render stacktrace mà
    nhường cho custom Exception handler (nếu debug=True, stacktrace lộ — chỉ dùng dev local).
    """
    app = create_app()

    @app.get("/_probe/app-error")
    async def _app_error():
        raise NotFoundError("không thấy resource X")

    @app.get("/_probe/custom-error")
    async def _custom_error():
        raise AppError("lỗi tùy biến", code="my_code", status_code=409)

    @app.get("/_probe/boom")
    async def _boom():
        raise RuntimeError("unexpected boom")

    # debug=False để Starlette ServerErrorMiddleware GỌI custom Exception handler thay vì
    # render stacktrace. Rebuild stack SAU khi thêm route (stack cache lazy lúc request đầu).
    app.debug = False
    app.middleware_stack = app.build_middleware_stack()
    return app


@pytest.fixture
async def client(app_with_probe):
    # raise_app_exceptions=False: để ASGITransport KHÔNG re-raise lỗi 500, mô phỏng
    # đúng hành vi production (client nhận response 500 từ exception handler).
    transport = ASGITransport(app=app_with_probe, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_app_error_maps_to_shape(client):
    res = await client.get("/_probe/app-error")
    assert res.status_code == 404
    body = res.json()
    assert body["error"]["code"] == "not_found"
    assert body["error"]["message"] == "không thấy resource X"
    # request_id điền từ contextvar (RequestIdMiddleware), không còn None.
    assert body["error"]["request_id"]


async def test_custom_status_and_code(client):
    res = await client.get("/_probe/custom-error")
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "my_code"


async def test_unexpected_error_returns_500_without_stacktrace(client):
    res = await client.get("/_probe/boom")
    assert res.status_code == 500
    body = res.json()
    assert body["error"]["code"] == "internal_error"
    # KHÔNG lộ chi tiết exception ra client.
    assert "boom" not in body["error"]["message"]
    assert body["error"]["request_id"]
