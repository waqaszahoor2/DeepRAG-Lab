"""
DeepRAG Lab — LLM Provider Router.

Smart routing with automatic failover:
  Gemini (primary) → OpenRouter (fallback) → Error

Replaces the original minimal router that had no error handling or fallback.
"""

from __future__ import annotations

from app.core.config import get_settings
from app.core.exceptions import LLMProviderError
from app.core.logging import get_logger
from app.llm.base import BaseLLMProvider
from app.llm.gemini import GeminiProvider
from app.llm.openrouter import OpenRouterProvider

logger = get_logger(__name__)

# Instantiate providers
_gemini = GeminiProvider()
_openrouter = OpenRouterProvider()


def _get_provider_chain() -> list[BaseLLMProvider]:
    """Return the ordered provider chain based on configuration."""
    settings = get_settings()
    if settings.LLM_PRIMARY_PROVIDER == "openrouter":
        return [_openrouter, _gemini]
    return [_gemini, _openrouter]


async def generate_answer(
    prompt: str,
    system_instruction: str = "",
) -> str:
    """Generate an LLM response with automatic provider failover.

    Tries the primary provider first, then falls back to the secondary.

    Args:
        prompt: The user prompt or RAG-augmented prompt.
        system_instruction: Optional system instruction for the LLM.

    Returns:
        The generated text response.

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
            return response
        except LLMProviderError as exc:
            errors.append(f"{provider.name}: {exc.message}")
            logger.warning("Provider %s failed: %s", provider.name, exc.message)
            continue
        except Exception as exc:
            errors.append(f"{provider.name}: {exc}")
            logger.warning("Provider %s unexpected error: %s", provider.name, exc)
            continue

    error_details = "; ".join(errors) if errors else "No providers configured."
    raise LLMProviderError(f"All LLM providers failed. {error_details}")
