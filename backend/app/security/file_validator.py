"""
DeepRAG Lab — File Upload Validator.

Validates:
- File extension against whitelist
- File size against configurable maximum
- Magic bytes (file signature) to prevent extension spoofing
- Filename sanitization
"""

from __future__ import annotations

import os
import re
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import get_settings
from app.core.exceptions import FileValidationError
from app.core.logging import get_logger

logger = get_logger(__name__)

# Magic bytes for supported file types
_MAGIC_SIGNATURES: dict[str, list[bytes]] = {
    ".pdf": [b"%PDF"],
    ".docx": [b"PK\x03\x04"],  # ZIP-based format
    ".csv": [],  # Plain text — no reliable magic bytes
    ".txt": [],  # Plain text
    ".md": [],   # Plain text
}


def _sanitize_filename(filename: str) -> str:
    """Remove path traversal sequences and dangerous characters."""
    # Strip directory components
    name = os.path.basename(filename.replace("\\", "/"))
    # Remove non-alphanumeric chars except dot, hyphen, underscore
    name = re.sub(r"[^\w.\-]", "_", name)
    # Collapse multiple underscores
    name = re.sub(r"_{2,}", "_", name)
    return name.strip("_") or "unnamed_file"


def _check_magic_bytes(content_start: bytes, extension: str) -> bool:
    """Verify that the file content matches expected magic bytes."""
    signatures = _MAGIC_SIGNATURES.get(extension, [])
    if not signatures:
        return True  # No signature check for plain-text formats
    return any(content_start.startswith(sig) for sig in signatures)


async def validate_upload(file: UploadFile) -> tuple[str, str, str]:
    """Validate an uploaded file and return (safe_filename, extension, unique_id).

    Raises FileValidationError on any policy violation.
    """
    settings = get_settings()

    if not file.filename:
        raise FileValidationError("Filename is missing.")

    # 1. Extension check
    extension = Path(file.filename).suffix.lower()
    if extension not in settings.ALLOWED_EXTENSIONS:
        raise FileValidationError(
            f"File type '{extension}' is not allowed. "
            f"Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # 2. Size check (read first MAX+1 byte to detect oversize)
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    content = await file.read(max_bytes + 1)
    if not content:
        raise FileValidationError("The uploaded file is empty.")
    if len(content) > max_bytes:
        raise FileValidationError(
            f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB} MB."
        )
    # Reset file position for downstream consumers
    await file.seek(0)

    # 3. Magic bytes check
    if not _check_magic_bytes(content[:16], extension):
        raise FileValidationError(
            f"File content does not match the '{extension}' format. "
            "Possible extension spoofing detected."
        )

    if extension in {".txt", ".csv", ".md"}:
        try:
            content.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise FileValidationError("Text files must use UTF-8 encoding.") from exc

    # 4. Sanitize filename and assign unique ID
    safe_name = _sanitize_filename(file.filename)
    file_id = str(uuid.uuid4())
    final_name = f"{file_id}_{safe_name}"

    logger.info("File validated: %s (%d bytes)", final_name, len(content))
    return final_name, extension, file_id
