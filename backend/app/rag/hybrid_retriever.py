"""
DeepRAG Lab — Hybrid Search (Dense Cosine + Sparse BM25 RRF Fusion).

Combines dense vector embedding search with term frequency (BM25) sparse retrieval
to maximize recall and precision across semantic and keyword queries.
"""

from __future__ import annotations

import math
import re
from collections import Counter

from app.core.logging import get_logger
from app.vectorstore.base import SearchResult

logger = get_logger(__name__)


def _tokenize(text: str) -> list[str]:
    """Simple alphanumeric tokenizer."""
    return re.findall(r"\w+", text.lower())


class SimpleBM25:
    """In-memory BM25 scorer for candidate chunk reranking."""

    def __init__(self, corpus: list[str], k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.corpus = corpus
        self.doc_tokens = [_tokenize(doc) for doc in corpus]
        self.doc_lens = [len(tokens) for tokens in self.doc_tokens]
        self.avg_doc_len = sum(self.doc_lens) / max(len(self.doc_lens), 1)
        self.doc_count = len(corpus)

        # Inverted index for Document Frequency (DF)
        self.df: dict[str, int] = Counter()
        for tokens in self.doc_tokens:
            for term in set(tokens):
                self.df[term] += 1

    def score(self, query: str, doc_idx: int) -> float:
        """Calculate BM25 relevance score for a document index."""
        query_tokens = _tokenize(query)
        doc_tokens = self.doc_tokens[doc_idx]
        doc_len = self.doc_lens[doc_idx]

        if doc_len == 0:
            return 0.0

        term_freqs = Counter(doc_tokens)
        score = 0.0

        for term in query_tokens:
            if term not in term_freqs:
                continue

            tf = term_freqs[term]
            df = self.df.get(term, 0)
            idf = math.log((self.doc_count - df + 0.5) / (df + 0.5) + 1.0)

            numerator = tf * (self.k1 + 1.0)
            denominator = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / max(self.avg_doc_len, 1.0)))
            score += idf * (numerator / denominator)

        return score


def rrf_fuse_results(
    dense_results: list[SearchResult],
    bm25_scores: list[float],
    dense_weight: float = 0.7,
    sparse_weight: float = 0.3,
) -> list[SearchResult]:
    """Fuse dense vector search results with BM25 scores using weighted normalization.

    Args:
        dense_results: List of SearchResult objects from vector store.
        bm25_scores: Parallel list of BM25 scores.
        dense_weight: Weight for dense score (default 0.7).
        sparse_weight: Weight for sparse BM25 score (default 0.3).

    Returns:
        Sorted list of SearchResult objects with updated hybrid score.
    """
    if not dense_results:
        return []

    # Normalize BM25 scores to [0, 1]
    max_bm25 = max(bm25_scores) if bm25_scores and max(bm25_scores) > 0 else 1.0
    norm_bm25 = [s / max_bm25 for s in bm25_scores]

    fused: list[SearchResult] = []
    for i, res in enumerate(dense_results):
        dense_score = res.score
        sparse_score = norm_bm25[i] if i < len(norm_bm25) else 0.0

        hybrid_score = round(dense_score * dense_weight + sparse_score * sparse_weight, 4)

        fused.append(
            SearchResult(
                chunk_id=res.chunk_id,
                document_id=res.document_id,
                text=res.text,
                score=hybrid_score,
                page_number=res.page_number,
                metadata={**res.metadata, "hybrid_score": hybrid_score, "dense_score": dense_score, "bm25_score": round(sparse_score, 4)},
            )
        )

    # Sort descending by hybrid score
    fused.sort(key=lambda r: r.score, reverse=True)
    return fused


def perform_hybrid_search(
    query: str,
    dense_results: list[SearchResult],
    dense_weight: float = 0.7,
    sparse_weight: float = 0.3,
) -> list[SearchResult]:
    """Perform hybrid search over a set of dense retrieval candidate results."""
    if not dense_results:
        return []

    corpus = [r.text for r in dense_results]
    bm25 = SimpleBM25(corpus)
    bm25_scores = [bm25.score(query, i) for i in range(len(corpus))]

    return rrf_fuse_results(
        dense_results=dense_results,
        bm25_scores=bm25_scores,
        dense_weight=dense_weight,
        sparse_weight=sparse_weight,
    )
