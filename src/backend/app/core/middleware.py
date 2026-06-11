"""Middleware + exception handlers cho app.

Đăng ký trong app.main qua `register_middleware(app)`:
- gắn request id (trace log + audit client_ip — AC mục 10)
- map AppError -> ErrorResponse (shape nhất quán cho FE)
"""

from __future__ import annotations

import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.exceptions import AppError
from app.core.logging import request_id_ctx


def register_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def add_request_id(request: Request, call_next):
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        request.state.request_id = request_id
        # Đưa vào contextvar để mọi log trong request tự kèm request_id.
        token = request_id_ctx.set(request_id)
        # TODO(audit): lấy client_ip = request.client.host cho AUDIT_LOG (AC-10).
        try:
            response = await call_next(request)
        finally:
            request_id_ctx.reset(token)
        response.headers["x-request-id"] = request_id
        return response

    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "request_id": getattr(request.state, "request_id", None),
                }
            },
        )
