"""FastAPI app factory — entrypoint của API.

Chạy: uvicorn app.main:app --reload
- mount router /api/v1
- CORS cho frontend
- middleware (request id + error handler)
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.middleware import register_middleware
from app.jobs.settings import close_arq_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: chặn cấu hình nguy hiểm ở staging/production (debug/secret/mock/encryption).
    settings.assert_safe_for_env()
    yield
    # Đóng ARQ pool (enqueue-side) khi app dừng — tránh leak connection.
    await close_arq_pool()


def create_app() -> FastAPI:
    configure_logging()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        debug=settings.app_debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_middleware(app)
    app.include_router(api_router, prefix="/api/v1")

    # /health cũng expose ở root cho healthcheck đơn giản
    @app.get("/health", tags=["health"])
    async def root_health():
        return {"status": "ok", "app": settings.app_name, "env": settings.app_env}

    return app


app = create_app()
