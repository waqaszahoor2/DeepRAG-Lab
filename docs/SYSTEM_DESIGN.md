
# DeepRAG Lab System Design

Modules:

backend/app/
- api: endpoints
- security: authentication and validation
- ingestion: document loaders
- embeddings: vector generation
- rag: retrieval pipeline
- llm: AI provider adapters

Supported providers:
- Gemini API
- OpenRouter API

Production upgrades:
- Qdrant/Pinecone
- PostgreSQL
- Cloud Storage
- GPU inference server
