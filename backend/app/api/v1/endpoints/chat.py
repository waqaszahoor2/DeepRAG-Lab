"""Chat endpoint — routes queries through the RAG pipeline or general AI."""

from __future__ import annotations

import json
import uuid
import time
from collections import defaultdict

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.chat import (
    ChatHistoryResponse,
    ChatHistoryItem,
    ChatRequest,
    ChatResponse,
    SourceCitation,
)
from app.core.logging import get_logger
from app.db.models import ChatHistory, Conversation, ConversationMessage
from app.db.session import get_db_session
from app.rag.pipeline import run_rag_pipeline
from app.rag.query_classifier import classify_query, QueryMode
from app.rag.prompt_templates import GENERAL_AI_SYSTEM_INSTRUCTION
from app.llm.router import generate_answer, generate_answer_stream
from app.security.auth import get_current_user_id
from app.security.sanitizer import sanitize_query

logger = get_logger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])

_demo_sessions: dict[str, list[float]] = defaultdict(list)
_DEMO_MAX_MESSAGES = 20
_DEMO_WINDOW_SECONDS = 3600


def _check_demo_limit(request: Request) -> None:
    session_id = request.headers.get("X-Demo-Session-ID", "anonymous")[:128]
    now = time.monotonic()
    recent = [stamp for stamp in _demo_sessions[session_id] if now - stamp < _DEMO_WINDOW_SECONDS]
    if len(recent) >= _DEMO_MAX_MESSAGES:
        from app.core.exceptions import RateLimitError
        raise RateLimitError("Demo message limit reached. Create an account to continue.")
    recent.append(now)
    _demo_sessions[session_id] = recent


# ── Helper: optional auth for demo mode ──────────────────────────────────

async def _get_user_id_or_demo(request: Request) -> str:
    """Return user_id from JWT if present, or 'demo_user' if demo mode."""
    # Check if the body indicates demo mode
    try:
        body = await request.json()
        if body.get("is_demo"):
            return "demo_user"
    except Exception:
        pass

    # Fall back to normal auth
    return await get_current_user_id(request)


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    """Process a user question — either via RAG or general AI.

    Supports demo mode (is_demo=true) which bypasses auth and restricts
    search to demo-tagged documents.
    """
    # Determine user identity (demo or authenticated)
    if body.is_demo:
        _check_demo_limit(request)
        user_id = "demo_user"
    else:
        user_id = await get_current_user_id(request)

    query_id = str(uuid.uuid4())
    question = sanitize_query(body.question)

    # Determine mode
    if body.mode == "auto":
        mode = classify_query(question)
    else:
        mode = QueryMode(body.mode)

    logger.info("Chat [%s] mode=%s demo=%s question=%.80s...", query_id, mode.value, body.is_demo, question)

    answer = ""
    confidence = None
    sources: list[SourceCitation] = []
    provider: str | None = None
    sufficient_context = True

    if mode == QueryMode.DOCUMENT_QA:
        # Run full RAG pipeline
        rag_result = await run_rag_pipeline(
            question=question,
            document_ids=body.document_ids,
            is_demo=body.is_demo,
            user_id=user_id,
            allow_web_fallback=body.mode != "document_qa",
        )
        answer = rag_result["answer"]
        confidence = rag_result.get("confidence_score")
        provider = rag_result.get("provider")
        sufficient_context = rag_result.get("sufficient_context", True)
        sources = [
            SourceCitation(**s) for s in rag_result.get("sources", [])
        ]
    else:
        # General AI — direct LLM call
        raw_answer, provider = await generate_answer(
            question,
            system_instruction=GENERAL_AI_SYSTEM_INSTRUCTION,
        )
        answer = raw_answer

    # Save to history & conversation (skip for demo users)
    if user_id != "demo_user":
        history_entry = ChatHistory(
            user_id=user_id,
            question=question,
            answer=answer,
            mode=mode.value,
            confidence_score=confidence,
            sources=json.dumps([s.model_dump() for s in sources]) if sources else None,
        )
        db.add(history_entry)

        if body.conversation_id:
            conv_res = await db.execute(
                select(Conversation).where(
                    Conversation.id == body.conversation_id,
                    Conversation.user_id == user_id,
                )
            )
            conv = conv_res.scalar_one_or_none()
            if conv:
                conv.updated_at = datetime.now(timezone.utc)
                db.add(ConversationMessage(
                    conversation_id=conv.id,
                    sender="user",
                    text=question,
                ))
                db.add(ConversationMessage(
                    conversation_id=conv.id,
                    sender="ai",
                    text=answer,
                    mode=mode.value,
                    confidence_score=confidence,
                    sources=json.dumps([s.model_dump() for s in sources]) if sources else None,
                    provider=provider,
                    sufficient_context=sufficient_context,
                ))
        await db.commit()

    return ChatResponse(
        answer=answer,
        mode=mode.value,
        route=mode.value,
        selected_document_ids=body.document_ids or [],
        confidence_score=confidence,
        sources=sources,
        query_id=query_id,
        provider=provider,
        sufficient_context=sufficient_context,
        conversation_id=body.conversation_id,
    )


