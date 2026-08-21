import pytest
from app.rag.query_classifier import classify_query, QueryMode

def test_query_classifier():
    doc_q = "What is mentioned on page 3 of the uploaded report PDF?"
    assert classify_query(doc_q) == QueryMode.DOCUMENT_QA

    general_q = "Write a Python script to calculate Fibonacci numbers."
    assert classify_query(general_q) == QueryMode.GENERAL_AI
