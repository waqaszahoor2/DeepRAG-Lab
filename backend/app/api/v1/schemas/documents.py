"""Pydantic schemas for document endpoints."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    original_filename: str
    file_type: str
    file_size_bytes: int
    chunk_count: int
    status: str
    error_message: str | None = None
    stage: str | None = None
    progress: int = 0
    processing_attempt: int = 1
    created_at: str


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


class DocumentDeleteResponse(BaseModel):
    id: str
    message: str
