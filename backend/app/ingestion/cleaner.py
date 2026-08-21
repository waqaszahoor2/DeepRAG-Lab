"""
DeepRAG Lab — Text Cleaner.

Normalises extracted text before chunking:
- Removes control characters
- Normalises whitespace
- Strips common header/footer patterns
- Normalises Unicode
"""

from __future__ import annotations

import re
import unicodedata


def clean_text(text: str) -> str:
    """Clean raw extracted text for downstream processing."""

    # 1. Normalise Unicode (NFC form)
    text = unicodedata.normalize("NFC", text)

    # 2. Remove control characters (keep newlines and tabs)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", text)

    # 3. Replace non-breaking spaces and other space variants
    text = text.replace("\u00a0", " ")
    text = text.replace("\u200b", "")  # zero-width space
    text = text.replace("\ufeff", "")  # BOM

    # 4. Normalise whitespace (collapse multiple spaces, preserve newlines)
    text = re.sub(r"[^\S\n]+", " ", text)  # multiple spaces → single space
    text = re.sub(r"\n{3,}", "\n\n", text)  # 3+ newlines → 2

    # 5. Remove common header/footer patterns
    text = re.sub(r"(?i)^\s*page\s*\d+\s*(?:of\s*\d+)?\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"(?i)^\s*confidential\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"(?i)^\s*draft\s*$", "", text, flags=re.MULTILINE)

    # 6. Strip leading/trailing whitespace
    text = text.strip()

    return text
