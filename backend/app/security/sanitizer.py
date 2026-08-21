"""
DeepRAG Lab — Input Sanitizer & Prompt-Injection Guard.

Protects against:
- HTML / script injection
- Prompt injection attempts
- Excessively long inputs
"""

from __future__ import annotations

import re

from app.core.exceptions import InputSanitizationError
from app.core.logging import get_logger

logger = get_logger(__name__)

# Maximum allowed query length (characters)
MAX_QUERY_LENGTH = 4000

# Patterns that strongly indicate prompt-injection attempts
_INJECTION_PATTERNS: list[re.Pattern] = [
    re.compile(r"ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)", re.I),
    re.compile(r"disregard\s+(all\s+)?(previous|above|prior)", re.I),
    re.compile(r"you\s+are\s+now\s+(a|an|the)\s+", re.I),
    re.compile(r"system\s*:\s*", re.I),
    re.compile(r"<\s*script", re.I),
    re.compile(r"\{\{.*\}\}"),  # Template injection
    re.compile(r"act\s+as\s+(a|an|if\s+you)", re.I),
    re.compile(r"forget\s+(everything|all|your)", re.I),
    re.compile(r"new\s+instructions?\s*:", re.I),
    re.compile(r"override\s+(your|the|all)", re.I),
]


def _strip_html(text: str) -> str:
    """Remove HTML tags from input."""
    return re.sub(r"<[^>]+>", "", text)


def _detect_injection(text: str) -> bool:
    """Return True if the text matches known prompt-injection patterns."""
    return any(pat.search(text) for pat in _INJECTION_PATTERNS)


def sanitize_query(query: str) -> str:
    """Sanitize a user query.  Returns cleaned text or raises on violation.

    Steps:
      1. Strip leading / trailing whitespace
      2. Reject empty queries
      3. Enforce length limit
      4. Remove HTML tags
      5. Detect prompt-injection patterns
    """
    query = query.strip()

    if not query:
        raise InputSanitizationError("Query cannot be empty.")

    if len(query) > MAX_QUERY_LENGTH:
        raise InputSanitizationError(
            f"Query exceeds maximum length of {MAX_QUERY_LENGTH} characters."
        )

    query = _strip_html(query)

    if _detect_injection(query):
        logger.warning("Prompt injection attempt detected: %.100s...", query)
        raise InputSanitizationError(
            "Your input was rejected because it resembles a prompt-injection attempt."
        )

    return query
