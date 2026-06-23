# Worker (ARQ) — cùng base với API, chỉ khác lệnh chạy.
# Context build: src/backend
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    # Đặt venv NGOÀI /app để volume mount không che mất.
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /app

# KHÔNG nuốt lỗi cài deps (không `|| true`).
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-install-project

COPY . .

ENV PATH="/opt/venv/bin:$PATH"

# Chạy ARQ worker — đọc WorkerSettings (redis pool + danh sách task)
CMD ["arq", "app.jobs.worker.WorkerSettings"]
