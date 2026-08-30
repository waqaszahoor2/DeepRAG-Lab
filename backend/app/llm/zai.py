"""
DeepRAG Lab — Z.AI (GLM) LLM Provider.

Secondary failover AI provider using the Z.AI API (OpenAI-compatible).
Activated when Gemini fails, before falling back to OpenRouter.
"""

from __future__ import annotations

import asyncio
from typing import AsyncIterator

from openai import AsyncOpenAI

from app.core.config import get_settings
from app.core.exceptions import LLMProviderError
from app.core.logging import get_logger
from app.llm.base import BaseLLMProvider

logger = get_logger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    """Return a singleton AsyncOpenAI client pointed at Z.AI."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.ZAI_API_KEY:
            raise LLMProviderError("ZAI_API_KEY is not configured.")
        _client = AsyncOpenAI(
            api_key=settings.ZAI_API_KEY,
            base_url=settings.ZAI_BASE_URL,
        )
    return _client


class ZAIProvider(BaseLLMProvider):
    """Z.AI (GLM) API provider (OpenAI-compatible)."""

    @property
    def name(self) -> str:
        return "Z.AI"

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
                        model=settings.ZAI_MODEL,
                        messages=messages,
                        temperature=0.2,
                        max_tokens=4096,
                    ),
                    timeout=settings.LLM_TIMEOUT_SECONDS,
                )

                if response.choices and response.choices[0].message.content:
                    return response.choices[0].message.content

                raise LLMProviderError("Z.AI returned empty response.")

            except asyncio.TimeoutError:
                last_error = TimeoutError(f"Z.AI timed out after {settings.LLM_TIMEOUT_SECONDS}s")
                logger.warning("Z.AI timeout (attempt %d/%d)", attempt + 1, settings.LLM_MAX_RETRIES)
            except LLMProviderError:
                raise
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Z.AI error (attempt %d/%d): %s",
                    attempt + 1, settings.LLM_MAX_RETRIES, exc,
                )

            if attempt < settings.LLM_MAX_RETRIES - 1:
                wait = 2 ** attempt
                await asyncio.sleep(wait)

        raise LLMProviderError(f"Z.AI failed after {settings.LLM_MAX_RETRIES} attempts: {last_error}")

    async def generate_stream(self, prompt: str, system_instruction: str = "") -> AsyncIterator[str]:
        """Stream tokens from Z.AI."""
        settings = get_settings()
        client = _get_client()

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        try:
            stream = await client.chat.completions.create(
                model=settings.ZAI_MODEL,
                messages=messages,
                temperature=0.2,
                max_tokens=4096,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as exc:
            logger.error("Z.AI streaming error: %s", exc)
            raise LLMProviderError(f"Z.AI streaming failed: {exc}") from exc

    async def is_available(self) -> bool:
        settings = get_settings()
        return settings.is_configured_secret(settings.ZAI_API_KEY)
