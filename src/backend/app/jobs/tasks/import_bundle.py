"""ARQ task: xử lý 1 PDF bundle (gọi import pipeline).

Enqueue từ API sau khi Confirm Import:
    await redis.enqueue_job("process_bundle", bundle_id)
"""

from __future__ import annotations

import uuid
from typing import Any

from app.core.logging import get_logger
from app.jobs.pipelines.import_pipeline import run_import_pipeline

logger = get_logger(__name__)


async def process_bundle(ctx: dict[str, Any], bundle_id: str) -> None:
    """ARQ task entrypoint. `ctx` do ARQ inject (chứa redis, ...)."""
    logger.info("process_bundle nhận bundle_id=%s", bundle_id)
    await run_import_pipeline(uuid.UUID(bundle_id))
    # TODO(import_bundle): cập nhật trạng thái bundle/parent_task khi xong/lỗi;
    #   retry pre-scoring qua cấu hình job (max_tries) — EC-LLM-004.
