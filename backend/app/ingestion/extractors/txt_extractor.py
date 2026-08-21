"""Plain text file extractor with encoding detection."""

from __future__ import annotations

from dataclasses import dataclass

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ExtractedPage:
    page_number: int
    text: str


def extract_txt(file_path: str) -> list[ExtractedPage]:
    """Extract text from a plain .txt file.

    Tries UTF-8 first, then falls back to latin-1 for broader compatibility.
    """
    content = None

    for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            with open(file_path, "r", encoding=encoding) as f:
                content = f.read()
            break
        except (UnicodeDecodeError, UnicodeError):
            continue

    if content is None:
        logger.error("Could not decode TXT file with any known encoding: %s", file_path)
        raise ValueError(f"Unable to decode text file: {file_path}")

    if not content.strip():
        logger.warning("TXT file is empty: %s", file_path)
        return []

    logger.info("Extracted %d characters from TXT: %s", len(content), file_path)
    return [ExtractedPage(page_number=1, text=content)]
