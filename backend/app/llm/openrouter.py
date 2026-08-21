"""
DeepRAG Lab — OpenRouter LLM Provider.

Fallback AI provider using the OpenRouter API (OpenAI-compatible).
Activated when Gemini is unavailable or fails.
"""

from __future__ import annotations

import asyncio

from openai import AsyncOpenAI

from app.core.config import get_settings
from app.core.exceptions import LLMProviderError
from app.core.logging import get_logger
from app.llm.base import BaseLLMProvider

logger = get_logger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    """Return a singleton AsyncOpenAI client pointed at OpenRouter."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.OPENROUTER_API_KEY:
            raise LLMProviderError("OPENROUTER_API_KEY is not configured.")
        _client = AsyncOpenAI(
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
        )
    return _client


class OpenRouterProvider(BaseLLMProvider):
    """OpenRouter API provider (OpenAI-compatible)."""

    @property
    def name(self) -> str:
        return "OpenRouter"

    async def generate(self, prompt: str, system_instruction: str = "") -> str:
        settings = get_settings()
        client = _get_client()

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        last_error: Exception | None = None

        for attempt in range(settings.LLM_MAX_RETRIES):
            try:
                response = await asyncio.wait_for(
                    client.chat.completions.create(
                        model=settings.OPENROUTER_MODEL,
                        messages=messages,
                        temperature=0.7,
                        max_tokens=4096,
                    ),
                    timeout=settings.LLM_TIMEOUT_SECONDS,
                )

                if response.choices and response.choices[0].message.content:
                    return response.choices[0].message.content

                raise LLMProviderError("OpenRouter returned empty response.")

            except asyncio.TimeoutError:
                last_error = TimeoutError(f"OpenRouter timed out after {settings.LLM_TIMEOUT_SECONDS}s")
                logger.warning("OpenRouter timeout (attempt %d/%d)", attempt + 1, settings.LLM_MAX_RETRIES)
            except LLMProviderError:
                raise
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "OpenRouter error (attempt %d/%d): %s",
                    attempt + 1, settings.LLM_MAX_RETRIES, exc,
                )

            if attempt < settings.LLM_MAX_RETRIES - 1:
                wait = 2 ** attempt
                await asyncio.sleep(wait)

        raise LLMProviderError(f"OpenRouter failed after {settings.LLM_MAX_RETRIES} attempts: {last_error}")

    async def is_available(self) -> bool:
        settings = get_settings()
        return bool(settings.OPENROUTER_API_KEY)
