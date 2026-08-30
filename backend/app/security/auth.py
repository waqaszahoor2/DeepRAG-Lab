"""
DeepRAG Lab — JWT Authentication & Password Hashing.

Provides:
- bcrypt password hashing
- JWT access & refresh token creation / verification
- FastAPI dependency for extracting the current user from a request
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import jwt
import bcrypt

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError
from app.core.logging import get_logger

logger = get_logger(__name__)

# ── Password Hashing ─────────────────────────────────────────────────────


def hash_password(plain: str) -> str:
    """Hash a plain-text password using bcrypt (max 72 bytes)."""
    pwd_bytes = plain.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against its bcrypt hash."""
    pwd_bytes = plain.encode("utf-8")[:72]
    return bcrypt.checkpw(pwd_bytes, hashed.encode("utf-8"))


# ── JWT Tokens ───────────────────────────────────────────────────────────

def create_access_token(user_id: str, email: str) -> str:
    """Create a short-lived JWT access token."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create a long-lived JWT refresh token."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT.  Raises AuthenticationError on failure."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired.")
    except jwt.InvalidTokenError as exc:
        logger.warning("Invalid JWT: %s", exc)
        raise AuthenticationError("Invalid authentication token.")


# ── FastAPI Dependencies ─────────────────────────────────────────────────

from fastapi import Header, Request


async def get_current_user_id(
    request: Request,
    authorization: str | None = Header(None, description="Bearer <token>"),
) -> str:
    """Extract and validate the user ID from the Authorization header.

    Usage in endpoints::

        @router.get("/me")
        async def me(user_id: str = Depends(get_current_user_id)):
            ...
    """
    header_val = authorization if isinstance(authorization, str) else request.headers.get("authorization")
    if not header_val or not header_val.startswith("Bearer "):
        raise AuthenticationError("Authorization header must start with 'Bearer '.")
    token = header_val.removeprefix("Bearer ").strip()
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise AuthenticationError("Invalid token type.")
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Token missing subject claim.")
    return user_id
