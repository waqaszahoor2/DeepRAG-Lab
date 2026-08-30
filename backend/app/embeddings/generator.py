"""
DeepRAG Lab — Embedding Generator.

Generates vector embeddings using Google's Gemini text-embedding-004 model.
Includes a deterministic fallback embedding generator for offline/dev testing
when no API key is provided.
"""

from __future__ import annotations

import asyncio
import hashlib
import math

from google import genai

from app.core.config import get_settings
from app.core.exceptions import LLMProviderError
from app.core.logging import get_logger

logger = get_logger(__name__)

_client = None


def _get_client() -> genai.Client | None:
    """Lazy singleton Gemini client."""
    global _client
    settings = get_settings()
    if not settings.is_configured_secret(settings.GEMINI_API_KEY):
        return None
    if _client is None:
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _generate_fallback_embedding(text: str, dim: int = 768) -> list[float]:
    """Generate a deterministic normalized pseudo-embedding vector for offline dev testing."""
    vector = []
    text_bytes = text.encode("utf-8")
    for i in range(dim):
        h = hashlib.sha256(text_bytes + str(i).encode()).digest()
        val = (int.from_bytes(h[:4], "big") / 4294967295.0) * 2.0 - 1.0
        vector.append(val)

    # Normalize vector to unit length for cosine similarity
    norm = math.sqrt(sum(x * x for x in vector))
    if norm > 0:
        vector = [x / norm for x in vector]

    return vector


async def generate_embedding(text: str) -> list[float]:
    """Generate an embedding vector for a single text string."""
    settings = get_settings()
    client = _get_client()

    if not client:
        logger.debug("No GEMINI_API_KEY set — using deterministic dev embedding generator.")
        return _generate_fallback_embedding(text)

    for attempt in range(settings.LLM_MAX_RETRIES):
        try:
            result = client.models.embed_content(
                model=settings.GEMINI_EMBEDDING_MODEL,
                contents=text,
            )
            return result.embeddings[0].values
        except Exception as exc:
            wait = 2 ** attempt
            logger.warning(
                "Embedding attempt %d/%d failed: %s. Retrying in %ds...",
                attempt + 1, settings.LLM_MAX_RETRIES, exc, wait,
            )
            if attempt < settings.LLM_MAX_RETRIES - 1:
                await asyncio.sleep(wait)
            else:
                logger.warning("Gemini embedding API failed — falling back to dev embedding.")
                return _generate_fallback_embedding(text)

    return _generate_fallback_embedding(text)


async def generate_embeddings_batch(texts: list[str], batch_size: int = 20) -> list[list[float]]:
    """Generate embeddings for a batch of texts."""
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        logger.debug("Embedding batch %d–%d of %d", i + 1, i + len(batch), len(texts))

        batch_embeddings = []
        for text in batch:
            embedding = await generate_embedding(text)
            batch_embeddings.append(embedding)

        all_embeddings.extend(batch_embeddings)

        if i + batch_size < len(texts):
            await asyncio.sleep(0.1)

    logger.info("Generated %d embeddings", len(all_embeddings))
    return all_embeddings
