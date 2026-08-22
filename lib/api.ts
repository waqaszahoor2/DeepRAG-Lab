export interface User {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  chunk_count: number;
  status: string;
  created_at: string;
}

export interface SourceCitation {
  document_id: string;
  document_name: string;
  chunk_id: string;
  page_number?: number;
  text_snippet: string;
  relevance_score: number;
}

export interface ChatResponse {
  answer: string;
  mode: 'document_qa' | 'general_ai';
  confidence_score?: number;
  sources: SourceCitation[];
  query_id: string;
}

export interface ChatHistoryItem {
  id: string;
  question: string;
  answer: string;
  mode: string;
  confidence_score?: number;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function registerUser(email: string, username: string, password: string) {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Registration failed');
  }
  return res.json();
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Login failed');
  }
  return res.json();
}

export async function fetchUserProfile(): Promise<User> {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function uploadDocument(file: File): Promise<DocumentItem> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/v1/documents/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function fetchDocuments(): Promise<{ documents: DocumentItem[]; total: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/documents`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return await res.json();
  } catch (err: any) {
    return { documents: [], total: 0 };
  }
}

export async function deleteDocument(documentId: string) {
  const res = await fetch(`${API_BASE}/api/v1/documents/${documentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete document');
  return res.json();
}

export async function sendChatMessage(
  question: string, 
  mode: 'auto' | 'document_qa' | 'general_ai' = 'auto',
  document_ids?: string[]
): Promise<ChatResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ question, mode, document_ids }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Chat request failed');
    }

    return await res.json();
  } catch (err: any) {
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      // Smart Client Fallback Response when local FastAPI server is offline
      const resolvedMode: 'document_qa' | 'general_ai' = mode === 'document_qa' ? 'document_qa' : 'general_ai';
      return {
        answer: `I received your question: "${question}".\n\nNote: To retrieve live document chunks and vector embeddings, please start your local FastAPI backend server (http://localhost:8000). Currently responding in Demo AI mode.`,
        mode: resolvedMode,
        confidence_score: 0.95,
        sources: [],
        query_id: `query_${Date.now()}`,
      };
    }
    throw err;
  }
}

export async function fetchChatHistory(): Promise<{ history: ChatHistoryItem[]; total: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/chat/history`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return await res.json();
  } catch (err: any) {
    return { history: [], total: 0 };
  }
}
