# DeepRAG Lab — Deployment Environment Variables Copy-Paste Guide

This document contains pre-configured environment variable blocks ready to copy directly into **Vercel** and your **Backend Host (Render / Railway / AWS / Docker)**.

---

## 1. 🌐 Vercel Environment Variables (Copy & Paste to Vercel)

Copy this single line and paste it into **Vercel Dashboard ➔ Project Settings ➔ Environment Variables**:

```env
NEXT_PUBLIC_API_URL=https://your-backend-api.onrender.com
```

*(Replace `https://your-backend-api.onrender.com` with your actual live backend URL after deploying backend).*

---

## 2. ⚡ Backend Host Environment Variables (Copy & Paste to Render / Railway / Docker)

Copy this entire block and paste it into your backend hosting provider's Environment Variables panel:

```env
# ── General Configuration ─────────────────────────────────────
APP_NAME=DeepRAG Lab
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# ── LLM Provider API Keys ──────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004

OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=google/gemini-2.5-flash
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

LLM_PRIMARY_PROVIDER=gemini
LLM_TIMEOUT_SECONDS=30
LLM_MAX_RETRIES=3

# ── Security & Authentication ──────────────────────────────────
JWT_SECRET=super_secret_deeprag_lab_jwt_token_key_1234567890_security_key
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# ── CORS Origins (Set to your Vercel URL) ─────────────────────
ALLOWED_ORIGINS=["https://your-app.vercel.app","http://localhost:3000"]

# ── Rate Limiting ─────────────────────────────────────────────
RATE_LIMIT_REQUESTS=60
RATE_LIMIT_WINDOW_SECONDS=60

# ── Storage & Vector DB ───────────────────────────────────────
DATABASE_URL=sqlite+aiosqlite:///./data/deeprag.db
VECTOR_DB_PROVIDER=chroma
CHROMA_PERSIST_DIR=./data/chroma_db
CHROMA_COLLECTION_NAME=deeprag_documents

# ── File Upload Guardrails ────────────────────────────────────
UPLOAD_DIR=./data/uploads
MAX_FILE_SIZE_MB=50
ALLOWED_EXTENSIONS=[".pdf",".docx",".txt",".csv",".md"]

# ── Chunking & Retrieval ──────────────────────────────────────
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
RETRIEVAL_TOP_K=5
RETRIEVAL_SCORE_THRESHOLD=0.3
```
