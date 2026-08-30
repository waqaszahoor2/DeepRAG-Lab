"""API v1 router — aggregates all endpoint routers under /api/v1."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.chat import router as chat_router
from app.api.v1.endpoints.conversations import router as conversations_router
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.health import router as health_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(chat_router)
api_v1_router.include_router(conversations_router)
