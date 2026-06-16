# VSF AI Annotation Platform — task runner (Unix/WSL/Git-bash).
# Windows thuần: dùng scripts\dev.ps1 (nội dung tương đương).
.DEFAULT_GOAL := help
.PHONY: help up down logs build seed migrate lint test test-be test-fe e2e fmt

help: ## Liệt kê các lệnh
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Khởi động toàn bộ stack (docker compose up -d)
	docker compose up -d

down: ## Dừng và xóa container
	docker compose down

logs: ## Xem log (vd: make logs s=api)
	docker compose logs -f $(s)

build: ## Build lại image
	docker compose build

seed: ## Seed 3 user mock (admin/annotator/qa)
	docker compose exec api python /scripts/seed_dev.py

migrate: ## Chạy Alembic migration mới nhất
	docker compose exec api alembic upgrade head

lint: ## Lint backend + frontend (fail nếu có lỗi)
	docker compose exec api ruff check .
	docker compose exec web npm run lint

test: test-be test-fe ## Chạy toàn bộ test

test-be: ## Test backend (pytest)
	docker compose exec api pytest

test-fe: ## Test frontend (vitest)
	docker compose exec web npm run test

e2e: ## Chạy Playwright smoke test
	docker compose exec web npm run e2e

fmt: ## Format code
	docker compose exec api ruff format .
	docker compose exec web npm run format
