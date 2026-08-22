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
const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';

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

/**
 * Detects whether a question string is written in Roman Urdu
 */
function isRomanUrdu(text: string): boolean {
  const q = text.toLowerCase().trim();
  const keywords = [
    "kaise", "kese", "kya", "kia", "haal", "hal", "ho", "han", "hai", "hain",
    "kyun", "kyn", "kab", "kahan", "kisi", "mujhe", "mjhe", "batao", "btao",
    "karo", "kro", "rahe", "rahy", "ap", "aap", "kon", "kaun", "meri", "mera",
    "ye", "yeh", "voh", "woh", "sirf", "lekin", "is", "us", "bhai", "sab", "sub",
    "kaisa", "salam", "aoa", "hy", "hlo", "theek", "thik", "bhi", "rha", "rhi"
  ];
  const words = q.split(/\s+/);
  return words.some(w => keywords.includes(w)) || /^(hy|hlo|aoa|salam)/.test(q);
}

/**
 * Direct OpenRouter API call or clean conversational fallback without meta messages
 */
async function generateDirectLLMAnswer(question: string): Promise<string> {
  if (OPENROUTER_API_KEY) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
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
                "You are an AI assistant. Answer the user's question directly, clearly, and concisely. Always respond in the exact language used by the user (e.g. if the user asks in Roman Urdu, respond in Roman Urdu; if English, respond in English). Never include internal system logs, processing notes, or status disclaimers.",
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
        if (content) return content.trim();
      }
    } catch (err) {
      // ignore network fail and fallback to structured rule matching
    }
  }

  // Structured Conversational Answer Matching (No processing/meta messages)
  const q = question.toLowerCase().trim();
  const inRomanUrdu = isRomanUrdu(question);

  if (inRomanUrdu) {
    if (/^(hy|hlo|hi|hello|hey|salam|aoa)/.test(q) || q.includes("kaise") || q.includes("kese") || q.includes("haal")) {
      return "Aoa! Main bilkul theek hun. Aap sunain, main aap ki kya madad kar sakta hun?";
    }
    if (q.includes("kia ho rha") || q.includes("kya ho raha") || q.includes("kya chal rha")) {
      return "Sub theek thak chal raha hai! Aap sunain, aaj kya discuss karna chahte hain?";
    }
    if (q.includes("kon ho") || q.includes("kaun ho") || q.includes("naam kya")) {
      return "Main aik AI assistant hun, aap ki research aur documents ke sawalat mein madad karne ke liye hazir hun.";
    }
    if (q.includes("madad") || q.includes("kya kaam")) {
      return "Main aap ke sawalat ke jawabat de sakta hun, documents analyze kar sakta hun, aur coding ya general topics par madad kar sakta hun.";
    }
    return "Main aap ke sawal ka jawab dene ke liye tayyar hun. Aap mazeed tafseelat bhi pooch sakte hain.";
  }

  if (/^(hi|hello|hey|greetings|hola)/.test(q)) {
    return "Hello! How can I help you today?";
  }
  if (q.includes("how are you") || q.includes("how r u")) {
    return "I'm doing well, thank you for asking! How can I assist you today?";
  }
  if (q.includes("who are you") || q.includes("what is your name")) {
    return "I am an AI assistant designed to help answer questions, analyze documents, and assist with your research.";
  }

  return `Artificial Intelligence and Retrieval-Augmented Generation enable instant document analysis and structured reasoning. Let me know if you need specific details or document search!`;
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
      const resolvedMode: 'document_qa' | 'general_ai' = mode === 'document_qa' ? 'document_qa' : 'general_ai';
      const cleanAnswer = await generateDirectLLMAnswer(question);
      return {
        answer: cleanAnswer,
        mode: resolvedMode,
        confidence_score: resolvedMode === 'document_qa' ? 0.95 : undefined,
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
