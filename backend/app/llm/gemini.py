"""
DeepRAG Lab — Gemini LLM Provider.

Primary AI provider using Google's Gemini API.
Features: singleton client, retry with backoff, timeout handling.
"""

from __future__ import annotations

import asyncio

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.core.exceptions import LLMProviderError
from app.core.logging import get_logger
from app.llm.base import BaseLLMProvider

logger = get_logger(__name__)

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """Return a singleton Gemini client."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.GEMINI_API_KEY:
            raise LLMProviderError("GEMINI_API_KEY is not configured.")
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


class GeminiProvider(BaseLLMProvider):
    """Google Gemini API provider."""

    @property
    def name(self) -> str:
        return "Gemini"

    async def generate(self, prompt: str, system_instruction: str = "") -> str:
        settings = get_settings()
        client = _get_client()

        config = types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=4096,
        )
        if system_instruction:
            config.system_instruction = system_instruction

        last_error: Exception | None = None

        for attempt in range(settings.LLM_MAX_RETRIES):
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.models.generate_content,
                        model=settings.GEMINI_MODEL,
                        contents=prompt,
                        config=config,
                    ),
                    timeout=settings.LLM_TIMEOUT_SECONDS,
                )
                if response and response.text:
                    return response.text
                raise LLMProviderError("Gemini returned empty response.")

            except asyncio.TimeoutError:
                last_error = TimeoutError(f"Gemini timed out after {settings.LLM_TIMEOUT_SECONDS}s")
                logger.warning("Gemini timeout (attempt %d/%d)", attempt + 1, settings.LLM_MAX_RETRIES)
            except LLMProviderError:
                raise
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Gemini error (attempt %d/%d): %s",
                    attempt + 1, settings.LLM_MAX_RETRIES, exc,
                )

            if attempt < settings.LLM_MAX_RETRIES - 1:
                wait = 2 ** attempt
                await asyncio.sleep(wait)

        raise LLMProviderError(f"Gemini failed after {settings.LLM_MAX_RETRIES} attempts: {last_error}")

    async def is_available(self) -> bool:
        settings = get_settings()
        return bool(settings.GEMINI_API_KEY)
