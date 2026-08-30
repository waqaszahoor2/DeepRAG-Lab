# DeepRAG Lab — Production AI RAG Platform

DeepRAG Lab is an enterprise-ready Retrieval-Augmented Generation (RAG) platform designed to ingest multi-format documents (PDF, DOCX, CSV, TXT, Markdown), split them into semantic chunks, generate vector embeddings, and answer queries with exact page-level citations, source verification, and confidence scoring.

---

## 🌟 Key Features

1. **Multi-Format Document Ingestion**:
   - PDF (with page-by-page extraction via `pdfplumber`)
   - DOCX (heading-preserved structure & table parsing via `python-docx`)
   - CSV (header-to-value key-value pairing for semantic search)
   - TXT & Markdown (UTF-8 / Latin-1 encoding detection)

2. **Automated AI RAG Pipeline**:
   - Recursive character text chunking with paragraph boundary preservation
   - Gemini `text-embedding-004` vector embedding generation
   - Dual vector database support: **ChromaDB** (dev) & **Qdrant** (prod)
   - Cosine similarity search with score thresholding & metadata filtering

3. **Multi-Provider LLM System with Automatic Failover**:
   - **Primary**: Google Gemini API (`gemini-2.5-flash`)
   - **Fallback**: OpenRouter API (`google/gemini-2.5-flash`)
   - Automatic retry with exponential backoff & timeout guards

4. **AI Decision Query Router**:
   - Automatic classification of questions into `Document QA` vs `General AI`
   - Strict context enforcement for document queries to prevent hallucination

5. **3D Next.js SaaS Interface**:
   - Interactive Three.js landing page with floating AI core sphere & neural particle cloud
   - Modern Glassmorphism UI built with Framer Motion & Tailwind CSS
   - Source citation inspector & visual confidence rating badge

6. **Production Security & Auth**:
   - JWT Access & Refresh token authentication
   - Bcrypt password hashing
   - Per-IP token-bucket rate limiting middleware
   - Upload file magic byte signature validation & size limits
   - Input sanitization & prompt-injection detection

---

## 🏗 System Architecture

```
User Browser (Next.js 14 Frontend)
       │
       │ HTTP / REST API (JWT)
       ▼
FastAPI Gateway & Security Layer (Rate Limiter, Auth, CORS, Sanitizer)
       │
       ├──────────────────────────┐
       ▼                          ▼
Document Upload Route       Chat Query Route
       │                          │
  File Validator             Query Classifier
       │                     (Doc QA vs General)
 Extractors (PDF/DOCX/CSV)       │
       │                   ┌──────┴──────┐
 Clean & Chunk             ▼             ▼
       │              RAG Pipeline   General AI
 Embeddings (Gemini)       │             │
       │             Vector Store        │
       ▼              (Chroma/Qdrant)    │
  Vector DB                │             │
  Storage                  └──────┬──────┘
                                  ▼
                          LLM Router
                     (Gemini ➔ OpenRouter)
                                  │
                                  ▼
                         Response + Citations
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (optional for containerized setup)
- Gemini API Key / OpenRouter API Key

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY and JWT_SECRET

# Run FastAPI server
uvicorn app.main:app --reload --port 8000
```

Backend will run at `http://127.0.0.1:8000`. OpenAPI docs available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup

```bash
# In project root:
cp .env.local.example .env.local

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend will run at `http://localhost:3000`.

---

## 🧪 Running Tests

```bash
cd backend
pytest -v
```

---

## 🐳 Docker Deployment

```bash
# Build and run using Docker Compose
docker-compose up --build
```

---

## 📚 Documentation Links

- [System Architecture](docs/SYSTEM_ARCHITECTURE.md)
- [Workflow Guide](docs/WORKFLOW.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Security Guide](docs/SECURITY.md)

---

## 🛣 Future Roadmap

- [ ] Voice Assistant integration (Speech-to-text / Text-to-speech)
- [ ] Multimodal image generation & visual analysis
- [ ] Multi-tenant workspace management
- [ ] AWS / Railway cloud deployment templates
