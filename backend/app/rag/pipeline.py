"""
DeepRAG Lab — Full Advanced RAG Pipeline.

Orchestrates the retrieval-augmented generation flow:
  Query → Semantic Cache → Embed → Hybrid Dense+Sparse Search → CRAG Check → Build Context → LLM → Parse → Response

Features:
  - Semantic query caching (≥0.95 similarity)
  - Hybrid RRF retrieval (Dense Cosine + Sparse BM25)
  - CRAG Web Search Fallback for low-confidence queries (<0.65 threshold)
  - Blended confidence scoring formula
  - Tri-provider failover (Gemini → Z.AI → OpenRouter)
"""

from __future__ import annotations

import re

from app.core.config import get_settings
from app.core.exceptions import RAGPipelineError
from app.core.logging import get_logger
from app.embeddings.generator import generate_embedding
from app.llm.router import generate_answer, PROVIDER_RELIABILITY
from app.rag.prompt_templates import RAG_SYSTEM_INSTRUCTION, build_rag_prompt
from app.rag.hybrid_retriever import perform_hybrid_search
from app.rag.crag_search import fetch_web_context
from app.rag.semantic_cache import get_semantic_cache

logger = get_logger(__name__)

INSUFFICIENT_CONTEXT_THRESHOLD = 0.65


def _get_vector_store():
    """Return the configured vector store."""
    settings = get_settings()
    if settings.VECTOR_DB_PROVIDER == "qdrant":
        from app.vectorstore.qdrant_store import get_vector_store
    else:
        from app.vectorstore.chroma_store import get_vector_store
    return get_vector_store()


def _parse_confidence(answer: str) -> tuple[str, float | None]:
    """Extract the [CONFIDENCE: X.X] score from the LLM response."""
    match = re.search(r"\[CONFIDENCE:\s*([0-9]*\.?[0-9]+)\]", answer)
    if match:
        confidence = min(1.0, max(0.0, float(match.group(1))))
        clean_answer = answer[: match.start()].rstrip()
        return clean_answer, confidence
    return answer, None


def _compute_confidence(
    avg_retrieval_score: float,
    citation_count: int,
    source_count: int,
    provider_name: str,
) -> float:
    """Compute a blended confidence score."""
    citation_coverage = min(1.0, citation_count / max(source_count, 1))
    provider_reliability = PROVIDER_RELIABILITY.get(provider_name, 0.85)

    score = (
        avg_retrieval_score * 0.4
        + citation_coverage * 0.3
        + provider_reliability * 0.3
    )
    return round(min(1.0, max(0.0, score)), 4)


def _count_citation_markers(answer: str) -> int:
    """Count [1], [2], etc. citation markers in the LLM response."""
    return len(set(re.findall(r"\[(\d+)\]", answer)))


