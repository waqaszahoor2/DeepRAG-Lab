"""
DeepRAG Lab — Seed Demo Documents Script.

Seeds 3 sample documents into the vector store tagged with metadata {"demo": "true"}.
Allows unauthenticated users to test RAG QA in public demo mode immediately.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings
from app.embeddings.generator import generate_embeddings_batch
from app.ingestion.chunker import chunk_text
from app.vectorstore.chroma_store import get_vector_store

DEMO_DOCUMENTS = [
    {
        "document_id": "demo_doc_1",
        "document_name": "Attention Is All You Need (Transformer Paper).pdf",
        "pages": [
            {
                "page_number": 1,
                "text": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely."
            },
            {
                "page_number": 2,
                "text": "Self-attention, sometimes called intra-attention is an attention mechanism relating different positions of a single sequence in order to compute a representation of the sequence. Multi-Head Attention allows the model to jointly attend to information from different representation subspaces at different positions. Positional Encodings are added to the input embeddings at the bottoms of the encoder and decoder stacks."
            },
            {
                "page_number": 3,
                "text": "On the WMT 2014 English-to-German translation task, the Transformer achieves 28.4 BLEU, improving over the existing best results, including ensembles, by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new state-of-the-art single-model BLEU score of 41.8 after training for 3.5 days on 8 GPUs."
            }
        ]
    },
    {
        "document_id": "demo_doc_2",
        "document_name": "Retrieval-Augmented Generation (RAG) System Architecture Guide.pdf",
        "pages": [
            {
                "page_number": 1,
                "text": "Retrieval-Augmented Generation (RAG) optimizes the output of a large language model by referencing an authoritative knowledge base outside its training data sources before generating a response. RAG extends the already powerful capabilities of LLMs to specific domains or an organization's internal knowledge base without requiring model retraining."
            },
            {
                "page_number": 2,
                "text": "A standard RAG pipeline consists of five stages: Document Ingestion, Chunking, Embedding Generation, Vector Database Storage, and Query Retrieval. Dense vector search uses cosine similarity or Euclidean distance to retrieve top-k semantic chunks. Confidence scoring evaluates retrieval relevance and source coverage."
            },
            {
                "page_number": 3,
                "text": "Advanced RAG techniques include Corrective RAG (CRAG) with external web search fallback, GraphRAG with knowledge graph entity traversal, and hybrid dense-sparse BM25 retrieval. Page-level citation tracking enables users to audit LLM answers against raw source documents."
            }
        ]
    },
    {
        "document_id": "demo_doc_3",
        "document_name": "DeepRAG Lab Platform Specification & Enterprise Benchmarks.pdf",
        "pages": [
            {
                "page_number": 1,
                "text": "DeepRAG Lab is a production-ready enterprise RAG platform featuring multi-format document ingestion (PDF, DOCX, CSV, TXT, MD), dual vector store support (ChromaDB for local development, Qdrant for production), and tri-provider LLM failover (Google Gemini 2.5 Flash -> Z.AI GLM-4 -> OpenRouter)."
            },
            {
                "page_number": 2,
                "text": "Security features include JWT access and refresh token authentication, bcrypt password hashing, token-bucket per-IP rate limiting (60 requests per minute), magic byte signature file validation, and automated prompt-injection sanitization. Public Demo Mode allows users to explore RAG features without authentication."
            }
        ]
    }
]


async def seed_demo_data():
    print("[+] Seeding DeepRAG Lab Demo Documents into Vector Store...")
    settings = get_settings()
    store = get_vector_store()

    total_chunks_stored = 0

    for doc in DEMO_DOCUMENTS:
        doc_id = doc["document_id"]
        doc_name = doc["document_name"]

        all_chunks = []
        for page in doc["pages"]:
            page_chunks = chunk_text(
                text=page["text"],
                document_id=doc_id,
                page_number=page["page_number"],
                chunk_size=500,
                chunk_overlap=50,
            )
            all_chunks.extend(page_chunks)

        texts = [c.text for c in all_chunks]
        embeddings = await generate_embeddings_batch(texts)

        metadatas = [
            {
                "document_id": doc_id,
                "document_name": doc_name,
                "page_number": c.page_number,
                "chunk_index": c.position,
                "user_id": "demo_user",
                "demo": "true",
            }
            for c in all_chunks
        ]

        store.store(
            ids=[c.chunk_id for c in all_chunks],
            embeddings=embeddings,
            texts=texts,
            metadatas=metadatas,
        )

        total_chunks_stored += len(all_chunks)
        print(f"  [SUCCESS] Seeded '{doc_name}' ({len(all_chunks)} chunks)")

    print(f"[COMPLETE] Demo seeding complete! {total_chunks_stored} total vector chunks stored.")


if __name__ == "__main__":
    asyncio.run(seed_demo_data())
