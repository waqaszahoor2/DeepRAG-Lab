# DeepRAG Lab — Execution Workflow

## 1. Document Ingestion Workflow

```
[ User Uploads File ]
          │
          ▼
[ File Validation ] ──► (Magic Bytes Check, Size Limit < 50MB, Whitelist Ext)
          │
          ▼
[ Text Extraction ] ──► (pdfplumber / python-docx / csv / txt / md)
          │
          ▼
[ Text Cleaning ] ──► (Unicode NFC, Strip Control Chars, Whitespace Collapse)
          │
          ▼
[ Chunking ] ──► (Recursive Paragraph Splitter, 1000 size, 200 overlap)
          │
          ▼
[ Embedding Generation ] ──► (Gemini text-embedding-004)
          │
          ▼
[ Vector Storage ] ──► (ChromaDB / Qdrant with Page & Document Metadata)
```

## 2. Query Answering Workflow

```
[ User Question ]
        │
        ▼
[ Input Sanitizer ] ──► (Length Check, HTML Strip, Injection Detection)
        │
        ▼
[ Query Classifier ]
        │
        ├───────────────────────────────┐
        ▼                               ▼
 [ Mode 1: Document QA ]       [ Mode 2: General AI ]
        │                               │
 Embed Question                  Direct LLM Prompt
        │                               │
 Similarity Search                      │
 (Top-5 Chunks)                         │
        │                               │
 Context Assembly                       │
 + Citations                            │
        │                               │
        └───────────────┬───────────────┘
                        ▼
                [ LLM Router ]
             (Gemini ➔ OpenRouter)
                        │
                        ▼
             [ Response Formatting ]
             - Text Answer
             - Page-Level Citations
             - Confidence Score (0.0 – 1.0)
```
