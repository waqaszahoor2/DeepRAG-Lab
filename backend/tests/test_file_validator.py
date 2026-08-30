from io import BytesIO

import pytest
from fastapi import UploadFile

from app.core.exceptions import FileValidationError
from app.security.file_validator import _sanitize_filename, validate_upload


@pytest.mark.asyncio
async def test_empty_upload_is_rejected():
    upload = UploadFile(filename="empty.txt", file=BytesIO(b""))
    with pytest.raises(FileValidationError, match="empty"):
        await validate_upload(upload)


@pytest.mark.asyncio
async def test_text_upload_requires_utf8():
    upload = UploadFile(filename="notes.txt", file=BytesIO(b"\xff\xfe"))
    with pytest.raises(FileValidationError, match="UTF-8"):
        await validate_upload(upload)


def test_filename_sanitization_removes_both_path_separator_styles():
    safe_name = _sanitize_filename(r"..\..\private/report.txt")
    assert "private" not in safe_name
    assert ".." not in safe_name


@pytest.mark.asyncio
async def test_unsupported_extension_is_rejected():
    upload = UploadFile(filename="script.exe", file=BytesIO(b"MZ\x90\x00"))
    with pytest.raises(FileValidationError, match="not allowed"):
        await validate_upload(upload)


@pytest.mark.asyncio
async def test_spoofed_pdf_magic_bytes_is_rejected():
    upload = UploadFile(filename="fake.pdf", file=BytesIO(b"NOT_A_PDF_FILE"))
    with pytest.raises(FileValidationError, match="spoofing"):
        await validate_upload(upload)


@pytest.mark.asyncio
async def test_valid_pdf_and_markdown_uploads_accepted():
    pdf_upload = UploadFile(filename="valid.pdf", file=BytesIO(b"%PDF-1.4 sample pdf text content"))
    safe_name, ext, file_id = await validate_upload(pdf_upload)
    assert ext == ".pdf"
    assert len(file_id) > 0

    md_upload = UploadFile(filename="readme.md", file=BytesIO(b"# Hello World\nSample markdown"))
    safe_name_md, ext_md, file_id_md = await validate_upload(md_upload)
    assert ext_md == ".md"
    assert len(file_id_md) > 0