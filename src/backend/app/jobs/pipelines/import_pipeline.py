"""Import pipeline — luồng xử lý nền sau khi Admin Confirm Import.

Các bước (Import schema §1 / Screen Spec state 'Background Processing'):
  parse PDF → normalize → extract source refs → claim extraction
  → source mapping → LLM pre-scoring

Mỗi bước để TODO; pipeline này được gọi bởi job `process_bundle` (jobs/tasks).
Đặc tính: I/O-bound (chờ LLM) → async; có retry cho bước LLM (EC-LLM-004).
"""

from __future__ import annotations

import uuid

from app.core.logging import get_logger

logger = get_logger(__name__)


async def run_import_pipeline(bundle_id: uuid.UUID) -> None:
    """Chạy toàn bộ pipeline cho 1 bundle. Idempotent theo bundle_id."""
    logger.info("Bắt đầu import pipeline cho bundle %s", bundle_id)

    # TODO(import_bundle): 1) parse PDF (pdfplumber) → raw + normalized (VR-PARSE-*)
    # TODO(import_bundle): 2) extract metadata (article_code/title/tier/confidence)
    # TODO(import_bundle): 3) extract source references (order/title/tier/url/text) (VR-SRC-*)
    # TODO(import_bundle): 4) claim extraction qua LLMProvider.extract_claims (VR-CE-*)
    # TODO(import_bundle): 5) source mapping bằng citation markers [n] (VR-MAP-*)
    # TODO(annotation):    6) pre-scoring 6 chiều qua LLMProvider.pre_score (VR-LLM-*)
    raise NotImplementedError("import pipeline chưa implement (scaffold).")
