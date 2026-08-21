"""
DeepRAG Lab — Abstract Vector Store Interface.

All vector store implementations (ChromaDB, Qdrant) implement this interface
so the rest of the application is storage-agnostic.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class SearchResult:
    """A single vector similarity search result."""
    chunk_id: str
    document_id: str
    text: str
    score: float
    page_number: int | None = None
    metadata: dict | None = None


class BaseVectorStore(ABC):
    """Abstract interface that all vector store backends must implement."""

    @abstractmethod
    def store(
        self,
        ids: list[str],
        embeddings: list[list[float]],
        texts: list[str],
        metadatas: list[dict],
    ) -> None:
        """Store embeddings with their associated text and metadata."""
        ...

    @abstractmethod
    def search(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        filter_metadata: dict | None = None,
    ) -> list[SearchResult]:
        """Return the top-k most similar results for a query embedding."""
        ...

    @abstractmethod
    def delete_document(self, document_id: str) -> int:
        """Delete all vectors belonging to a document.  Returns count deleted."""
        ...

    @abstractmethod
    def get_document_chunks(self, document_id: str) -> list[SearchResult]:
        """Retrieve all chunks for a specific document."""
        ...

    @abstractmethod
    def count(self) -> int:
        """Return the total number of vectors stored."""
        ...
