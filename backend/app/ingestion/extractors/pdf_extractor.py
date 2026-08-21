"""PDF text extractor using pdfplumber for accurate text + page tracking."""

from __future__ import annotations

from dataclasses import dataclass

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ExtractedPage:
    """Represents text extracted from a single page."""
    page_number: int
    text: str


def extract_pdf(file_path: str) -> list[ExtractedPage]:
    """Extract text from a PDF file, preserving page boundaries.

    Returns a list of ExtractedPage objects, one per page.
    """
    import pdfplumber

    pages: list[ExtractedPage] = []

    try:
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                if text.strip():
                    pages.append(ExtractedPage(page_number=i, text=text))
                else:
                    logger.debug("Page %d is empty or image-only (skipped)", i)
    except Exception as exc:
        logger.error("PDF extraction failed for %s: %s", file_path, exc)
        raise

    logger.info("Extracted %d pages from PDF: %s", len(pages), file_path)
    return pages
