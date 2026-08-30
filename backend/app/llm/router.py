"""
DeepRAG Lab — LLM Provider Router.

Smart routing with automatic failover:
  Gemini (primary) → Z.AI (secondary) → OpenRouter (tertiary) → Error

Supports both standard and streaming generation.
"""

from __future__ import annotations

from typing import AsyncIterator

from app.core.config import get_settings
from app.core.exceptions import LLMProviderError
from app.core.logging import get_logger
from app.llm.base import BaseLLMProvider
from app.llm.gemini import GeminiProvider
from app.llm.openrouter import OpenRouterProvider
from app.llm.zai import ZAIProvider

logger = get_logger(__name__)

# Instantiate providers
_gemini = GeminiProvider()
_zai = ZAIProvider()
_openrouter = OpenRouterProvider()

# Provider reliability scores for confidence calculation
PROVIDER_RELIABILITY: dict[str, float] = {
    "Gemini": 1.0,
    "Z.AI": 0.95,
    "OpenRouter": 0.9,
}


def _get_provider_chain() -> list[BaseLLMProvider]:
    """Return the ordered provider chain based on configuration."""
    settings = get_settings()
    if settings.LLM_PRIMARY_PROVIDER == "openrouter":
        return [_openrouter, _zai, _gemini]
    return [_gemini, _zai, _openrouter]


async def generate_answer(
    prompt: str,
    system_instruction: str = "",
) -> tuple[str, str]:
    """Generate an LLM response with automatic provider failover.

    Tries the primary provider first, then falls back through the chain.

    Args:
        prompt: The user prompt or RAG-augmented prompt.
        system_instruction: Optional system instruction for the LLM.

    Returns:
        Tuple of (generated text, provider name).

    Raises:
        LLMProviderError: If all providers fail.
    """
    chain = _get_provider_chain()
    errors: list[str] = []

    for provider in chain:
        if not await provider.is_available():
            logger.debug("Provider %s not available, skipping", provider.name)
            continue

        try:
            logger.info("Routing to %s", provider.name)
            response = await provider.generate(prompt, system_instruction)
            return response, provider.name
        except LLMProviderError as exc:
            errors.append(f"{provider.name}: {exc.message}")
            logger.warning("Provider %s failed: %s", provider.name, exc.message)
            continue
        except Exception as exc:
            errors.append(f"{provider.name}: {exc}")
            logger.warning("Provider %s unexpected error: %s", provider.name, exc)
            continue

    error_details = "; ".join(errors) if errors else "No providers configured."
    logger.error("All LLM providers failed: %s", error_details)
    raise LLMProviderError("The AI service is temporarily unavailable. Please try again shortly.")


async def generate_answer_stream(
    prompt: str,
    system_instruction: str = "",
) -> tuple[AsyncIterator[str], str]:
    """Stream an LLM response with automatic provider failover.

    Returns:
        Tuple of (async token iterator, provider name).

    Raises:
        LLMProviderError: If all providers fail.
    """
    chain = _get_provider_chain()
    errors: list[str] = []

    for provider in chain:
        if not await provider.is_available():
            logger.debug("Provider %s not available, skipping", provider.name)
            continue

        try:
            logger.info("Streaming from %s", provider.name)
            stream = provider.generate_stream(prompt, system_instruction)
            return stream, provider.name
        except LLMProviderError as exc:
            errors.append(f"{provider.name}: {exc.message}")
            logger.warning("Provider %s streaming failed: %s", provider.name, exc.message)
            continue
        except Exception as exc:
            errors.append(f"{provider.name}: {exc}")
            logger.warning("Provider %s unexpected streaming error: %s", provider.name, exc)
            continue

    error_details = "; ".join(errors) if errors else "No providers configured."
    logger.error("All LLM providers failed for streaming: %s", error_details)
    raise LLMProviderError("The AI service is temporarily unavailable. Please try again shortly.")

