# DeepRAG Lab — System Architecture Specification

## Overview

DeepRAG Lab uses a decoupled microservice-ready architecture comprising a FastAPI backend and a Next.js 14 App Router frontend.

## Core Component Modules

```
backend/app/
├── api/             # FastAPI v1 routes, schema validation, endpoints
├── core/            # Config management (Pydantic Settings), logging, exceptions
├── db/              # SQLAlchemy async models (User, Document, ChatHistory)
├── embeddings/      # Gemini text-embedding-004 generator
├── ingestion/       # Extractors (PDF, DOCX, CSV, TXT, MD), cleaner, chunker
├── llm/             # Base provider interface, Gemini, OpenRouter fallback, Router
├── rag/             # Vector retrieval, query classifier, prompt templates, RAG orchestrator
├── security/        # JWT auth, bcrypt password hashing, rate limiter, file validator, sanitizer
└── vectorstore/     # Base interface, ChromaDB local store, Qdrant cloud/prod store
```

## Vector Store Strategy
- **Development**: Local persistent ChromaDB stored in `./data/chroma_db`.
- **Production**: Distributed Qdrant cluster connected via `QDRANT_URL` and API key.

## LLM Router Failover
```
Client Request
      │
      ▼
GeminiProvider (Primary)
      │
      ├── Success ──► Return Answer
      │
      └── Failure (Timeout/Error/Quota Exceeded)
            │
            ▼
      OpenRouterProvider (Fallback)
            │
            ├── Success ──► Return Answer
            │
            └── Failure ──► Raise LLMProviderError (502 Bad Gateway)
```
