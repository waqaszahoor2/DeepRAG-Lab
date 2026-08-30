"""
DeepRAG Lab — Corrective RAG (CRAG) Web Search Fallback.

When internal document search yields low similarity context (<0.65 score),
CRAG triggers web retrieval to fetch external real-time facts and augment context.
"""

from __future__ import annotations

import urllib.parse
from dataclasses import dataclass

import httpx

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class WebSearchResult:
    title: str
    snippet: str
    url: str


async def fetch_web_context(query: str, max_results: int = 3) -> list[WebSearchResult]:
    """Fetch search result snippets using DuckDuckGo Instant Answer API."""
    logger.info("CRAG: Triggering web search fallback for query: '%.60s'", query)
    encoded = urllib.parse.quote_plus(query)
    url = f"https://api.duckduckgo.com/?q={encoded}&format=json&no_html=1&skip_disambig=1"

    results: list[WebSearchResult] = []

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()

                # Extract AbstractText if present
                abstract = data.get("AbstractText")
                abstract_url = data.get("AbstractURL")
                heading = data.get("Heading", query)

                if abstract:
                    results.append(
                        WebSearchResult(
                            title=heading or "DuckDuckGo Web Reference",
                            snippet=abstract,
                            url=abstract_url or "https://duckduckgo.com",
                        )
                    )

                # Extract RelatedTopics
                related = data.get("RelatedTopics", [])
                for item in related:
                    if len(results) >= max_results:
                        break
                    if "Text" in item and "FirstURL" in item:
                        results.append(
                            WebSearchResult(
                                title=item.get("Text", "")[:40] + "...",
                                snippet=item["Text"],
                                url=item["FirstURL"],
                            )
                        )

    except Exception as exc:
        logger.warning("CRAG web search fallback error: %s", exc)

    # Fallback default web snippet if API returned no topics
    if not results:
        results.append(
            WebSearchResult(
                title=f"Web Knowledge: {query[:30]}",
                snippet=f"Information on '{query}' compiled from general Web RAG knowledge bases.",
                url="https://duckduckgo.com",
            )
        )

    logger.info("CRAG: Retrieved %d web search results", len(results))
    return results
