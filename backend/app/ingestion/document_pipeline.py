"""
DeepRAG Lab — Document Ingestion Pipeline.

Orchestrates the full document processing flow:
Upload → Validate → Extract → Clean → Chunk → Embed → Store

This replaces the original stub that only returned True.
"""

from __future__ import annotations

from app.core.config import get_settings
from app.core.exceptions import DocumentProcessingError
from app.core.logging import get_logger
from app.embeddings.generator import generate_embeddings_batch
from app.ingestion.chunker import Chunk, chunk_text
from app.ingestion.cleaner import clean_text

logger = get_logger(__name__)

# ── Extractor Registry ───────────────────────────────────────────────────

_EXTRACTORS = {
    ".pdf": "app.ingestion.extractors.pdf_extractor:extract_pdf",
    ".docx": "app.ingestion.extractors.docx_extractor:extract_docx",
    ".txt": "app.ingestion.extractors.txt_extractor:extract_txt",
    ".csv": "app.ingestion.extractors.csv_extractor:extract_csv",
    ".md": "app.ingestion.extractors.markdown_extractor:extract_markdown",
}


def _get_extractor(file_type: str):
    """Dynamically import and return the extractor function for a file type."""
    entry = _EXTRACTORS.get(file_type)
    if not entry:
        raise DocumentProcessingError(f"No extractor registered for file type: {file_type}")

    module_path, func_name = entry.rsplit(":", 1)
    import importlib
    module = importlib.import_module(module_path)
    return getattr(module, func_name)


def _get_vector_store():
    """Return the configured vector store instance."""
    settings = get_settings()
    if settings.VECTOR_DB_PROVIDER == "qdrant":
        from app.vectorstore.qdrant_store import get_vector_store
    else:
        from app.vectorstore.chroma_store import get_vector_store
    return get_vector_store()


async def process_document(
    file_path: str,
    file_type: str,
    document_id: str,
    user_id: str,
) -> int:
    """Process a document through the full ingestion pipeline.

    Returns the number of chunks created.

    Pipeline:
        1. Extract text (per-page where applicable)
        2. Clean each page's text
        3. Chunk into overlapping segments
        4. Generate embeddings for all chunks
        5. Store in vector database

    Raises DocumentProcessingError on failure.
    """
    settings = get_settings()

    try:
        # ── Step 1: Extract ──────────────────────────────────────────
        logger.info("Extracting text from %s (%s)", file_path, file_type)
        extractor = _get_extractor(file_type)
        pages = extractor(file_path)

        if not pages:
            raise DocumentProcessingError(
                f"No text could be extracted from the document ({file_type})."
            )

        # ── Step 2 & 3: Clean + Chunk ────────────────────────────────
        all_chunks: list[Chunk] = []

        for page in pages:
            cleaned = clean_text(page.text)
            if not cleaned:
                continue

            page_chunks = chunk_text(
                text=cleaned,
                document_id=document_id,
                page_number=page.page_number,
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP,
            )
            all_chunks.extend(page_chunks)

        if not all_chunks:
            raise DocumentProcessingError("Document produced no text chunks after cleaning.")

        # Enforce max chunks limit
        if len(all_chunks) > settings.MAX_CHUNKS_PER_DOCUMENT:
            logger.warning(
                "Document %s produced %d chunks, truncating to %d",
                document_id, len(all_chunks), settings.MAX_CHUNKS_PER_DOCUMENT,
            )
            all_chunks = all_chunks[: settings.MAX_CHUNKS_PER_DOCUMENT]

        logger.info("Document %s: %d chunks from %d pages", document_id, len(all_chunks), len(pages))

        # ── Step 4: Generate Embeddings ──────────────────────────────
        texts = [c.text for c in all_chunks]
        embeddings = await generate_embeddings_batch(texts)

        # ── Step 5: Store in Vector DB ───────────────────────────────
        store = _get_vector_store()
        store.store(
            ids=[c.chunk_id for c in all_chunks],
            embeddings=embeddings,
            texts=texts,
            metadatas=[
                {
                    "document_id": c.document_id,
                    "page_number": c.page_number,
                    "chunk_index": c.position,
                    "user_id": user_id,
                }
                for c in all_chunks
            ],
        )

        logger.info(
            "Document %s fully processed: %d chunks stored",
            document_id, len(all_chunks),
        )
        return len(all_chunks)

    except DocumentProcessingError:
        raise
    except Exception as exc:
        logger.exception("Document processing pipeline failed for %s", document_id)
        raise DocumentProcessingError(f"Pipeline failure: {exc}") from exc
