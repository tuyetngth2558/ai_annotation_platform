"""ARQ WorkerSettings — entrypoint cho worker container.

Chạy: arq app.jobs.worker.WorkerSettings
Đăng ký mọi task ARQ ở `functions`.
"""

from __future__ import annotations

from typing import Any

from arq import func

from app.core.logging import configure_logging, get_logger
from app.jobs.settings import get_redis_settings
from app.jobs.tasks.export import build_export
from app.jobs.tasks.import_bundle import process_bundle

logger = get_logger(__name__)


async def startup(ctx: dict[str, Any]) -> None:
    configure_logging()
    logger.info("ARQ worker khởi động.")


async def shutdown(ctx: dict[str, Any]) -> None:
    logger.info("ARQ worker dừng.")


class WorkerSettings:
    redis_settings = get_redis_settings()
    # process_bundle gọi LLM nhiều lần (claim extraction + pre-score/claim) — retry tối đa
    # 3 lần khi lỗi (timeout/HTTP/parse) và job_timeout dài hơn default (EC-LLM-004).
    functions = [
        func(process_bundle, max_tries=3, timeout=600),
        build_export,
    ]
    on_startup = startup
    on_shutdown = shutdown
