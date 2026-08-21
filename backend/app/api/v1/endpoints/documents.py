"""Document upload & management endpoints."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.documents import (
    DocumentDeleteResponse,
    DocumentListResponse,
    DocumentResponse,
)
from app.core.config import get_settings
from app.core.exceptions import DeepRAGError
from app.core.logging import get_logger
from app.db.models import Document
from app.db.session import get_db_session
from app.ingestion.document_pipeline import process_document
from app.security.auth import get_current_user_id
from app.security.file_validator import validate_upload

logger = get_logger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Upload and process a document."""
    settings = get_settings()

    # Validate the file
    safe_name, extension, file_id = await validate_upload(file)

    # Save to disk
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / safe_name

    content = await file.read()
    file_path.write_bytes(content)

    # Create DB record
    doc = Document(
        id=file_id,
        user_id=user_id,
        filename=safe_name,
        original_filename=file.filename or "unknown",
        file_type=extension,
        file_size_bytes=len(content),
        status="processing",
    )
    db.add(doc)
    await db.flush()

    # Process document (extract, chunk, embed, store)
    try:
        chunk_count = await process_document(
            file_path=str(file_path),
            file_type=extension,
            document_id=file_id,
            user_id=user_id,
        )
        doc.chunk_count = chunk_count
        doc.status = "ready"
        logger.info("Document processed: %s (%d chunks)", safe_name, chunk_count)
    except Exception as exc:
        doc.status = "failed"
        doc.error_message = str(exc)[:500]
        logger.error("Document processing failed: %s — %s", safe_name, exc)

    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        original_filename=doc.original_filename,
        file_type=doc.file_type,
        file_size_bytes=doc.file_size_bytes,
        chunk_count=doc.chunk_count,
        status=doc.status,
        created_at=doc.created_at.isoformat(),
    )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """List all documents for the current user."""
    result = await db.execute(
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()

    return DocumentListResponse(
        documents=[
            DocumentResponse(
                id=d.id,
                filename=d.filename,
                original_filename=d.original_filename,
                file_type=d.file_type,
                file_size_bytes=d.file_size_bytes,
                chunk_count=d.chunk_count,
                status=d.status,
                created_at=d.created_at.isoformat(),
            )
            for d in docs
        ],
        total=len(docs),
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Get details of a specific document."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise DeepRAGError("Document not found.", status_code=404)

    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        original_filename=doc.original_filename,
        file_type=doc.file_type,
        file_size_bytes=doc.file_size_bytes,
        chunk_count=doc.chunk_count,
        status=doc.status,
        created_at=doc.created_at.isoformat(),
    )


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
async def delete_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete a document and its vector embeddings."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise DeepRAGError("Document not found.", status_code=404)

    # Delete vectors from vector store
    try:
        from app.vectorstore.chroma_store import ChromaVectorStore
        store = ChromaVectorStore()
        store.delete_document(document_id)
    except Exception as exc:
        logger.warning("Failed to delete vectors for %s: %s", document_id, exc)

    # Delete file from disk
    settings = get_settings()
    file_path = Path(settings.UPLOAD_DIR) / doc.filename
    if file_path.exists():
        file_path.unlink()

    await db.delete(doc)
    logger.info("Document deleted: %s", document_id)

    return DocumentDeleteResponse(id=document_id, message="Document deleted successfully.")
