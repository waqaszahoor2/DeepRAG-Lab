"""
DeepRAG Lab — Query Classifier.

Determines whether a user's question should be answered from
uploaded documents (DOCUMENT_QA) or via general AI (GENERAL_AI).

Uses keyword heuristics for fast, zero-cost classification.
"""

from __future__ import annotations

import re
from enum import Enum

from app.core.logging import get_logger

logger = get_logger(__name__)


class QueryMode(str, Enum):
    DOCUMENT_QA = "document_qa"
    GENERAL_AI = "general_ai"


# Patterns that strongly indicate the user is asking about their documents
_DOCUMENT_PATTERNS: list[re.Pattern] = [
    re.compile(r"\b(document|file|upload|pdf|report|paper|article|page\s*\d+)\b", re.I),
    re.compile(r"\b(according\s+to|based\s+on|from\s+the|in\s+the\s+(?:document|file|text|report))\b", re.I),
    re.compile(r"\b(mentioned|stated|written|described|says|contains)\b", re.I),
    re.compile(r"\b(chapter|section|paragraph|table|figure|appendix)\b", re.I),
    re.compile(r"\b(summarize|summarise|extract|cite|quote)\b", re.I),
    re.compile(r"\b(what\s+does\s+the|find\s+in)\b", re.I),
]

# Patterns that strongly indicate a general knowledge question
_GENERAL_PATTERNS: list[re.Pattern] = [
    re.compile(r"\b(explain|define|what\s+is|who\s+is|how\s+does|why\s+does)\b", re.I),
    re.compile(r"\b(in\s+general|generally|typically|usually)\b", re.I),
    re.compile(r"\b(write\s+me|create|generate|compose|draft)\b", re.I),
    re.compile(r"\b(translate|convert|calculate|compute)\b", re.I),
    re.compile(r"\b(hello|hi|hey|thanks|thank\s+you)\b", re.I),
    re.compile(r"\b(opinion|think|believe|recommend)\b", re.I),
]


def classify_query(question: str) -> QueryMode:
    """Classify a user query into DOCUMENT_QA or GENERAL_AI.

    Scoring:
      +1 for each document pattern match
      -1 for each general pattern match
      Score > 0 → DOCUMENT_QA
      Score ≤ 0 → GENERAL_AI
    """
    score = 0

    for pat in _DOCUMENT_PATTERNS:
        if pat.search(question):
            score += 1

    for pat in _GENERAL_PATTERNS:
        if pat.search(question):
            score -= 1

    mode = QueryMode.DOCUMENT_QA if score > 0 else QueryMode.GENERAL_AI
    logger.info("Query classified as %s (score=%d): %.60s...", mode.value, score, question)
    return mode
