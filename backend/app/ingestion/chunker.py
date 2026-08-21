"""
DeepRAG Lab — Text Chunker.

Recursive character text splitter that preserves paragraph boundaries
and assigns metadata (chunk_id, document_id, page_number, position).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class Chunk:
    """A single text chunk with full metadata."""
    chunk_id: str
    document_id: str
    text: str
    page_number: int
    position: int  # 0-indexed position within the document
    char_start: int
    char_end: int
    metadata: dict = field(default_factory=dict)


def chunk_text(
    text: str,
    document_id: str,
    page_number: int = 1,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[Chunk]:
    """Split text into overlapping chunks, respecting natural boundaries.

    Uses a recursive strategy: first try to split on paragraphs,
    then sentences, then words, then characters.
    """
    settings = get_settings()
    size = chunk_size or settings.CHUNK_SIZE
    overlap = chunk_overlap or settings.CHUNK_OVERLAP

    if not text.strip():
        return []

    # Separators in order of preference (most natural first)
    separators = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""]

    raw_chunks = _recursive_split(text, separators, size)
    chunks: list[Chunk] = []
    char_offset = 0

    for idx, chunk_text_raw in enumerate(raw_chunks):
        chunk_text_clean = chunk_text_raw.strip()
        if not chunk_text_clean:
            continue

        chunk = Chunk(
            chunk_id=str(uuid.uuid4()),
            document_id=document_id,
            text=chunk_text_clean,
            page_number=page_number,
            position=idx,
            char_start=char_offset,
            char_end=char_offset + len(chunk_text_clean),
            metadata={
                "document_id": document_id,
                "page_number": page_number,
                "chunk_index": idx,
            },
        )
        chunks.append(chunk)
        # Advance offset, accounting for overlap
        char_offset += len(chunk_text_clean) - overlap
        if char_offset < 0:
            char_offset = 0

    logger.info(
        "Chunked document %s page %d: %d chunks (size=%d, overlap=%d)",
        document_id, page_number, len(chunks), size, overlap,
    )
    return chunks


def _recursive_split(
    text: str,
    separators: list[str],
    chunk_size: int,
) -> list[str]:
    """Recursively split text using progressively finer separators."""
    if len(text) <= chunk_size:
        return [text]

    # Find the first separator that exists in the text
    separator = ""
    for sep in separators:
        if sep in text:
            separator = sep
            break

    if not separator:
        # Last resort: hard split by characters
        chunks = []
        for i in range(0, len(text), chunk_size):
            chunks.append(text[i : i + chunk_size])
        return chunks

    parts = text.split(separator)
    result: list[str] = []
    current = ""

    for part in parts:
        candidate = (current + separator + part).strip() if current else part.strip()
        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                result.append(current)
            # If the single part is still too large, recurse with finer separators
            if len(part) > chunk_size:
                remaining_seps = separators[separators.index(separator) + 1 :]
                result.extend(_recursive_split(part, remaining_seps, chunk_size))
                current = ""
            else:
                current = part.strip()

    if current:
        result.append(current)

    return result
