"""Pydantic schemas for conversation management endpoints."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class MessageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    sender: str
    text: str
    mode: str | None = None
    confidence_score: float | None = None
    sources: list | None = None
    provider: str | None = None
    sufficient_context: bool = True
    created_at: str


class ConversationSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0
    last_message: str | None = None


class ConversationDetailSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: str
    updated_at: str
    messages: list[MessageSchema] = []


class CreateConversationRequest(BaseModel):
    title: str = Field(default="New Conversation", max_length=255)


class UpdateConversationRequest(BaseModel):
    title: str = Field(..., max_length=255)


class AddMessageRequest(BaseModel):
    sender: str
    text: str
    mode: str | None = None
    confidence_score: float | None = None
    sources: list | None = None
    provider: str | None = None
    sufficient_context: bool = True
