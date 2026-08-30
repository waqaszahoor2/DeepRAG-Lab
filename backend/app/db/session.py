"""
DeepRAG Lab — Database Session Management.

Provides async SQLAlchemy session factory and FastAPI dependency.
Uses SQLite for development; swap DATABASE_URL for PostgreSQL in production.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_engine = None
_session_factory = None


def _get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG,
            future=True,
        )
        logger.info("Database engine created: %s", settings.DATABASE_URL.split("@")[-1])
    return _engine


def _get_session_factory():
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=_get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


async def get_db_session() -> AsyncSession:  # type: ignore[misc]
    """FastAPI dependency that yields an async DB session.

    Usage::

        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db_session)):
            ...
    """
    factory = _get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create all tables.  Called once during application startup."""
    from pathlib import Path
    from app.db.models import Base  # noqa: E402 — avoid circular import

    settings = get_settings()
    if "sqlite" in settings.DATABASE_URL:
        db_path_str = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")
        db_path = Path(db_path_str)
        if db_path.parent:
            db_path.parent.mkdir(parents=True, exist_ok=True)

    engine = _get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialised.")


async def close_db() -> None:
    """Dispose of the engine connection pool.  Called during shutdown."""
    global _engine, _session_factory
    if _engine:
        await _engine.dispose()
        _engine = None
        _session_factory = None
        logger.info("Database engine disposed.")
