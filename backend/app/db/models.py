"""
DeepRAG Lab — Database Models.

SQLAlchemy ORM models for Users, Documents, ChatHistory, Conversations, and ConversationMessages.
Uses SQLite in development, PostgreSQL-ready for production.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Boolean,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    # Relationships
    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    chat_history = relationship("ChatHistory", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (UniqueConstraint("user_id", "content_hash", name="uq_document_user_content_hash"),)

    id = Column(String(36), primary_key=True, default=_new_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_type = Column(String(10), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    chunk_count = Column(Integer, default=0)
    status = Column(String(20), default="processing")  # processing | ready | failed
    error_message = Column(Text, nullable=True)
    content_hash = Column(String(64), nullable=False, default="")
    processing_stage = Column(String(30), nullable=False, default="queued")
    processing_progress = Column(Integer, nullable=False, default=0)
    processing_attempt = Column(Integer, nullable=False, default=1)
    cancel_requested = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    # Relationships
    owner = relationship("User", back_populates="documents")


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    mode = Column(String(20), nullable=False)  # document_qa | general_ai
    confidence_score = Column(Float, nullable=True)
    sources = Column(Text, nullable=True)  # JSON-serialised source list
    created_at = Column(DateTime, default=_utcnow)

    # Relationships
    user = relationship("User", back_populates="chat_history")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="New Conversation")
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("ConversationMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ConversationMessage.created_at")


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(String(36), primary_key=True, default=_new_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False, index=True)
    sender = Column(String(10), nullable=False)  # "user" | "ai"
    text = Column(Text, nullable=False)
    mode = Column(String(20), nullable=True)
    confidence_score = Column(Float, nullable=True)
    sources = Column(Text, nullable=True)  # JSON string
    provider = Column(String(50), nullable=True)
    sufficient_context = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_utcnow)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
