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

// ─── Configuration ───────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  } catch {
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

// ─── LLM Direct Call (Real AI Answers) ──────────────────────
//
// Default primary LLM Provider: Google Gemini API
// Fallback LLM Provider: OpenRouter API

async function callGeminiDirectLLM(question: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: question }],
            },
          ],
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content && content.trim().length > 0) {
        return content.trim();
      }
    }
  } catch {
    // Network or parsing error — return null to try fallback
  }
  return null;
}

async function callOpenRouterLLM(question: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://deeprag-lab.vercel.app",
        "X-Title": "DeepRAG Lab",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-001",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful, expert AI assistant. Answer any user question directly, comprehensively, and accurately. Always respond in the exact same language the user used. If the user writes in English, respond in English. If the user writes in Roman Urdu, respond in Roman Urdu. If the user writes in Hindi, respond in Hindi. Provide detailed, real answers. Never refuse to answer. Never return placeholder text, status messages, or system disclaimers.",
          },
          {
            role: "user",
            content: question,
          },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content && content.trim().length > 0) {
        return content.trim();
      }
    }
  } catch {
    // Network or parsing error — return null
  }
  return null;
}

async function generateDirectLLMAnswer(question: string): Promise<string> {
  // Resolve keys: env var > localStorage
  const activeGeminiKey =
    GEMINI_API_KEY ||
    (typeof window !== 'undefined' ? localStorage.getItem('gemini_key') : null) ||
    '';

  const activeOpenRouterKey =
    OPENROUTER_API_KEY ||
    (typeof window !== 'undefined' ? localStorage.getItem('openrouter_key') : null) ||
    '';

  // Strategy 1 (DEFAULT PRIMARY): Google Gemini REST API Direct LLM Call
  if (activeGeminiKey) {
    const answer = await callGeminiDirectLLM(question, activeGeminiKey);
    if (answer) return answer;
  }

  // Strategy 2 (SECONDARY FALLBACK): OpenRouter API Call
  if (activeOpenRouterKey) {
    const answer = await callOpenRouterLLM(question, activeOpenRouterKey);
    if (answer) return answer;
  }

  // Both providers failed — throw real error (NO hardcoded fallback text)
  throw new Error("LLM_PROVIDERS_UNAVAILABLE");
}

// ─── Chat API (Primary flow) ────────────────────────────────

export async function sendChatMessage(
  question: string,
  mode: 'auto' | 'document_qa' | 'general_ai' = 'auto',
  document_ids?: string[]
): Promise<ChatResponse> {

  // ── Step 1: Try the FastAPI backend first ──
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const res = await fetch(`${API_BASE}/api/v1/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ question, mode, document_ids }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.answer && data.answer.trim().length > 0) {
        return data as ChatResponse;
      }
    }
  } catch {
    // Backend unreachable — fall through to direct Gemini/LLM
  }

  // ── Step 2: Direct Google Gemini / LLM call ──
  try {
    const resolvedMode: 'document_qa' | 'general_ai' =
      mode === 'document_qa' ? 'document_qa' : 'general_ai';

    const llmAnswer = await generateDirectLLMAnswer(question);

    return {
      answer: llmAnswer,
      mode: resolvedMode,
      confidence_score: undefined,
      sources: [],
      query_id: `query_${Date.now()}`,
    };
  } catch {
    // ── Step 3: Failure notification ──
    return {
      answer: "I'm unable to generate a response right now. Please check that the NEXT_PUBLIC_GEMINI_API_KEY environment variable is configured in your Vercel project settings, then redeploy.",
      mode: 'general_ai',
      confidence_score: undefined,
      sources: [],
      query_id: `error_${Date.now()}`,
    };
  }
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
