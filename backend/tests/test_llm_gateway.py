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
async def test_llm_router_failover_to_openrouter():
    with patch("app.llm.router._gemini.is_available", new_callable=AsyncMock) as mock_gem_avail, \
         patch("app.llm.router._gemini.generate", new_callable=AsyncMock) as mock_gem_gen, \
         patch("app.llm.router._zai.is_available", new_callable=AsyncMock) as mock_zai_avail, \
         patch("app.llm.router._openrouter.is_available", new_callable=AsyncMock) as mock_or_avail, \
         patch("app.llm.router._openrouter.generate", new_callable=AsyncMock) as mock_or_gen:

        mock_gem_avail.return_value = True
        mock_gem_gen.side_effect = LLMProviderError("Gemini quota exceeded 429")

        mock_zai_avail.return_value = False

        mock_or_avail.return_value = True
        mock_or_gen.return_value = "OpenRouter backup response text"

        ans, provider = await generate_answer("Test failover prompt")
        assert ans == "OpenRouter backup response text"
        assert provider == "OpenRouter"
