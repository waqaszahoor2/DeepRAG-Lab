"""Chat endpoint — routes queries through the RAG pipeline or general AI."""

from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends
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
from app.db.models import ChatHistory
from app.db.session import get_db_session
from app.rag.pipeline import run_rag_pipeline
from app.rag.query_classifier import classify_query, QueryMode
from app.llm.router import generate_answer
from app.security.auth import get_current_user_id
from app.security.sanitizer import sanitize_query

logger = get_logger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Process a user question — either via RAG or general AI."""
    query_id = str(uuid.uuid4())
    question = sanitize_query(body.question)

    # Determine mode
    if body.mode == "auto":
        mode = classify_query(question)
    else:
        mode = QueryMode(body.mode)

    logger.info("Chat [%s] mode=%s question=%.80s...", query_id, mode.value, question)

    answer = ""
    confidence = None
    sources: list[SourceCitation] = []

    if mode == QueryMode.DOCUMENT_QA:
        # Run full RAG pipeline
        rag_result = await run_rag_pipeline(
            question=question,
            document_ids=body.document_ids,
        )
        answer = rag_result["answer"]
        confidence = rag_result.get("confidence_score")
        sources = [
            SourceCitation(**s) for s in rag_result.get("sources", [])
        ]
    else:
        # General AI — direct LLM call
        answer = await generate_answer(question)

    # Save to history
    history_entry = ChatHistory(
        user_id=user_id,
        question=question,
        answer=answer,
        mode=mode.value,
        confidence_score=confidence,
        sources=json.dumps([s.model_dump() for s in sources]) if sources else None,
    )
    db.add(history_entry)

    return ChatResponse(
        answer=answer,
        mode=mode.value,
        confidence_score=confidence,
        sources=sources,
        query_id=query_id,
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
