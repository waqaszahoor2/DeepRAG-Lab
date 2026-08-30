import pytest
from unittest.mock import AsyncMock, patch

from app.core.exceptions import LLMProviderError
from app.llm.router import generate_answer


@pytest.mark.asyncio
async def test_llm_router_primary_success():
    with patch("app.llm.router._gemini.is_available", new_callable=AsyncMock) as mock_avail, \
         patch("app.llm.router._gemini.generate", new_callable=AsyncMock) as mock_gen:
        mock_avail.return_value = True
        mock_gen.return_value = "Gemini response text"

        ans, provider = await generate_answer("Hello prompt")
        assert ans == "Gemini response text"
        assert provider == "Gemini"


@pytest.mark.asyncio
async def test_llm_router_gemini_failure_returns_safe_error():
    with patch("app.llm.router._gemini.is_available", new_callable=AsyncMock) as mock_gem_avail, \
         patch("app.llm.router._gemini.generate", new_callable=AsyncMock) as mock_gem_gen:

        mock_gem_avail.return_value = True
        mock_gem_gen.side_effect = LLMProviderError("Gemini quota exceeded 429")

        with pytest.raises(LLMProviderError) as exc_info:
            await generate_answer("Test prompt")

        assert "temporarily unavailable" in str(exc_info.value)
        assert "Gemini" not in str(exc_info.value)

