"""
DeepRAG Lab — Abstract LLM Provider Interface.

All LLM providers (Gemini, OpenRouter) implement this interface
for clean provider switching and fallback logic.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


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

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if this provider is configured and reachable."""
        ...
