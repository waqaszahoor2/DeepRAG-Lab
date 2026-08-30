"""
DeepRAG Lab — Abstract LLM Provider Interface.

All LLM providers (Gemini, Z.AI, OpenRouter) implement this interface
for clean provider switching and fallback logic.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator


class BaseLLMProvider(ABC):
    """Abstract LLM provider interface."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name."""
        ...

    @abstractmethod
    async def generate(self, prompt: str, system_instruction: str = "") -> str:
        """Generate a response from a prompt.

        Args:
            prompt: The user prompt / question.
            system_instruction: Optional system-level instruction.

        Returns:
            The generated text response.

        Raises:
            LLMProviderError on failure.
        """
        ...

    async def generate_stream(self, prompt: str, system_instruction: str = "") -> AsyncIterator[str]:
        """Stream tokens from the LLM.

        Default implementation falls back to non-streaming generate().
        Subclasses should override for true streaming.

        Yields:
            Individual text tokens/chunks.
        """
        # Fallback: generate full response and yield it as a single chunk
        result = await self.generate(prompt, system_instruction)
        yield result

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if this provider is configured and reachable."""
        ...
