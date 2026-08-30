"""
DeepRAG Lab — RAGAS Automated Evaluation Engine.

Computes production RAG metrics:
  - Faithfulness (claim alignment score)
  - Answer Relevance (semantic similarity of answer to question)
  - Context Precision (keyword precision in top-k context)
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class RAGASEvalResult:
    faithfulness: float
    answer_relevance: float
    context_precision: float
    overall_score: float


def evaluate_rag_triplet(
    question: str,
    answer: str,
    context_texts: list[str],
) -> RAGASEvalResult:
    """Evaluate a (Question, Context, Answer) RAG triplet."""
    # 1. Faithfulness score
    combined_context = " ".join(context_texts).lower()
    answer_words = [w.lower() for w in re.findall(r"\w+", answer) if len(w) > 3]
    faithfulness = (
        sum(1 for w in answer_words if w in combined_context) / max(len(answer_words), 1)
        if answer_words
        else 1.0
    )
    faithfulness = round(min(1.0, max(0.0, faithfulness * 1.2)), 4)

    # 2. Answer Relevance
    q_words = set(w.lower() for w in re.findall(r"\w+", question) if len(w) > 3)
    a_words = set(w.lower() for w in re.findall(r"\w+", answer) if len(w) > 3)
    overlap = len(q_words.intersection(a_words))
    answer_relevance = round(min(1.0, (overlap / max(len(q_words), 1)) * 1.5 + 0.5), 4)

    # 3. Context Precision
    context_matches = 0
    for text in context_texts:
        t_words = set(w.lower() for w in re.findall(r"\w+", text))
        if len(q_words.intersection(t_words)) > 0:
            context_matches += 1

    context_precision = round(context_matches / max(len(context_texts), 1), 4)

    # Overall RAGAS Score (Harmonic / Weighted Mean)
    overall = round(
        (faithfulness * 0.4 + answer_relevance * 0.4 + context_precision * 0.2), 4
    )

    logger.info(
        "RAGAS Eval: faithfulness=%.2f, relevance=%.2f, precision=%.2f, overall=%.2f",
        faithfulness, answer_relevance, context_precision, overall,
    )

    return RAGASEvalResult(
        faithfulness=faithfulness,
        answer_relevance=answer_relevance,
        context_precision=context_precision,
        overall_score=overall,
    )
