"""CSV file extractor — converts rows to searchable text."""

from __future__ import annotations

import csv
from dataclasses import dataclass

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ExtractedPage:
    page_number: int
    text: str


def extract_csv(file_path: str) -> list[ExtractedPage]:
    """Extract text from a CSV file.

    Each row is converted to a ``header: value`` format for better
    semantic meaning in downstream embedding and retrieval.
    """
    try:
        with open(file_path, "r", encoding="utf-8", newline="") as f:
            # Sniff the dialect
            sample = f.read(4096)
            f.seek(0)
            try:
                dialect = csv.Sniffer().sniff(sample)
            except csv.Error:
                dialect = csv.excel

            reader = csv.reader(f, dialect)
            rows = list(reader)
    except Exception as exc:
        logger.error("CSV extraction failed for %s: %s", file_path, exc)
        raise

    if not rows:
        logger.warning("CSV file is empty: %s", file_path)
        return []

    headers = rows[0] if rows else []
    lines: list[str] = []

    for row_idx, row in enumerate(rows[1:], start=2):
        parts = []
        for col_idx, value in enumerate(row):
            value = value.strip()
            if not value:
                continue
            header = headers[col_idx] if col_idx < len(headers) else f"Column_{col_idx + 1}"
            parts.append(f"{header}: {value}")
        if parts:
            lines.append(f"Row {row_idx}: " + " | ".join(parts))

    full_text = "\n".join(lines)

    if not full_text.strip():
        return []

    logger.info("Extracted %d rows from CSV: %s", len(lines), file_path)
    return [ExtractedPage(page_number=1, text=full_text)]
