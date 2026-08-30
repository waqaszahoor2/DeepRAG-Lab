"""
DeepRAG Lab — Application Configuration.

Centralised settings management using Pydantic Settings.
All values are loaded from environment variables / .env file.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings
from pydantic import Field, model_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── General ──────────────────────────────────────────────────────────
    APP_NAME: str = "DeepRAG Lab"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    LOG_LEVEL: str = "INFO"

    # ── API / Server ─────────────────────────────────────────────────────
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    ALLOWED_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    # ── Security ─────────────────────────────────────────────────────────
    JWT_SECRET: str = "CHANGE_ME_IN_PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Rate Limiting ────────────────────────────────────────────────────
    RATE_LIMIT_REQUESTS: int = 60
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # ── LLM Providers ───────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"

    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "google/gemini-2.5-flash"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    ZAI_API_KEY: str = ""
    ZAI_MODEL: str = "glm-4-flash"
    ZAI_BASE_URL: str = "https://open.bigmodel.cn/api/paas/v4/"

    LLM_TIMEOUT_SECONDS: int = 30
    LLM_MAX_RETRIES: int = 3
    LLM_PRIMARY_PROVIDER: Literal["gemini", "openrouter"] = "gemini"

    # ── Vector Database ──────────────────────────────────────────────────
    VECTOR_DB_PROVIDER: Literal["chroma", "qdrant"] = "chroma"
    CHROMA_PERSIST_DIR: str = "./data/chroma_db"
    CHROMA_COLLECTION_NAME: str = "deeprag_documents"

    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION_NAME: str = "deeprag_documents"

    # ── Database (Users / History) ───────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/deeprag.db"

    # ── File Upload ──────────────────────────────────────────────────────
    UPLOAD_DIR: str = "./data/uploads"
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: list[str] = Field(
        default=[".pdf", ".docx", ".txt", ".csv", ".md"]
    )

    # ── Chunking ─────────────────────────────────────────────────────────
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    MAX_CHUNKS_PER_DOCUMENT: int = 5000

    # ── Retrieval ────────────────────────────────────────────────────────
    RETRIEVAL_TOP_K: int = 5
    RETRIEVAL_SCORE_THRESHOLD: float = 0.3

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        if not self.ALLOWED_ORIGINS:
            raise ValueError("ALLOWED_ORIGINS must contain at least one trusted origin")
        if self.ENVIRONMENT in {"staging", "production"}:
            if len(self.JWT_SECRET) < 32 or self.JWT_SECRET.startswith("CHANGE_ME"):
                raise ValueError("JWT_SECRET must be a strong, unique value outside development")
        return self

    @staticmethod
    def is_configured_secret(value: str) -> bool:
        """Return false for empty or documentation placeholder values."""
        normalized = value.strip().lower()
        return bool(normalized) and not normalized.startswith(("your_", "change_me", "replace_", "<"))


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    s = Settings()

    # Log environment startup readiness checklist
    from app.core.logging import get_logger
    logger = get_logger("app.config")

    keys_status = [
        ("Gemini", bool(s.GEMINI_API_KEY)),
        ("Z.AI", bool(s.ZAI_API_KEY)),
        ("OpenRouter", bool(s.OPENROUTER_API_KEY)),
    ]
    active_providers = [name for name, active in keys_status if active]

    if not active_providers:
        logger.warning("⚠️  NO LLM API KEYS CONFIGURED! Add GEMINI_API_KEY, ZAI_API_KEY, or OPENROUTER_API_KEY to backend/.env")
    else:
        logger.info("✅ Active LLM Providers: %s", ", ".join(active_providers))

    return s
