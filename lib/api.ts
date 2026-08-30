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
  stage?: string;
  progress?: number;
  error_message?: string | null;
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

export interface ChunkItem {
  chunk_id: string;
  page_number?: number;
  text: string;
  character_count: number;
}

export interface ChatResponse {
  answer: string;
  mode: 'document_qa' | 'general_ai';
  route?: string;
  selected_document_ids?: string[];
  confidence_score?: number;
  sources: SourceCitation[];
  query_id: string;
  provider?: string;
  sufficient_context?: boolean;
}

export interface ChatHistoryItem {
  id: string;
  question: string;
  answer: string;
  mode: string;
  confidence_score?: number;
  created_at: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message?: string | null;
}

export interface ConversationMessageItem {
  id: string;
  conversation_id: string;
  sender: 'user' | 'ai';
  text: string;
  mode?: string | null;
  confidence_score?: number | null;
  sources?: SourceCitation[] | null;
  provider?: string | null;
  sufficient_context?: boolean;
  created_at: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ConversationMessageItem[];
}

// ─── Configuration ───────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function readError(response: Response, fallback: string): Promise<ApiError> {
  let message = fallback;
  try {
    const payload = await response.json();
    if (typeof payload?.error === 'string') message = payload.error;
    else if (typeof payload?.detail === 'string') message = payload.detail;
  } catch {
    // Keep the safe fallback for empty or non-JSON responses.
  }
  return new ApiError(message, response.status);
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getDemoHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  let sessionId = localStorage.getItem('deeprag_demo_session');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('deeprag_demo_session', sessionId);
  }
  return {
    'Content-Type': 'application/json',
    'X-Demo-Session-ID': sessionId,
  };
}

// ─── Auth APIs ───────────────────────────────────────────────

export async function registerUser(email: string, username: string, password: string) {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) {
    throw await readError(res, 'Registration failed');
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
    throw await readError(res, 'Login failed');
  }
  return res.json();
}

export async function fetchUserProfile(): Promise<User> {
  const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw await readError(res, 'Unable to restore your session.');
  }
  return res.json();
}

// ─── Document APIs ───────────────────────────────────────────

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
    throw await readError(res, 'Upload failed');
  }
  return res.json();
}

export async function fetchDocuments(): Promise<{ documents: DocumentItem[]; total: number }> {
  const res = await fetch(`${API_BASE}/api/v1/documents`, { headers: getAuthHeaders() });
  if (!res.ok) throw await readError(res, 'Unable to load documents.');
  return await res.json();
}

export async function fetchDocument(documentId: string): Promise<DocumentItem> {
  const res = await fetch(`${API_BASE}/api/v1/documents/${documentId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw await readError(res, 'Unable to check document status.');
  return await res.json();
}

export async function retryDocument(documentId: string): Promise<DocumentItem> {
  const res = await fetch(`${API_BASE}/api/v1/documents/${documentId}/retry`, { method: 'POST', headers: getAuthHeaders() });
  if (!res.ok) throw await readError(res, 'Unable to retry document processing.');
  return await res.json();
}

export async function cancelDocument(documentId: string): Promise<DocumentItem> {
  const res = await fetch(`${API_BASE}/api/v1/documents/${documentId}/cancel`, { method: 'POST', headers: getAuthHeaders() });
  if (!res.ok) throw await readError(res, 'Unable to cancel document processing.');
  return await res.json();
}

export async function deleteDocument(documentId: string) {
  const res = await fetch(`${API_BASE}/api/v1/documents/${documentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete document');
  return res.json();
}

export async function fetchDocumentChunks(documentId: string): Promise<{ chunks: ChunkItem[]; total_chunks: number }> {
  const res = await fetch(`${API_BASE}/api/v1/documents/${documentId}/chunks`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch document chunks');
  return res.json();
}

// ─── Chat API (Standard & Streaming) ───────────────────────

export async function sendChatMessage(
  question: string,
  mode: 'auto' | 'document_qa' | 'general_ai' = 'auto',
  document_ids?: string[],
  is_demo: boolean = false,
  conversation_id?: string
): Promise<ChatResponse> {
  const headers: HeadersInit = is_demo ? getDemoHeaders() : getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/v1/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, mode, document_ids, is_demo, conversation_id }),
    });
  if (!res.ok) throw await readError(res, 'Unable to send your message.');
  const data = await res.json();
  if (!data.answer?.trim()) throw new ApiError('The assistant returned an empty response.', 502);
  return data as ChatResponse;
}

