import pytest
from app.rag.query_classifier import classify_query, QueryMode

def test_query_classifier():
    doc_q = "What is mentioned on page 3 of the uploaded report PDF?"
    assert classify_query(doc_q) == QueryMode.DOCUMENT_QA

    general_q = "Write a Python script to calculate Fibonacci numbers."
    assert classify_query(general_q) == QueryMode.GENERAL_AI


def test_semantic_cache_isolated_by_scope():
    from app.rag.semantic_cache import SemanticCache

    cache = SemanticCache(similarity_threshold=0.9)
    embedding = [1.0, 0.0]
    cache.set("private question", embedding, {"answer": "private"}, scope="user:a")

    assert cache.get(embedding, scope="user:a")[0]["answer"] == "private"
    assert cache.get(embedding, scope="user:b")[0] is None


def test_answer_faithfulness_verifier():
    from app.rag.verifier import verify_answer_faithfulness

    answer = "The transformer architecture relies entirely on self-attention mechanisms to compute representations."
    sources = [
        "The Transformer is the first transduction model relying entirely on self-attention to compute representations."
    ]

    result = verify_answer_faithfulness(answer, sources)
    assert result["faithfulness_score"] > 0.5
    assert result["verified_count"] >= 1
    assert result["unverified_count"] == 0
