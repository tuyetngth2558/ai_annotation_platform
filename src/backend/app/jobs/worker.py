"""ARQ WorkerSettings — entrypoint cho worker container.

Chạy: arq app.jobs.worker.WorkerSettings
Đăng ký mọi task ARQ ở `functions`.
"""

from __future__ import annotations

from typing import Any

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
    functions = [process_bundle, build_export]
    on_startup = startup
    on_shutdown = shutdown
    # TODO(jobs): max_tries, retry_delay cho task gọi LLM (EC-LLM-004); job_timeout dài.
