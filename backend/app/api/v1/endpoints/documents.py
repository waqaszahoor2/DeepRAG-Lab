"""Document upload & management endpoints."""

from __future__ import annotations

import os
import hashlib
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File
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
from app.db.session import _get_session_factory, get_db_session
from app.ingestion.document_pipeline import process_document
from app.security.auth import get_current_user_id
from app.security.file_validator import validate_upload

logger = get_logger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])
_processing_status: dict[str, dict[str, int | str]] = {}


async def _process_document_job(file_path: str, file_type: str, document_id: str, user_id: str) -> None:
    session_factory = _get_session_factory()
    _processing_status[document_id] = {"stage": "extracting", "progress": 20}
    async with session_factory() as db:
        try:
            chunk_count = await process_document(file_path, file_type, document_id, user_id)
            doc = await db.get(Document, document_id)
            if doc:
                doc.chunk_count = chunk_count
                doc.status = "ready"
                doc.error_message = None
                doc.processing_stage = "ready"
                doc.processing_progress = 100
                await db.commit()
            _processing_status[document_id] = {"stage": "ready", "progress": 100}
        except Exception as exc:
            doc = await db.get(Document, document_id)
            if doc:
                doc.status = "failed"
                doc.error_message = "Document processing failed. Please retry the upload."
                doc.processing_stage = "failed"
                doc.processing_progress = 100
                await db.commit()
            _processing_status[document_id] = {"stage": "failed", "progress": 100}
            logger.error("Document processing failed for %s: %s", document_id, exc)


@router.post("/upload", response_model=DocumentResponse, status_code=202)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Upload and process a document."""
    settings = get_settings()

    # Validate the file
    safe_name, extension, file_id = await validate_upload(file)

    content = await file.read()
    content_hash = hashlib.sha256(content).hexdigest()

    existing_result = await db.execute(
        select(Document).where(Document.user_id == user_id, Document.content_hash == content_hash)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        return DocumentResponse(
            id=existing.id, filename=existing.filename, original_filename=existing.original_filename,
            file_type=existing.file_type, file_size_bytes=existing.file_size_bytes,
            chunk_count=existing.chunk_count, status=existing.status, error_message=existing.error_message,
            stage=existing.processing_stage, progress=existing.processing_progress,
            processing_attempt=existing.processing_attempt, created_at=existing.created_at.isoformat(),
        )

    # Save only after duplicate detection so repeated uploads do not leave orphan files.
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / safe_name
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
        content_hash=content_hash,
        processing_stage="queued",
        processing_progress=5,
    )
    db.add(doc)
    await db.flush()

    _processing_status[file_id] = {"stage": "queued", "progress": 5}
    background_tasks.add_task(_process_document_job, str(file_path), extension, file_id, user_id)

    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        original_filename=doc.original_filename,
        file_type=doc.file_type,
        file_size_bytes=doc.file_size_bytes,
        chunk_count=doc.chunk_count,
        status=doc.status,
        error_message=doc.error_message,
        stage="queued",
        progress=5,
        processing_attempt=doc.processing_attempt,
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
                error_message=d.error_message,
                stage=_processing_status.get(d.id, {}).get("stage"),
                progress=int(_processing_status.get(d.id, {}).get("progress", 100 if d.status == "ready" else 0)),
                processing_attempt=d.processing_attempt,
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
        error_message=doc.error_message,
        stage=_processing_status.get(doc.id, {}).get("stage", doc.status),
        progress=int(_processing_status.get(doc.id, {}).get("progress", 100 if doc.status == "ready" else 0)),
        processing_attempt=doc.processing_attempt,
        created_at=doc.created_at.isoformat(),
    )


@router.post("/{document_id}/cancel", response_model=DocumentResponse)
async def cancel_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(select(Document).where(Document.id == document_id, Document.user_id == user_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise DeepRAGError("Document not found.", status_code=404)
    if doc.status == "processing":
        doc.cancel_requested = True
        doc.status = "failed"
        doc.processing_stage = "cancelled"
        doc.processing_progress = 0
        doc.error_message = "Processing cancelled. You can retry this document."
    return DocumentResponse(
        id=doc.id, filename=doc.filename, original_filename=doc.original_filename, file_type=doc.file_type,
        file_size_bytes=doc.file_size_bytes, chunk_count=doc.chunk_count, status=doc.status,
        error_message=doc.error_message, stage=doc.processing_stage, progress=doc.processing_progress,
        processing_attempt=doc.processing_attempt, created_at=doc.created_at.isoformat(),
    )


@router.post("/{document_id}/retry", response_model=DocumentResponse, status_code=202)
async def retry_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(select(Document).where(Document.id == document_id, Document.user_id == user_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise DeepRAGError("Document not found.", status_code=404)
    if doc.status == "processing":
        raise DeepRAGError("Document is already processing.", status_code=409)
    file_path = Path(get_settings().UPLOAD_DIR) / doc.filename
    if not file_path.exists():
        raise DeepRAGError("Original upload is no longer available.", status_code=404)
    doc.status = "processing"
    doc.error_message = None
    doc.cancel_requested = False
    doc.processing_stage = "queued"
    doc.processing_progress = 5
    doc.processing_attempt += 1
    await db.flush()
    _processing_status[doc.id] = {"stage": "queued", "progress": 5}
    background_tasks.add_task(_process_document_job, str(file_path), doc.file_type, doc.id, user_id)
    return DocumentResponse(
        id=doc.id, filename=doc.filename, original_filename=doc.original_filename, file_type=doc.file_type,
        file_size_bytes=doc.file_size_bytes, chunk_count=doc.chunk_count, status=doc.status,
        error_message=None, stage=doc.processing_stage, progress=doc.processing_progress,
        processing_attempt=doc.processing_attempt, created_at=doc.created_at.isoformat(),
    )


@router.get("/{document_id}/chunks")
async def get_document_chunks(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db_session),
):
    """Retrieve all vector chunks for a specific document."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == user_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise DeepRAGError("Document not found.", status_code=404)

    try:
        from app.ingestion.document_pipeline import _get_vector_store
        store = _get_vector_store()
        chunks = store.get_document_chunks(document_id)

        return {
            "document_id": document_id,
            "filename": doc.original_filename,
            "total_chunks": len(chunks),
            "chunks": [
                {
                    "chunk_id": c.chunk_id,
                    "page_number": c.page_number,
                    "text": c.text,
                    "character_count": len(c.text),
                }
                for c in chunks
            ],
        }
    except Exception as exc:
        logger.error("Failed to retrieve chunks for document %s: %s", document_id, exc)
        raise DeepRAGError("Failed to fetch document chunks.", status_code=500)


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
        from app.ingestion.document_pipeline import _get_vector_store
        store = _get_vector_store()
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