export async function sendChatMessageStream(
  question: string,
  onToken: (token: string) => void,
  onMeta: (meta: { provider?: string; mode?: string; route?: string; confidence?: number; sources?: SourceCitation[]; selected_document_ids?: string[]; sufficient_context?: boolean }) => void,
  mode: 'auto' | 'document_qa' | 'general_ai' = 'auto',
  document_ids?: string[],
  is_demo: boolean = false,
  signal?: AbortSignal,
  conversation_id?: string
): Promise<void> {
  const headers: HeadersInit = is_demo
    ? getDemoHeaders()
    : getAuthHeaders();

  const response = await fetch(`${API_BASE}/api/v1/chat/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ question, mode, document_ids, is_demo, conversation_id }),
    signal,
  });

  if (!response.ok || !response.body) {
    // Fallback to standard request if SSE stream fails
    const fallbackRes = await sendChatMessage(question, mode, document_ids, is_demo, conversation_id);
    onToken(fallbackRes.answer);
    onMeta({
      provider: fallbackRes.provider,
      mode: fallbackRes.mode,
      route: fallbackRes.route,
      confidence: fallbackRes.confidence_score,
      sources: fallbackRes.sources,
      selected_document_ids: fallbackRes.selected_document_ids,
      sufficient_context: fallbackRes.sufficient_context,
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const block of lines) {
      if (!block.trim()) continue;
      const eventLine = block.match(/^event:\s*(.+)$/m);
      const dataLine = block.match(/^data:\s*(.+)$/m);

      if (!eventLine || !dataLine) continue;

      const event = eventLine[1].trim();
      const rawData = dataLine[1].trim();

      let payload: any;
      try { payload = JSON.parse(rawData); } catch { continue; }
      if (event === "token" && payload.text) onToken(payload.text);
      else if (event === "meta") onMeta(payload);
      else if (event === "error") throw new Error(payload.error || "The assistant is temporarily unavailable.");
    }
  }
}

// ─── Conversations API (Thread Persistence) ──────────────────

export async function fetchConversations(): Promise<ConversationItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/conversations`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw await readError(res, 'Unable to load conversations.');
  return await res.json();
}

export async function createConversation(title: string = 'New Conversation'): Promise<ConversationItem> {
  const res = await fetch(`${API_BASE}/api/v1/conversations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw await readError(res, 'Unable to create conversation.');
  return await res.json();
}

export async function fetchConversation(conversationId: string): Promise<ConversationDetail> {
  const res = await fetch(`${API_BASE}/api/v1/conversations/${conversationId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw await readError(res, 'Unable to fetch conversation.');
  return await res.json();
}

export async function updateConversation(conversationId: string, title: string): Promise<ConversationItem> {
  const res = await fetch(`${API_BASE}/api/v1/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw await readError(res, 'Unable to update conversation title.');
  return await res.json();
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw await readError(res, 'Unable to delete conversation.');
}

export async function addConversationMessage(
  conversationId: string,
  message: {
    sender: string;
    text: string;
    mode?: string;
    confidence_score?: number;
    sources?: SourceCitation[];
    provider?: string;
    sufficient_context?: boolean;
  }
): Promise<ConversationMessageItem> {
  const res = await fetch(`${API_BASE}/api/v1/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(message),
  });
  if (!res.ok) throw await readError(res, 'Unable to save message to conversation.');
  return await res.json();
}

// ─── Chat History API ────────────────────────────────────────

export async function fetchChatHistory(): Promise<{ history: ChatHistoryItem[]; total: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/chat/history`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return await res.json();
  } catch {
    return { history: [], total: 0 };
  }
}
