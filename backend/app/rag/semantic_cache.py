"""
DeepRAG Lab — Semantic Query Caching Engine.

Caches query embeddings and responses in-memory.
If an incoming query has cosine similarity >= 0.95 with a cached query,
returns the cached response immediately to save latency and API cost.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


def _cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Calculate cosine similarity between two float vectors."""
    if len(v1) != len(v2) or not v1:
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return dot / (norm1 * norm2)


import math


@dataclass
class CacheEntry:
    scope: str
    query: str
    embedding: list[float]
    response: dict[str, Any]
    timestamp: float
    hits: int = 0


class SemanticCache:
    """In-memory semantic cache with vector similarity lookup."""

    def __init__(self, similarity_threshold: float = 0.95, max_entries: int = 500, ttl_seconds: int = 86400):
        self.threshold = similarity_threshold
        self.max_entries = max_entries
        self.ttl_seconds = ttl_seconds
        self._entries: list[CacheEntry] = []

    def get(self, query_embedding: list[float], scope: str = "global") -> tuple[dict[str, Any] | None, float]:
        """Lookup cached response using vector similarity.

        Returns:
            Tuple of (response_dict, match_score) or (None, 0.0).
        """
        now = time.time()
        best_entry: CacheEntry | None = None
        best_sim = 0.0

        for entry in self._entries:
            if entry.scope != scope:
                continue
            if now - entry.timestamp > self.ttl_seconds:
                continue

            sim = _cosine_similarity(query_embedding, entry.embedding)
            if sim > best_sim:
                best_sim = sim
                best_entry = entry

        if best_entry and best_sim >= self.threshold:
            best_entry.hits += 1
            logger.info("Semantic Cache HIT! (sim=%.3f, hits=%d, query='%.40s')", best_sim, best_entry.hits, best_entry.query)
            return best_entry.response, round(best_sim, 4)

        return None, round(best_sim, 4)

    def set(self, query: str, query_embedding: list[float], response: dict[str, Any], scope: str = "global") -> None:
        """Store a new query response in the semantic cache."""
        if len(self._entries) >= self.max_entries:
            # Evict oldest entry
            self._entries.pop(0)

        entry = CacheEntry(
            scope=scope,
            query=query,
            embedding=query_embedding,
            response=response,
            timestamp=time.time(),
        )
        self._entries.append(entry)
        logger.debug("Cached query in SemanticCache: '%.40s'", query)

    def clear(self) -> None:
        """Clear cache."""
        self._entries.clear()

    def size(self) -> int:
        """Return cached entry count."""
        return len(self._entries)


_cache_instance = SemanticCache()


def get_semantic_cache() -> SemanticCache:
    """Return singleton SemanticCache instance."""
    return _cache_instance
