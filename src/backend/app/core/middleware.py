"""Middleware + exception handlers cho app.

Đăng ký trong app.main qua `register_middleware(app)`:
- gắn request id (trace log + audit client_ip — AC mục 10)
- map AppError -> ErrorResponse (shape nhất quán cho FE)

Dùng Starlette pure-ASGI middleware thay vì @app.middleware("http") /
BaseHTTPMiddleware để tránh RuntimeError với httpx >= 0.20 trong test.
"""

from __future__ import annotations

import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.exceptions import AppError
from app.core.logging import get_logger, request_id_ctx

logger = get_logger(__name__)


class RequestIdMiddleware:
    """Pure-ASGI middleware: inject x-request-id vào mọi request."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        request_id = headers.get(b"x-request-id", b"").decode() or str(uuid.uuid4())

        # Đưa vào scope state để sống suốt request (handler 500 đọc được kể cả sau khi
        # contextvar đã reset ở finally) — request.state.request_id.
        scope.setdefault("state", {})["request_id"] = request_id

        # Đưa vào contextvar để mọi log trong request tự kèm request_id.
        token = request_id_ctx.set(request_id)

        async def send_with_header(message):
            if message["type"] == "http.response.start":
                raw_headers = list(message.get("headers", []))
                raw_headers.append((b"x-request-id", request_id.encode()))
                message = {**message, "headers": raw_headers}
            await send(message)

        try:
            await self.app(scope, receive, send_with_header)
        finally:
            request_id_ctx.reset(token)


def register_middleware(app: FastAPI) -> None:
    # Pure-ASGI — không wrap qua BaseHTTPMiddleware nên không gây RuntimeError
    # với httpx ASGITransport trong test (known issue starlette/httpx).
    app.add_middleware(RequestIdMiddleware)

    def _request_id(request: Request) -> str | None:
        # Ưu tiên scope state (sống suốt request) → fallback contextvar.
        rid = getattr(request.state, "request_id", None)
        return rid or request_id_ctx.get(None)

    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "request_id": _request_id(request),
                }
            },
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception):
        # Lỗi không lường trước → 500 với shape ErrorResponse nhất quán, KHÔNG lộ stacktrace
        # cho client (log đầy đủ phía server kèm request_id). FE luôn parse được error.code.
        req_id = _request_id(request)
        logger.exception("Lỗi không xử lý được (request_id=%s): %s", req_id, exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "internal_error",
                    "message": "Đã xảy ra lỗi nội bộ. Vui lòng thử lại hoặc liên hệ quản trị.",
                    "request_id": req_id,
                }
            },
        )
