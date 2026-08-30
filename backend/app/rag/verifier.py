"""
DeepRAG Lab — Answer Verification Engine.

Extracts factual claims from AI answers and verifies claim alignment
against raw source text chunks to catch potential hallucinations.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ClaimVerificationResult:
    claim: str
    verified: bool
    confidence: float
    supporting_snippet: str | None = None


def _split_into_claims(answer: str) -> list[str]:
    """Split an answer text into sentence-level factual claims."""
    # Strip markdown headers and citation markers
    clean = re.sub(r"\[\d+\]", "", answer)
    clean = re.sub(r"#+\s*", "", clean)

    # Split by period, question mark, or newline
    sentences = re.split(r"[.!?\n]+", clean)
    claims = [s.strip() for s in sentences if len(s.strip()) > 10]
    return claims[:8]  # Limit to top 8 key claims


def verify_answer_faithfulness(
    answer: str,
    source_texts: list[str],
) -> dict:
    """Verify claim alignment between generated answer and source documents.

    Returns:
        dict with faithfulness_score, verified_claims, unverified_claims,
        and claim_details.
    """
    claims = _split_into_claims(answer)
    if not claims or not source_texts:
        return {
            "faithfulness_score": 1.0,
            "total_claims": 0,
            "verified_count": 0,
            "unverified_count": 0,
            "claim_details": [],
        }

    combined_sources = " ".join(source_texts).lower()
    claim_results: list[ClaimVerificationResult] = []

    for claim in claims:
        words = [w.lower() for w in re.findall(r"\w+", claim) if len(w) > 3]
        if not words:
            continue

        matches = sum(1 for w in words if w in combined_sources)
        overlap_ratio = matches / len(words)

        is_verified = overlap_ratio >= 0.4
        confidence = round(min(1.0, overlap_ratio * 1.2), 2)

        # Find best matching snippet if verified
        best_snippet = None
        if is_verified:
            for text in source_texts:
                if any(w in text.lower() for w in words[:3]):
                    best_snippet = text[:150] + "..." if len(text) > 150 else text
                    break

        claim_results.append(
            ClaimVerificationResult(
                claim=claim,
                verified=is_verified,
                confidence=confidence,
                supporting_snippet=best_snippet,
            )
        )

    verified_count = sum(1 for c in claim_results if c.verified)
    total_claims = len(claim_results)
    faithfulness_score = round(verified_count / max(total_claims, 1), 4)

    return {
        "faithfulness_score": faithfulness_score,
        "total_claims": total_claims,
        "verified_count": verified_count,
        "unverified_count": total_claims - verified_count,
        "claim_details": [
            {
                "claim": c.claim,
                "verified": c.verified,
                "confidence": c.confidence,
                "supporting_snippet": c.supporting_snippet,
            }
            for c in claim_results
        ],
    }