async def run_rag_pipeline(
    question: str,
    document_ids: list[str] | None = None,
    is_demo: bool = False,
    user_id: str | None = None,
    allow_web_fallback: bool = True,
) -> dict:
    """Execute the advanced RAG pipeline."""
    settings = get_settings()
    cache = get_semantic_cache()

    try:
        # ── Step 1: Embed the query ──────────────────────────────────
        logger.info("RAG: Embedding query...")
        query_embedding = await generate_embedding(question)

        # ── Step 1.5: Semantic Cache Lookup ─────────────────────────
        cache_scope = "demo" if is_demo else f"user:{user_id or 'anonymous'}"
        cached_response, match_sim = cache.get(query_embedding, scope=cache_scope)
        if cached_response:
            logger.info("RAG: Returning semantic cache hit (similarity=%.3f)", match_sim)
            cached_response_copy = dict(cached_response)
            cached_response_copy["cached"] = True
            return cached_response_copy

        # ── Step 2: Dense Vector Search ──────────────────────────────
        store = _get_vector_store()
        filter_meta = None
        if is_demo:
            filter_meta = {"demo": "true"}
        else:
            filter_meta = {"user_id": user_id or ""}

        dense_results = store.search(
            query_embedding=query_embedding,
            top_k=settings.RETRIEVAL_TOP_K * 2,  # Over-fetch for BM25 reranking
            filter_metadata=filter_meta,
        )

        dense_results = [r for r in dense_results if r.score >= settings.RETRIEVAL_SCORE_THRESHOLD]
        if document_ids:
            requested_ids = set(document_ids)
            dense_results = [r for r in dense_results if r.document_id in requested_ids]

        # ── Step 2.5: Hybrid BM25 Reranking ──────────────────────────
        if dense_results:
            hybrid_results = perform_hybrid_search(
                query=question,
                dense_results=dense_results,
                dense_weight=0.7,
                sparse_weight=0.3,
            )[: settings.RETRIEVAL_TOP_K]
        else:
            hybrid_results = []

        if not hybrid_results and not allow_web_fallback:
            return {
                "answer": "Your selected documents do not contain enough evidence to answer this question.",
                "confidence_score": 0.0,
                "sources": [],
                "provider": None,
                "sufficient_context": False,
                "cached": False,
            }

        # ── Step 3: CRAG Web Fallback Check ──────────────────────────
        sufficient_context = True
        avg_score = 0.0

        if hybrid_results:
            avg_score = sum(r.score for r in hybrid_results) / len(hybrid_results)
            sufficient_context = avg_score >= INSUFFICIENT_CONTEXT_THRESHOLD

        web_sources = []
        if allow_web_fallback and (not hybrid_results or not sufficient_context):
            logger.info("RAG: Context score low (avg=%.3f). Triggering CRAG Web Search...", avg_score)
            web_results = await fetch_web_context(question)
            for w in web_results:
                web_sources.append({
                    "document_id": "web_ref",
                    "document_name": w.title,
                    "chunk_id": f"web_{hash(w.url) % 100000}",
                    "page_number": None,
                    "text_snippet": w.snippet,
                    "relevance_score": 0.75,
                })

        # ── Step 4: Build Context ────────────────────────────────────
        context_chunks = []
        for r in hybrid_results:
            context_chunks.append({
                "text": r.text,
                "document_id": r.document_id,
                "document_name": r.metadata.get("document_name", r.document_id) if r.metadata else r.document_id,
                "page_number": r.page_number,
                "chunk_id": r.chunk_id,
                "score": r.score,
            })

        # Merge CRAG web sources into context chunks if present
        for w in web_sources:
            context_chunks.append({
                "text": w["text_snippet"],
                "document_id": w["document_id"],
                "document_name": w["document_name"],
                "page_number": None,
                "chunk_id": w["chunk_id"],
                "score": w["relevance_score"],
            })

        prompt = build_rag_prompt(question, context_chunks)

        # ── Step 5: Generate answer via LLM ──────────────────────────
        logger.info("RAG: Generating answer...")
        raw_answer, provider_name = await generate_answer(
            prompt=prompt,
            system_instruction=RAG_SYSTEM_INSTRUCTION,
        )

        # ── Step 6: Parse Response & Compute Confidence ─────────────
        answer, llm_confidence = _parse_confidence(raw_answer)
        citation_count = _count_citation_markers(answer)

        confidence = _compute_confidence(
            avg_retrieval_score=max(avg_score, 0.7 if web_sources else 0.0),
            citation_count=citation_count,
            source_count=len(context_chunks),
            provider_name=provider_name,
        )

        if llm_confidence is not None:
            confidence = round((confidence + llm_confidence) / 2, 4)

        sources = [
            {
                "document_id": c["document_id"],
                "document_name": c["document_name"],
                "chunk_id": c["chunk_id"],
                "page_number": c["page_number"],
                "text_snippet": c["text"][:200] + "..." if len(c["text"]) > 200 else c["text"],
                "relevance_score": round(c["score"], 4),
            }
            for c in context_chunks
        ]

        final_response = {
            "answer": answer,
            "confidence_score": confidence,
            "sources": sources,
            "provider": provider_name,
            "sufficient_context": sufficient_context,
            "cached": False,
        }

        # Cache valid response in Semantic Cache
        if sufficient_context:
            cache.set(question, query_embedding, final_response, scope=cache_scope)

        return final_response

    except RAGPipelineError:
        raise
    except Exception as exc:
        logger.exception("Advanced RAG pipeline failed: %s", exc)
        raise RAGPipelineError(f"RAG pipeline error: {exc}") from exc
