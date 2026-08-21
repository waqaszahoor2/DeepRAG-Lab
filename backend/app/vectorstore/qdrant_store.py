"""
DeepRAG Lab — Qdrant Vector Store.

Production-grade vector database implementation using Qdrant.
Implements the BaseVectorStore interface.

Requires a running Qdrant instance (docker or cloud).
Set QDRANT_URL and QDRANT_API_KEY in .env.
"""

from __future__ import annotations

from app.core.config import get_settings
from app.core.logging import get_logger
from app.vectorstore.base import BaseVectorStore, SearchResult

logger = get_logger(__name__)

_instance: "QdrantVectorStore | None" = None


class QdrantVectorStore(BaseVectorStore):
    """Qdrant-backed vector store for production deployments."""

    def __init__(self) -> None:
        from qdrant_client import QdrantClient
        from qdrant_client.models import Distance, VectorParams

        settings = get_settings()
        self._client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY or None,
        )
        self._collection_name = settings.QDRANT_COLLECTION_NAME

        # Create collection if it doesn't exist
        collections = [c.name for c in self._client.get_collections().collections]
        if self._collection_name not in collections:
            self._client.create_collection(
                collection_name=self._collection_name,
                vectors_config=VectorParams(size=768, distance=Distance.COSINE),
            )
            logger.info("Created Qdrant collection: %s", self._collection_name)
        else:
            logger.info("Using existing Qdrant collection: %s", self._collection_name)

    def store(
        self,
        ids: list[str],
        embeddings: list[list[float]],
        texts: list[str],
        metadatas: list[dict],
    ) -> None:
        from qdrant_client.models import PointStruct

        points = [
            PointStruct(
                id=chunk_id,
                vector=embedding,
                payload={**meta, "text": text},
            )
            for chunk_id, embedding, text, meta in zip(ids, embeddings, texts, metadatas)
        ]
        self._client.upsert(collection_name=self._collection_name, points=points)
        logger.info("Stored %d vectors in Qdrant", len(points))

    def search(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        filter_metadata: dict | None = None,
    ) -> list[SearchResult]:
        from qdrant_client.models import Filter, FieldCondition, MatchValue

        query_filter = None
        if filter_metadata:
            conditions = [
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in filter_metadata.items()
            ]
            query_filter = Filter(must=conditions)

        results = self._client.search(
            collection_name=self._collection_name,
            query_vector=query_embedding,
            limit=top_k,
            query_filter=query_filter,
        )

        return [
            SearchResult(
                chunk_id=str(hit.id),
                document_id=hit.payload.get("document_id", "") if hit.payload else "",
                text=hit.payload.get("text", "") if hit.payload else "",
                score=hit.score,
                page_number=hit.payload.get("page_number") if hit.payload else None,
                metadata=hit.payload,
            )
            for hit in results
        ]

    def delete_document(self, document_id: str) -> int:
        from qdrant_client.models import Filter, FieldCondition, MatchValue

        result = self._client.delete(
            collection_name=self._collection_name,
            points_selector=Filter(
                must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
            ),
        )
        logger.info("Deleted vectors for document %s from Qdrant", document_id)
        return 0  # Qdrant doesn't return count in delete

    def get_document_chunks(self, document_id: str) -> list[SearchResult]:
        from qdrant_client.models import Filter, FieldCondition, MatchValue

        results, _ = self._client.scroll(
            collection_name=self._collection_name,
            scroll_filter=Filter(
                must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
            ),
            limit=10000,
        )

        return [
            SearchResult(
                chunk_id=str(point.id),
                document_id=document_id,
                text=point.payload.get("text", "") if point.payload else "",
                score=1.0,
                page_number=point.payload.get("page_number") if point.payload else None,
                metadata=point.payload,
            )
            for point in results
        ]

    def count(self) -> int:
        info = self._client.get_collection(self._collection_name)
        return info.points_count or 0


def get_vector_store() -> QdrantVectorStore:
    """Return a singleton QdrantVectorStore instance."""
    global _instance
    if _instance is None:
        _instance = QdrantVectorStore()
    return _instance
