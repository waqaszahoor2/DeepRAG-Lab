# DeepRAG Lab — API Reference

Base Endpoint: `/api/v1`

## Health & Status

### `GET /api/v1/health`
Liveness check.

### `GET /api/v1/health/ready`
Readiness probe testing API key status and database connections.

---

## Authentication

### `POST /api/v1/auth/register`
Register new account.
- **Body**: `{ "email": "user@example.com", "username": "alex", "password": "Password123!" }`
- **Returns**: `{ "access_token": "...", "refresh_token": "...", "token_type": "bearer" }`

### `POST /api/v1/auth/login`
Authenticate user.
- **Body**: `{ "email": "user@example.com", "password": "Password123!" }`
- **Returns**: `{ "access_token": "...", "refresh_token": "...", "token_type": "bearer" }`

### `GET /api/v1/auth/me`
Get current profile. Requires `Authorization: Bearer <token>`.

---

## Documents

### `POST /api/v1/documents/upload`
Upload document for processing & indexing.
- **Header**: `Authorization: Bearer <token>`
- **Form Data**: `file` (Multipart)
- **Returns**: `DocumentResponse` with `chunk_count` and `status`.

### `GET /api/v1/documents`
List user documents.

### `DELETE /api/v1/documents/{id}`
Delete document and remove associated vectors from vector store.

---

## Chat

### `POST /api/v1/chat`
Execute RAG query or general AI interaction.
- **Header**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "question": "What is the key takeaway in section 2?",
    "mode": "auto",
    "document_ids": ["optional_doc_id"]
  }
  ```
- **Returns**:
  ```json
  {
    "answer": "...",
    "mode": "document_qa",
    "confidence_score": 0.92,
    "sources": [
      {
        "document_id": "...",
        "document_name": "annual_report.pdf",
        "page_number": 4,
        "text_snippet": "...",
        "relevance_score": 0.88
      }
    ],
    "query_id": "..."
  }
  ```

### `GET /api/v1/chat/history`
Retrieve past chat interactions.
