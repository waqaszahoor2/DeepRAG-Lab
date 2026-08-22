"""Health check endpoints."""

from __future__ import annotations

# pyrefly: ignore [missing-import]
from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
async def health():
    """Basic liveness probe."""
    settings = get_settings()
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


@router.get("/ready")
async def readiness():
    """Readiness probe — checks downstream dependencies."""
    checks: dict[str, str] = {}

    # Check LLM key availability
    settings = get_settings()
    checks["gemini_key"] = "configured" if settings.GEMINI_API_KEY else "missing"
    checks["openrouter_key"] = "configured" if settings.OPENROUTER_API_KEY else "missing"
    checks["vector_db"] = settings.VECTOR_DB_PROVIDER

    all_ok = checks["gemini_key"] == "configured" or checks["openrouter_key"] == "configured"

    return {
        "status": "ready" if all_ok else "degraded",
        "checks": checks,
    }
