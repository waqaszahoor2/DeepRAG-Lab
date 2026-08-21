"""
DeepRAG Lab — Embedding Generator.

Generates vector embeddings using Google's Gemini text-embedding-004 model.
Supports batch embedding with retry and exponential backoff.
"""

from __future__ import annotations

import asyncio
import time

from google import genai

from app.core.config import get_settings
from app.core.exceptions import LLMProviderError
from app.core.logging import get_logger

logger = get_logger(__name__)

_client = None


def _get_client() -> genai.Client:
    """Lazy singleton Gemini client."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.GEMINI_API_KEY:
            raise LLMProviderError("GEMINI_API_KEY is not configured.")
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


async def generate_embedding(text: str) -> list[float]:
    """Generate an embedding vector for a single text string."""
    settings = get_settings()
    client = _get_client()

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
                raise LLMProviderError(f"Embedding generation failed after {settings.LLM_MAX_RETRIES} attempts: {exc}")

    raise LLMProviderError("Embedding generation failed.")


async def generate_embeddings_batch(texts: list[str], batch_size: int = 20) -> list[list[float]]:
    """Generate embeddings for a batch of texts.

    Processes in sub-batches to respect API rate limits.
    """
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        logger.debug("Embedding batch %d–%d of %d", i + 1, i + len(batch), len(texts))

        batch_embeddings = []
        for text in batch:
            embedding = await generate_embedding(text)
            batch_embeddings.append(embedding)

        all_embeddings.extend(batch_embeddings)

        # Small delay between batches to avoid rate limits
        if i + batch_size < len(texts):
            await asyncio.sleep(0.5)

    logger.info("Generated %d embeddings", len(all_embeddings))
    return all_embeddings
