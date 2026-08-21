"""
DeepRAG Lab — Custom Exception Hierarchy.

Provides structured error types so FastAPI handlers can return consistent,
informative error responses without leaking internals.
"""

from __future__ import annotations


class DeepRAGError(Exception):
    """Base exception for all DeepRAG application errors."""

    def __init__(self, message: str = "An internal error occurred.", status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


# ── Authentication / Authorization ───────────────────────────────────────

class AuthenticationError(DeepRAGError):
    """Raised when authentication fails (bad credentials, expired token)."""

    def __init__(self, message: str = "Authentication failed."):
        super().__init__(message=message, status_code=401)


class AuthorizationError(DeepRAGError):
    """Raised when a user lacks permission for a resource."""

    def __init__(self, message: str = "Insufficient permissions."):
        super().__init__(message=message, status_code=403)


# ── File Processing ──────────────────────────────────────────────────────

class FileValidationError(DeepRAGError):
    """Raised when an uploaded file fails validation."""

    def __init__(self, message: str = "File validation failed."):
        super().__init__(message=message, status_code=400)


class DocumentProcessingError(DeepRAGError):
    """Raised when document ingestion or extraction fails."""

    def __init__(self, message: str = "Document processing failed."):
        super().__init__(message=message, status_code=500)


# ── LLM / RAG ───────────────────────────────────────────────────────────

class LLMProviderError(DeepRAGError):
    """Raised when all LLM providers fail."""

    def __init__(self, message: str = "LLM provider error."):
        super().__init__(message=message, status_code=502)


class RAGPipelineError(DeepRAGError):
    """Raised when the RAG retrieval pipeline fails."""

    def __init__(self, message: str = "RAG pipeline error."):
        super().__init__(message=message, status_code=500)


# ── Rate Limiting ────────────────────────────────────────────────────────

class RateLimitError(DeepRAGError):
    """Raised when a client exceeds the request rate limit."""

    def __init__(self, message: str = "Rate limit exceeded. Please try again later."):
        super().__init__(message=message, status_code=429)


# ── Validation ───────────────────────────────────────────────────────────

class InputSanitizationError(DeepRAGError):
    """Raised when input contains potentially malicious content."""

    def __init__(self, message: str = "Input rejected due to policy violation."):
        super().__init__(message=message, status_code=400)
