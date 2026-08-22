"""
DeepRAG Lab — ChromaDB Vector Store.

Persistent local vector database for development and small-scale production.
Implements the BaseVectorStore interface.
"""

from __future__ import annotations

from pathlib import Path

# pyrefly: ignore [missing-import]
import chromadb

from app.core.config import get_settings
from app.core.logging import get_logger
from app.vectorstore.base import BaseVectorStore, SearchResult

logger = get_logger(__name__)

_instance: ChromaVectorStore | None = None


class ChromaVectorStore(BaseVectorStore):
    """ChromaDB-backed vector store with persistent storage."""

    def __init__(self) -> None:
        settings = get_settings()
        persist_dir = Path(settings.CHROMA_PERSIST_DIR)
        persist_dir.mkdir(parents=True, exist_ok=True)

        self._client = chromadb.PersistentClient(path=str(persist_dir))
        self._collection = self._client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(
            "ChromaDB initialised: %s (%d vectors)",
            settings.CHROMA_COLLECTION_NAME,
            self._collection.count(),
        )

    # ── Interface Implementation ─────────────────────────────────────

    def store(
        self,
        ids: list[str],
        embeddings: list[list[float]],
        texts: list[str],
        metadatas: list[dict],
    ) -> None:
        """Upsert embeddings into ChromaDB."""
        self._collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )
        logger.info("Stored %d vectors in ChromaDB", len(ids))

    def search(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        filter_metadata: dict | None = None,
    ) -> list[SearchResult]:
        """Cosine similarity search."""
        query_params: dict = {
            "query_embeddings": [query_embedding],
            "n_results": top_k,
            "include": ["documents", "metadatas", "distances"],
        }
        if filter_metadata:
            # ChromaDB uses $eq for exact match filtering
            where_clause = {k: {"$eq": v} for k, v in filter_metadata.items()}
            if len(where_clause) == 1:
                key = list(where_clause.keys())[0]
                query_params["where"] = {key: where_clause[key]}
            else:
                query_params["where"] = {"$and": [{k: v} for k, v in where_clause.items()]}

        results = self._collection.query(**query_params)

        search_results: list[SearchResult] = []
        if results and results["ids"] and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                meta = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 1.0
                # ChromaDB returns distance; convert to similarity score (cosine)
                score = max(0.0, 1.0 - distance)

                search_results.append(
                    SearchResult(
                        chunk_id=chunk_id,
                        document_id=meta.get("document_id", ""),
                        text=results["documents"][0][i] if results["documents"] else "",
                        score=score,
                        page_number=meta.get("page_number"),
                        metadata=meta,
                    )
                )

        return search_results

    def delete_document(self, document_id: str) -> int:
        """Delete all chunks for a document."""
        # Get all IDs matching the document
        existing = self._collection.get(
            where={"document_id": {"$eq": document_id}},
            include=[],
        )
        ids_to_delete = existing["ids"] if existing and existing["ids"] else []

        if ids_to_delete:
            self._collection.delete(ids=ids_to_delete)
            logger.info("Deleted %d vectors for document %s", len(ids_to_delete), document_id)

        return len(ids_to_delete)

    def get_document_chunks(self, document_id: str) -> list[SearchResult]:
        """Get all stored chunks for a document."""
        result = self._collection.get(
            where={"document_id": {"$eq": document_id}},
            include=["documents", "metadatas"],
        )

        chunks: list[SearchResult] = []
        if result and result["ids"]:
            for i, chunk_id in enumerate(result["ids"]):
                meta = result["metadatas"][i] if result["metadatas"] else {}
                chunks.append(
                    SearchResult(
                        chunk_id=chunk_id,
                        document_id=document_id,
                        text=result["documents"][i] if result["documents"] else "",
                        score=1.0,
                        page_number=meta.get("page_number"),
                        metadata=meta,
                    )
                )
        return chunks

    def count(self) -> int:
        """Return total vector count."""
        return self._collection.count()


def get_vector_store() -> ChromaVectorStore:
    """Return a singleton ChromaVectorStore instance."""
    global _instance
    if _instance is None:
        _instance = ChromaVectorStore()
    return _instance
