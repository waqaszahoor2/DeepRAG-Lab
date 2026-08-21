import pytest
from app.ingestion.cleaner import clean_text
from app.ingestion.chunker import chunk_text

def test_clean_text():
    raw = "   Page 1 of 5 \n\n Hello   World! \u200b  "
    cleaned = clean_text(raw)
    assert "Hello World!" in cleaned
    assert "Page 1 of 5" not in cleaned

def test_chunk_text():
    text = "Paragraph 1 sentence.\n\nParagraph 2 sentence.\n\nParagraph 3 sentence."
    chunks = chunk_text(text, document_id="doc_123", chunk_size=50, chunk_overlap=10)
    assert len(chunks) >= 1
    assert chunks[0].document_id == "doc_123"
    assert chunks[0].chunk_id is not None
