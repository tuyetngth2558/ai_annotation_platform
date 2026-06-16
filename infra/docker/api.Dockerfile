# API (FastAPI) — dev image dùng uv để quản dependency.
# Context build: src/backend
FROM python:3.12-slim

# uv: package manager Python nhanh (https://docs.astral.sh/uv/)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    # Đặt venv NGOÀI /app để volume mount (./src/backend:/app) không che mất.
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /app

# Cài deps trước (tận dụng layer cache) — chỉ copy file khai báo deps.
# KHÔNG nuốt lỗi: nếu cài deps fail thì build phải fail (không `|| true`).
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-install-project

# Code mount qua volume khi dev; copy để image standalone vẫn chạy được
COPY . .

# venv ngoài /app → đưa vào PATH (uvicorn/arq resolve được dù volume mount)
ENV PATH="/opt/venv/bin:$PATH"

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
