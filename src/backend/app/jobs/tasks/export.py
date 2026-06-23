"""ARQ task: tạo file CSV export claim-level (chạy nền nếu dữ liệu lớn).

Enqueue từ API Export. Chỉ export claim Approved (BR-9.1), trace về bundle/PDF (DRD-005).
"""

from __future__ import annotations

import uuid
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


async def build_export(ctx: dict[str, Any], batch_id: str) -> None:
    logger.info("build_export batch_id=%s", batch_id)
    _ = uuid.UUID(batch_id)
    # TODO(export): query approved claims → CSV (UTF-8, quoting) → lưu storage →
    #   ghi audit log export (BR-9.3). Schema cột: Import schema §10.
    raise NotImplementedError("export job chưa implement (scaffold).")
