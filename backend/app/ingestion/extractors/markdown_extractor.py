"""Markdown file extractor — preserves heading structure."""

from __future__ import annotations

from dataclasses import dataclass

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ExtractedPage:
    page_number: int
    text: str


def extract_markdown(file_path: str) -> list[ExtractedPage]:
    """Extract text from a Markdown file.

    Markdown content is already well-structured, so we keep it as-is.
    The heading structure is preserved for use as metadata by the chunker.
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(file_path, "r", encoding="latin-1") as f:
            content = f.read()

    if not content.strip():
        logger.warning("Markdown file is empty: %s", file_path)
        return []

    logger.info("Extracted %d characters from Markdown: %s", len(content), file_path)
    return [ExtractedPage(page_number=1, text=content)]