# ── Streaming Endpoint ───────────────────────────────────────────────────

@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    """Stream a chat response via SSE (Server-Sent Events).

    Emits events:
      - event: token  data: {"text": "..."}
      - event: meta   data: {"provider": "...", "mode": "...", "route": "...", "confidence": ..., "sources": [...], "selected_document_ids": [...], "sufficient_context": ...}
      - event: done   data: {}
    """
    if body.is_demo:
        _check_demo_limit(request)
        user_id = "demo_user"
    else:
        user_id = await get_current_user_id(request)

    question = sanitize_query(body.question)

    # Determine mode
    if body.mode == "auto":
        mode = classify_query(question)
    else:
        mode = QueryMode(body.mode)

    async def event_generator():
        accumulated_tokens: list[str] = []
        final_provider: str | None = None
        final_sources: list[dict] = []
        final_confidence: float | None = None
        final_sufficient_context: bool = True

        try:
            if mode == QueryMode.DOCUMENT_QA:
                # For RAG: run the full pipeline (non-streaming retrieval + streaming generation)
                from app.embeddings.generator import generate_embedding
                from app.rag.pipeline import _get_vector_store, INSUFFICIENT_CONTEXT_THRESHOLD
                from app.rag.prompt_templates import RAG_SYSTEM_INSTRUCTION, build_rag_prompt
                from app.core.config import get_settings

                settings = get_settings()
                query_embedding = await generate_embedding(question)

                store = _get_vector_store()
                filter_meta = {"demo": "true"} if body.is_demo else {"user_id": user_id}

                results = store.search(
                    query_embedding=query_embedding,
                    top_k=settings.RETRIEVAL_TOP_K,
                    filter_metadata=filter_meta,
                )
                results = [r for r in results if r.score >= settings.RETRIEVAL_SCORE_THRESHOLD]
                if body.document_ids:
                    requested_ids = set(body.document_ids)
                    results = [r for r in results if r.document_id in requested_ids]

                if not results:
                    no_ev_text = "Your selected documents do not contain enough evidence to answer this question."
                    yield f'event: token\ndata: {json.dumps({"text": no_ev_text})}\n\n'
                    yield f'event: meta\ndata: {json.dumps({"provider": "none", "mode": mode.value, "route": mode.value, "confidence": 0.0, "sources": [], "selected_document_ids": body.document_ids or [], "sufficient_context": False, "conversation_id": body.conversation_id})}\n\n'
                    yield 'event: done\ndata: {}\n\n'
                    accumulated_tokens.append(no_ev_text)
                    final_provider = "none"
                    final_confidence = 0.0
                    final_sufficient_context = False
                else:
                    avg_score = sum(r.score for r in results) / len(results)
                    sufficient_context = avg_score >= INSUFFICIENT_CONTEXT_THRESHOLD
                    final_confidence = round(avg_score, 4)
                    final_sufficient_context = sufficient_context

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
                    stream, provider_name = await generate_answer_stream(prompt, RAG_SYSTEM_INSTRUCTION)
                    final_provider = provider_name

                    async for token in stream:
                        accumulated_tokens.append(token)
                        yield f'event: token\ndata: {json.dumps({"text": token})}\n\n'

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
                    final_sources = sources

                    yield f'event: meta\ndata: {json.dumps({"provider": provider_name, "mode": mode.value, "route": mode.value, "confidence": round(avg_score, 4), "sources": sources, "selected_document_ids": body.document_ids or [], "sufficient_context": sufficient_context, "conversation_id": body.conversation_id})}\n\n'

            else:
                # General AI — streaming
                from app.rag.prompt_templates import GENERAL_AI_SYSTEM_INSTRUCTION
                stream, provider_name = await generate_answer_stream(question, GENERAL_AI_SYSTEM_INSTRUCTION)
                final_provider = provider_name

                async for token in stream:
                    accumulated_tokens.append(token)
                    yield f'event: token\ndata: {json.dumps({"text": token})}\n\n'

                yield f'event: meta\ndata: {json.dumps({"provider": provider_name, "mode": mode.value, "route": mode.value, "confidence": None, "sources": [], "selected_document_ids": [], "sufficient_context": True, "conversation_id": body.conversation_id})}\n\n'

            yield 'event: done\ndata: {}\n\n'

            # Persist to database if authenticated and finished successfully
            if user_id != "demo_user" and accumulated_tokens:
                full_answer = "".join(accumulated_tokens)
                history_entry = ChatHistory(
                    user_id=user_id,
                    question=question,
                    answer=full_answer,
                    mode=mode.value,
                    confidence_score=final_confidence,
                    sources=json.dumps(final_sources) if final_sources else None,
                )
                db.add(history_entry)

                if body.conversation_id:
                    conv_res = await db.execute(
                        select(Conversation).where(
                            Conversation.id == body.conversation_id,
                            Conversation.user_id == user_id,
                        )
                    )
                    conv = conv_res.scalar_one_or_none()
                    if conv:
                        conv.updated_at = datetime.now(timezone.utc)
                        db.add(ConversationMessage(
                            conversation_id=conv.id,
                            sender="user",
                            text=question,
                        ))
                        db.add(ConversationMessage(
                            conversation_id=conv.id,
                            sender="ai",
                            text=full_answer,
                            mode=mode.value,
                            confidence_score=final_confidence,
                            sources=json.dumps(final_sources) if final_sources else None,
                            provider=final_provider,
                            sufficient_context=final_sufficient_context,
                        ))
                await db.commit()

        except Exception as exc:
            logger.exception("Streaming error: %s", exc)
            yield f'event: error\ndata: {json.dumps({"error": "The assistant is temporarily unavailable. Please try again shortly."})}\n\n'

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    limit: int = 50,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Retrieve chat history for the current user."""
    result = await db.execute(
        select(ChatHistory)
        .where(ChatHistory.user_id == user_id)
        .order_by(ChatHistory.created_at.desc())
        .limit(limit)
    )
    items = result.scalars().all()

    return ChatHistoryResponse(
        history=[
            ChatHistoryItem(
                id=h.id,
                question=h.question,
                answer=h.answer,
                mode=h.mode,
                confidence_score=h.confidence_score,
                created_at=h.created_at.isoformat(),
            )
            for h in items
        ],
        total=len(items),
    )


@router.post("/verify-answer")
async def verify_answer_claims(request: Request):
    """Verify factual claims in an AI answer against source text snippets."""
    from app.rag.verifier import verify_answer_faithfulness

    body = await request.json()
    answer = body.get("answer", "")
    sources = body.get("sources", [])

    source_texts = []
    for s in sources:
        if isinstance(s, dict) and "text_snippet" in s:
            source_texts.append(s["text_snippet"])
        elif isinstance(s, str):
            source_texts.append(s)

    verification = verify_answer_faithfulness(answer, source_texts)
    return verification
