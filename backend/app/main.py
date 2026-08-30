"""
DeepRAG Lab — FastAPI Application Entry Point.

Production-grade setup with:
- CORS middleware
- Rate limiting middleware
- Request ID injection
- Global exception handlers
- Lifespan events for DB init/cleanup
- API v1 router mounting
"""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.exceptions import DeepRAGError
from app.core.logging import get_logger, request_id_ctx, setup_logging
from app.db.session import close_db, init_db
from app.security.rate_limiter import RateLimitMiddleware

logger = get_logger(__name__)


# ── Lifespan ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    setup_logging()
    settings = get_settings()
    logger.info(
        "Starting %s v%s [%s]",
        settings.APP_NAME,
        settings.APP_VERSION,
        settings.ENVIRONMENT,
    )
    await init_db()
    yield
    await close_db()
    logger.info("Shutdown complete.")


# ── Application ──────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Production AI RAG Platform — Ask questions, get answers from your documents.",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # ── Middleware (order matters: outermost first) ───────────────────

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Rate Limiting
    app.add_middleware(RateLimitMiddleware)

    # Request ID injection
    @app.middleware("http")
    async def inject_request_id(request: Request, call_next):
        rid = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        request_id_ctx.set(rid)
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response

    # ── Exception Handlers ───────────────────────────────────────────

    @app.exception_handler(DeepRAGError)
    async def deeprag_exception_handler(request: Request, exc: DeepRAGError):
        rid = request_id_ctx.get() or request.headers.get("X-Request-ID", "unknown")
        if exc.status_code >= 500 or "LLM" in exc.__class__.__name__:
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": f"The AI service is temporarily unavailable. Please try again shortly. (Request ID: {rid})",
                    "status_code": exc.status_code,
                    "request_id": rid,
                },
            )
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message, "status_code": exc.status_code, "request_id": rid},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception: %s", exc)
        rid = request_id_ctx.get() or request.headers.get("X-Request-ID", "unknown")
        return JSONResponse(
            status_code=500,
            content={
                "error": f"An internal server error occurred. Please try again shortly. (Request ID: {rid})",
                "status_code": 500,
                "request_id": rid,
            },
        )

    # ── Routes ───────────────────────────────────────────────────────

    # Root health check (kept for backward compatibility with original API)
    @app.get("/health", tags=["Health"])
    async def root_health():
        return {"status": "ok"}

    # Mount versioned API
    app.include_router(api_v1_router)

    return app


app = create_app()
