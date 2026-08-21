"""
DeepRAG Lab — In-Memory Token-Bucket Rate Limiter.

Provides per-IP rate limiting as FastAPI middleware.
Configurable via RATE_LIMIT_REQUESTS and RATE_LIMIT_WINDOW_SECONDS env vars.
"""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.config import get_settings
from app.core.exceptions import RateLimitError
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class _TokenBucket:
    """Simple token-bucket state for a single client."""

    tokens: float
    last_refill: float
    max_tokens: int = 60
    refill_window: float = 60.0

    def consume(self) -> bool:
        """Try to consume one token.  Returns True if allowed."""
        now = time.monotonic()
        elapsed = now - self.last_refill
        # Refill tokens proportionally
        self.tokens = min(
            self.max_tokens,
            self.tokens + (elapsed * self.max_tokens / self.refill_window),
        )
        self.last_refill = now

        if self.tokens >= 1.0:
            self.tokens -= 1.0
            return True
        return False


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP rate limiting middleware using an in-memory token bucket."""

    def __init__(self, app, max_requests: int | None = None, window_seconds: int | None = None):
        super().__init__(app)
        settings = get_settings()
        self.max_requests = max_requests or settings.RATE_LIMIT_REQUESTS
        self.window_seconds = window_seconds or settings.RATE_LIMIT_WINDOW_SECONDS
        self._buckets: dict[str, _TokenBucket] = defaultdict(
            lambda: _TokenBucket(
                tokens=float(self.max_requests),
                last_refill=time.monotonic(),
                max_tokens=self.max_requests,
                refill_window=float(self.window_seconds),
            )
        )

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip rate limiting for health checks
        if request.url.path.startswith("/health") or request.url.path.startswith("/api/v1/health"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        bucket = self._buckets[client_ip]

        if not bucket.consume():
            logger.warning("Rate limit exceeded for %s", client_ip)
            raise RateLimitError()

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(int(bucket.tokens))
        return response
