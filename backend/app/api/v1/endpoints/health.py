"""DeepRAG Lab — Enhanced Production Health Check Endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db_session

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
async def readiness(db: AsyncSession = Depends(get_db_session)):
    """Deep readiness probe — checks downstream dependencies and vector store."""
    settings = get_settings()
    checks: dict[str, Any] = {}

    # Check LLM key availability
    checks["gemini_key"] = "configured" if settings.GEMINI_API_KEY else "missing"
    checks["zai_key"] = "configured" if settings.ZAI_API_KEY else "missing"
    checks["openrouter_key"] = "configured" if settings.OPENROUTER_API_KEY else "missing"

    # Database connectivity test
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
        checks["database"] = "connected"
    except Exception as exc:
        checks["database"] = f"error: {exc}"

    # Vector store status & vector count
    vector_count = 0
    vector_ok = False
    try:
        from app.vectorstore.chroma_store import get_vector_store
        store = get_vector_store()
        vector_count = store.count()
        vector_ok = True
        checks["vector_db"] = {
            "provider": settings.VECTOR_DB_PROVIDER,
            "status": "connected",
            "vector_count": vector_count,
        }
    except Exception as exc:
        checks["vector_db"] = {
            "provider": settings.VECTOR_DB_PROVIDER,
            "status": f"error: {exc}",
            "vector_count": 0,
        }

    all_llms = [checks["gemini_key"], checks["zai_key"], checks["openrouter_key"]]
    has_llm = any(status == "configured" for status in all_llms)

    system_ready = db_ok and vector_ok and has_llm

    return {
        "status": "ready" if system_ready else "degraded",
        "llm_failover_chain": ["Gemini", "Z.AI", "OpenRouter"],
        "checks": checks,
    }
