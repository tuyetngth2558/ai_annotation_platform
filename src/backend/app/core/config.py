"""Cấu hình ứng dụng — đọc từ biến môi trường (.env).

Mọi setting tập trung ở đây qua Pydantic Settings. Không đọc os.environ rải rác
trong code; import `settings` từ module này.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- App / runtime ----
    app_env: Literal["development", "staging", "production"] = "development"
    app_debug: bool = True
    app_name: str = "VSF AI Annotation Platform"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173"

    # ---- Auth / security ----
    jwt_secret: str = "dev-only-change-me-please"
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_minutes: int = 30
    jwt_refresh_ttl_days: int = 7
    # Mock login (3 user demo). CHỈ true ở dev. Staging/prod phải false.
    auth_mock_enabled: bool = False
    # Khóa Fernet để mã hóa LLM API key at-rest (BR-1.2).
    secret_encryption_key: str = ""

    # ---- Database ----
    database_url: str = "postgresql+asyncpg://vsf:vsf@localhost:5432/vsf_annotation"
    database_url_sync: str = "postgresql+psycopg://vsf:vsf@localhost:5432/vsf_annotation"

    # ---- Redis ----
    redis_url: str = "redis://localhost:6379/0"

    # ---- Storage ----
    storage_backend: Literal["local", "s3"] = "s3"
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "vsf-pdf"
    s3_region: str = "us-east-1"
    local_storage_dir: str = "./var/storage"

    # ---- LLM provider (OQ-002 chưa chốt) ----
    llm_provider: str = ""
    llm_api_key: str = ""
    llm_model: str = ""
    llm_base_url: str = ""
    llm_prompt_version: str = "pre_score_v1"

    # ---- Logging ----
    log_level: str = "INFO"
    log_format: Literal["console", "json"] = "console"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Singleton settings (cache để không parse .env nhiều lần)."""
    return Settings()


settings = get_settings()
