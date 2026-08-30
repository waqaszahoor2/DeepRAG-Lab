"""Conversation management endpoints (threads & chat persistence)."""

from __future__ import annotations

import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.schemas.conversations import (
    AddMessageRequest,
    ConversationDetailSchema,
    ConversationSchema,
    CreateConversationRequest,
    MessageSchema,
    UpdateConversationRequest,
)
from app.core.logging import get_logger
from app.db.models import Conversation, ConversationMessage
from app.db.session import get_db_session
from app.security.auth import get_current_user_id

logger = get_logger(__name__)
router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("", response_model=list[ConversationSchema])
async def list_conversations(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """List all conversation threads for the authenticated user."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()

    response = []
    for c in conversations:
        last_msg = c.messages[-1].text if c.messages else None
        response.append(
            ConversationSchema(
                id=c.id,
                title=c.title,
                created_at=c.created_at.isoformat(),
                updated_at=c.updated_at.isoformat(),
                message_count=len(c.messages),
                last_message=last_msg[:100] + "..." if last_msg and len(last_msg) > 100 else last_msg,
            )
        )
    return response


@router.post("", response_model=ConversationSchema, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: CreateConversationRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new conversation thread."""
    conv = Conversation(
        user_id=user_id,
        title=body.title,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)

    return ConversationSchema(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
        message_count=0,
        last_message=None,
    )


@router.get("/{conversation_id}", response_model=ConversationDetailSchema)
async def get_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Fetch full detail of a conversation thread including all messages."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = []
    for m in conv.messages:
        parsed_sources = json.loads(m.sources) if m.sources else None
        messages.append(
            MessageSchema(
                id=m.id,
                conversation_id=m.conversation_id,
                sender=m.sender,
                text=m.text,
                mode=m.mode,
                confidence_score=m.confidence_score,
                sources=parsed_sources,
                provider=m.provider,
                sufficient_context=m.sufficient_context if m.sufficient_context is not None else True,
                created_at=m.created_at.isoformat(),
            )
        )

    return ConversationDetailSchema(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
        messages=messages,
    )


@router.patch("/{conversation_id}", response_model=ConversationSchema)
async def update_conversation(
    conversation_id: str,
    body: UpdateConversationRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Update conversation title."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.title = body.title
    await db.commit()
    await db.refresh(conv)

    return ConversationSchema(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at.isoformat(),
        updated_at=conv.updated_at.isoformat(),
        message_count=0,
    )


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete a conversation thread and all its messages."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conv)
    await db.commit()


@router.post("/{conversation_id}/messages", response_model=MessageSchema, status_code=status.HTTP_201_CREATED)
async def add_message(
    conversation_id: str,
    body: AddMessageRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Append a message to an existing conversation thread."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg = ConversationMessage(
        conversation_id=conv.id,
        sender=body.sender,
        text=body.text,
        mode=body.mode,
        confidence_score=body.confidence_score,
        sources=json.dumps(body.sources) if body.sources else None,
        provider=body.provider,
        sufficient_context=body.sufficient_context,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    return MessageSchema(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender=msg.sender,
        text=msg.text,
        mode=msg.mode,
        confidence_score=msg.confidence_score,
        sources=body.sources,
        provider=msg.provider,
        sufficient_context=msg.sufficient_context if msg.sufficient_context is not None else True,
        created_at=msg.created_at.isoformat(),
    )

