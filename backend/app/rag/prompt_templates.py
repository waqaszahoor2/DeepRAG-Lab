"""
DeepRAG Lab — Prompt Templates.

Structured prompt templates for RAG and general AI modes.
Enforces citation format and insufficient context handling.
"""

from __future__ import annotations


RAG_SYSTEM_INSTRUCTION = """You are DeepRAG, an intelligent document assistant.
Your role is to answer questions ONLY using the provided context from the user's uploaded documents.

Rules:
1. Answer ONLY based on the provided context. Do not use external knowledge.
2. CITE every fact using [INDEX] format where INDEX matches the Source number from the context (e.g., [1], [2], [3]).
3. Be precise and factual. Every claim must reference at least one source.
4. Always respond in the exact same language used by the user in their question (e.g. if the user asks in Roman Urdu, respond in Roman Urdu; if English, respond in English; if Urdu script, respond in Urdu script).
5. If the provided context does NOT contain enough information to answer the user's question, respond EXACTLY with the prefix:
   INSUFFICIENT_CONTEXT: The uploaded documents do not contain information about [topic].
   Then, if you can infer a general answer, add: "However, here is what I know generally:" followed by a brief general knowledge answer.
6. At the end of your answer, provide a confidence score from 0.0 to 1.0 indicating how confident you are in the answer based on the available context.

Format your confidence score on a new line as: [CONFIDENCE: X.X]"""


RAG_PROMPT_TEMPLATE = """Answer the following question using ONLY the context provided below.
CITE every fact using [INDEX] format where INDEX matches the Source number.

=== CONTEXT ===
{context}
=== END CONTEXT ===

Question: {question}

Provide a detailed answer with [INDEX] source citations in the same language as the question. End with a confidence score."""


GENERAL_AI_SYSTEM_INSTRUCTION = """You are DeepRAG, a knowledgeable AI assistant.
You provide helpful, accurate, and well-structured answers to general questions.
Always respond in the exact same language used by the user in their question (e.g. if the user asks in Roman Urdu, respond in Roman Urdu; if English, respond in English; if Urdu script, respond in Urdu script).
Be concise but thorough. Use markdown formatting when appropriate."""


GENERAL_AI_PROMPT_TEMPLATE = """Question: {question}

Please provide a helpful and accurate answer in the exact language of the user's question."""


def build_rag_prompt(question: str, context_chunks: list[dict]) -> str:
    """Build a RAG prompt with context from retrieved chunks."""
    context_parts = []
    for i, chunk in enumerate(context_chunks, 1):
        source_info = f"[Source {i}: {chunk.get('document_name', 'Unknown')}"
        if chunk.get("page_number"):
            source_info += f", Page {chunk['page_number']}"
        source_info += "]"

        context_parts.append(f"{source_info}\n{chunk['text']}")

    context = "\n\n---\n\n".join(context_parts)

    return RAG_PROMPT_TEMPLATE.format(
        context=context,
        question=question,
    )


def build_general_prompt(question: str) -> str:
    """Build a general AI prompt."""
    return GENERAL_AI_PROMPT_TEMPLATE.format(question=question)
