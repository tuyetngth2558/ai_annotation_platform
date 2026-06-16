"""Cấu hình logging tập trung.

- Dev: format console dễ đọc.
- Staging/prod: format JSON (1 dòng/log) → dễ đẩy vào log aggregator (Loki/ELK...).
- Mỗi log tự kèm `request_id` (set bởi middleware qua contextvar) để trace 1 request.

Tham chiếu: AC mục 10 (log không ảnh hưởng tốc độ API).

⚠️ KHÔNG log secret/PII (JWT, password, API key). Xem
docs/onboarding/logging-and-observability.md.
"""

from __future__ import annotations

import json
import logging
from contextvars import ContextVar
from datetime import UTC, datetime

from app.core.config import settings

# Set bởi middleware (core/middleware.py) cho mỗi request; default "-" ngoài request.
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    """Gắn request_id (từ contextvar) vào mỗi log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


class JsonFormatter(logging.Formatter):
    """Format log thành 1 dòng JSON (staging/prod)."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "request_id": getattr(record, "request_id", "-"),
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    handler = logging.StreamHandler()
    handler.addFilter(RequestIdFilter())

    if settings.log_format == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s | %(levelname)-7s | %(name)s | [%(request_id)s] %(message)s"
            )
        )

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
