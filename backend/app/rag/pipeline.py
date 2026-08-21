"""
DeepRAG Lab — Full RAG Pipeline.

Orchestrates the retrieval-augmented generation flow:
  Query → Embed → Retrieve → Build Context → LLM → Parse → Response

Replaces the original stub that only built a string template.
"""

from __future__ import annotations

import re

from app.core.config import get_settings
from app.core.exceptions import RAGPipelineError
from app.core.logging import get_logger
from app.embeddings.generator import generate_embedding
from app.llm.router import generate_answer
from app.rag.prompt_templates import RAG_SYSTEM_INSTRUCTION, build_rag_prompt

logger = get_logger(__name__)


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
        # Remove the confidence tag from the displayed answer
        clean_answer = answer[: match.start()].rstrip()
        return clean_answer, confidence
    return answer, None


async def run_rag_pipeline(
    question: str,
    document_ids: list[str] | None = None,
) -> dict:
    """Execute the full RAG pipeline.

    Args:
        question: The user's question.
        document_ids: Optional filter — restrict search to specific documents.

    Returns:
        dict with keys: answer, confidence_score, sources
    """
    settings = get_settings()

    try:
        # ── Step 1: Embed the query ──────────────────────────────────
        logger.info("RAG: Embedding query...")
        query_embedding = await generate_embedding(question)

        # ── Step 2: Retrieve relevant chunks ─────────────────────────
        store = _get_vector_store()
        filter_meta = None
        if document_ids and len(document_ids) == 1:
            filter_meta = {"document_id": document_ids[0]}

        results = store.search(
            query_embedding=query_embedding,
            top_k=settings.RETRIEVAL_TOP_K,
            filter_metadata=filter_meta,
        )

        # Filter by score threshold
        results = [r for r in results if r.score >= settings.RETRIEVAL_SCORE_THRESHOLD]

        if not results:
            return {
                "answer": "I could not find any relevant information in your uploaded documents. "
                          "Please try rephrasing your question or upload more relevant documents.",
                "confidence_score": 0.0,
                "sources": [],
            }

        logger.info("RAG: Retrieved %d relevant chunks", len(results))

        # ── Step 3: Build context ────────────────────────────────────
        context_chunks = []
        for r in results:
            context_chunks.append({
                "text": r.text,
                "document_id": r.document_id,
                "document_name": r.metadata.get("document_name", r.document_id) if r.metadata else r.document_id,
                "page_number": r.page_number,
                "chunk_id": r.chunk_id,
                "score": r.score,
            })

        prompt = build_rag_prompt(question, context_chunks)

        # ── Step 4: Generate answer via LLM ──────────────────────────
        logger.info("RAG: Generating answer...")
        raw_answer = await generate_answer(
            prompt=prompt,
            system_instruction=RAG_SYSTEM_INSTRUCTION,
        )

        # ── Step 5: Parse response ───────────────────────────────────
        answer, confidence = _parse_confidence(raw_answer)

        # Build source citations
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

        logger.info("RAG: Answer generated (confidence=%.2f, sources=%d)", confidence or 0, len(sources))

        return {
            "answer": answer,
            "confidence_score": confidence,
            "sources": sources,
        }

    except RAGPipelineError:
        raise
    except Exception as exc:
        logger.exception("RAG pipeline failed: %s", exc)
        raise RAGPipelineError(f"RAG pipeline error: {exc}") from exc
