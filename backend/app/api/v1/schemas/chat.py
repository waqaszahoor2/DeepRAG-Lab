"""Pydantic schemas for chat endpoints."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


# ── Requests ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    mode: str = Field(
        default="auto",
        description="Query mode: 'document_qa', 'general_ai', or 'auto' (let the system decide)",
    )
    document_ids: list[str] | None = Field(
        default=None,
        description="Optional: restrict RAG search to specific document IDs",
    )
    conversation_id: str | None = Field(
        default=None,
        description="Optional: save to an existing conversation thread",
    )
    is_demo: bool = Field(
        default=False,
        description="If true, bypass auth and search only demo documents",
    )


# ── Responses ────────────────────────────────────────────────────────────

class SourceCitation(BaseModel):
    document_id: str
    document_name: str
    chunk_id: str
    page_number: int | None = None
    text_snippet: str
    relevance_score: float


class ChatResponse(BaseModel):
    answer: str
    mode: str  # document_qa | general_ai
    route: str | None = None
    selected_document_ids: list[str] = []
    confidence_score: float | None = None
    sources: list[SourceCitation] = []
    query_id: str
    provider: str | None = None  # Which LLM provider was used
    sufficient_context: bool = True  # False when docs don't have enough info
    conversation_id: str | None = None


class ChatHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    question: str
    answer: str
    mode: str
    confidence_score: float | None
    created_at: str


class ChatHistoryResponse(BaseModel):
    history: list[ChatHistoryItem]
    total: int
