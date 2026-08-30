"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Bookmark,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ChatSidebar from "./ChatSidebar";
import Conversation from "./Conversation";
import ChatComposer from "./ChatComposer";
import CitationPanel from "./CitationPanel";
import DemoBanner from "@/components/DemoBanner";
import AnswerVerificationModal from "@/components/AnswerVerificationModal";
import { MessageData } from "./Message";
import {
  sendChatMessageStream,
  uploadDocument,
  fetchDocuments,
  fetchConversations,
  createConversation,
  fetchConversation,
  deleteConversation,
  DocumentItem,
  SourceCitation,
} from "@/lib/api";

interface ChatThread {
  id: string;
  title: string;
  messages: MessageData[];
  updatedAt: string;
}

export default function ChatLayout() {
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const isDemo = !isAuthenticated || searchParams?.get("demo") === "true";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [citationPanelOpen, setCitationPanelOpen] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [mode, setMode] = useState<"auto" | "document_qa" | "general_ai">("auto");
  const [loading, setLoading] = useState(false);
  const streamControllerRef = useRef<AbortController | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

  // Citations & Hovering
  const [activeSources, setActiveSources] = useState<SourceCitation[]>([]);
  const [hoveredCitationIdx, setHoveredCitationIdx] = useState<number | null>(null);

  // Verification Modal State
  const [verifyMsgText, setVerifyMsgText] = useState("");
  const [verifySources, setVerifySources] = useState<SourceCitation[]>([]);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

  // Layout responsiveness initial setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
        setCitationPanelOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchDocuments().then((result) => setDocuments(result.documents)).catch(() => setDocuments([]));
  }, [isAuthenticated]);

  // Restore or init threads (Server sync for auth, localStorage for demo)
  useEffect(() => {
    if (isDemo) {
      const saved = localStorage.getItem("deeprag_chat_threads");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) {
            setThreads(parsed);
            setActiveThreadId(parsed[0].id);
            return;
          }
        } catch (err) {
          console.error("Failed to parse threads from local storage", err);
        }
      }

      const initThread: ChatThread = {
        id: `demo_${Date.now()}`,
        title: "Demo RAG Session",
        messages: [
          {
            id: "welcome_msg",
            sender: "ai",
            text: "Hello! You are in **Public Demo Mode**. Ask me anything about the 3 pre-loaded research papers (Transformer, RAG Architecture, or DeepRAG Benchmarks).",
            mode: "general_ai",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            provider: "Gemini 2.5 Flash",
            sufficientContext: true,
          },
        ],
        updatedAt: new Date().toISOString(),
      };
      setThreads([initThread]);
      setActiveThreadId(initThread.id);
    } else {
      // Authenticated — fetch threads from backend
      fetchConversations()
        .then(async (serverConvs) => {
          if (serverConvs && serverConvs.length > 0) {
            const initialList: ChatThread[] = serverConvs.map((c) => ({
              id: c.id,
              title: c.title,
              messages: [],
              updatedAt: c.updated_at,
            }));
            setThreads(initialList);
            const firstId = serverConvs[0].id;
            setActiveThreadId(firstId);

            // Fetch messages for the first conversation
            try {
              const detail = await fetchConversation(firstId);
              const mappedMessages: MessageData[] = (detail.messages || []).map((m) => ({
                id: m.id,
                sender: m.sender as "user" | "ai",
                text: m.text,
                mode: (m.mode as any) || "general_ai",
                confidence: m.confidence_score ?? undefined,
                sources: m.sources || [],
                provider: m.provider || undefined,
                sufficientContext: m.sufficient_context ?? true,
                timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              }));
              setThreads((prev) =>
                prev.map((t) => (t.id === firstId ? { ...t, messages: mappedMessages } : t))
              );
            } catch {
              // Ignore detail fetch errors
            }
          } else {
            // Create initial conversation on server
            try {
              const newConv = await createConversation("Enterprise AI Session");
              const initThread: ChatThread = {
                id: newConv.id,
                title: newConv.title,
                messages: [
                  {
                    id: "welcome_msg",
                    sender: "ai",
                    text: "Hello! I am **DeepRAG AI**, your enterprise document assistant. Ask me questions about your uploaded documents or general topics.",
                    mode: "general_ai",
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    provider: "Gemini 2.5 Flash",
                    sufficientContext: true,
                  },
                ],
                updatedAt: newConv.updated_at,
              };
              setThreads([initThread]);
              setActiveThreadId(initThread.id);
            } catch {
              const fallbackThread: ChatThread = {
                id: `thread_${Date.now()}`,
                title: "New AI Session",
                messages: [
                  {
                    id: "welcome_msg",
                    sender: "ai",
                    text: "Hello! I am **DeepRAG AI**, your enterprise document assistant. Ask me questions about your uploaded documents or general topics.",
                    mode: "general_ai",
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    provider: "Gemini 2.5 Flash",
                    sufficientContext: true,
                  },
                ],
                updatedAt: new Date().toISOString(),
              };
              setThreads([fallbackThread]);
              setActiveThreadId(fallbackThread.id);
            }
          }
        })
        .catch(() => {
          // Fallback to local thread
          const fallbackThread: ChatThread = {
            id: `thread_${Date.now()}`,
            title: "New AI Session",
            messages: [
              {
                id: "welcome_msg",
                sender: "ai",
                text: "Hello! I am **DeepRAG AI**, your enterprise document assistant.",
                mode: "general_ai",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ],
            updatedAt: new Date().toISOString(),
          };
          setThreads([fallbackThread]);
          setActiveThreadId(fallbackThread.id);
        });
    }
  }, [isDemo, isAuthenticated]);

  // Persist demo threads to local storage
  useEffect(() => {
    if (isDemo && threads.length > 0) {
      localStorage.setItem("deeprag_chat_threads", JSON.stringify(threads));
    }
  }, [isDemo, threads]);

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  // Sync citations from latest AI response
  useEffect(() => {
    if (activeThread && activeThread.messages.length > 0) {
      const lastAi = [...activeThread.messages].reverse().find((m) => m.sender === "ai" && m.sources && m.sources.length > 0);
      if (lastAi && lastAi.sources) {
        setActiveSources(lastAi.sources);
      }
    }
  }, [activeThread]);

  const handleSelectThread = async (id: string) => {
    setActiveThreadId(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }

    if (!isDemo && isAuthenticated) {
      const thread = threads.find((t) => t.id === id);
      if (thread && thread.messages.length === 0) {
        try {
          const detail = await fetchConversation(id);
          const mappedMessages: MessageData[] = (detail.messages || []).map((m) => ({
            id: m.id,
            sender: m.sender as "user" | "ai",
            text: m.text,
            mode: (m.mode as any) || "general_ai",
            confidence: m.confidence_score ?? undefined,
            sources: m.sources || [],
            provider: m.provider || undefined,
            sufficientContext: m.sufficient_context ?? true,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }));
          setThreads((prev) =>
            prev.map((t) => (t.id === id ? { ...t, messages: mappedMessages } : t))
          );
        } catch {
          // Ignore
        }
      }
    }
  };

  const handleCreateThread = async () => {
    if (!isDemo && isAuthenticated) {
      try {
        const newConv = await createConversation("New Conversation");
        const newThread: ChatThread = {
          id: newConv.id,
          title: newConv.title,
          messages: [
            {
              id: `msg_${Date.now()}`,
              sender: "ai",
              text: "New chat session started. Ask your question below!",
              mode: "general_ai",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ],
          updatedAt: newConv.updated_at,
        };
        setThreads((prev) => [newThread, ...prev]);
        setActiveThreadId(newThread.id);
        return;
      } catch (err) {
        console.error("Failed to create conversation on server", err);
      }
    }

    const newThread: ChatThread = {
      id: `thread_${Date.now()}`,
      title: "New Conversation",
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender: "ai",
          text: "New chat session started. Ask your question below!",
          mode: "general_ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
  };

  const handleDeleteThread = async (id: string) => {
    if (threads.length <= 1) return;
    if (!isDemo && isAuthenticated) {
      try {
        await deleteConversation(id);
      } catch (err) {
        console.error("Failed to delete conversation on server", err);
      }
    }
    const filtered = threads.filter((t) => t.id !== id);
    setThreads(filtered);
    if (activeThreadId === id) {
      setActiveThreadId(filtered[0].id);
    }
  };

  // Send message handler with SSE streaming
  const handleSendMessage = async (messageText: string, file?: File) => {
    if (!messageText.trim() || loading) return;

    let attachedName: string | undefined = undefined;
    if (file) {
      try {
        await uploadDocument(file);
        attachedName = file.name;
      } catch (err: any) {
        alert(err.message || "Failed to upload attached document");
        return;
      }
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMessage: MessageData = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: messageText,
      attachedDoc: attachedName,
      timestamp,
    };

    const aiMsgId = `ai_${Date.now()}`;
    const initialAiMessage: MessageData = {
      id: aiMsgId,
      sender: "ai",
      text: "",
      mode: mode === "auto" ? "document_qa" : mode,
      timestamp,
    };

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThreadId) {
          const isFirstUser = t.messages.filter((m) => m.sender === "user").length === 0;
          const newTitle = isFirstUser
            ? messageText.slice(0, 30) + (messageText.length > 30 ? "..." : "")
            : t.title;
          return {
            ...t,
            title: newTitle,
            messages: [...t.messages, userMessage, initialAiMessage],
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    setLoading(true);
    streamControllerRef.current = new AbortController();

    try {
      let accText = "";

      await sendChatMessageStream(
        messageText,
        (token) => {
          accText += token;
          setThreads((prev) =>
            prev.map((t) => {
              if (t.id === activeThreadId) {
                return {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === aiMsgId ? { ...m, text: accText } : m
                  ),
                };
              }
              return t;
            })
          );
        },
        (meta) => {
          if (meta.sources && meta.sources.length > 0) {
            setActiveSources(meta.sources);
            if (typeof window !== "undefined" && window.innerWidth >= 1024) {
              setCitationPanelOpen(true);
            }
          }

          setThreads((prev) =>
            prev.map((t) => {
              if (t.id === activeThreadId) {
                return {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === aiMsgId
                      ? {
                          ...m,
                          mode: (meta.mode as any) || m.mode,
                          confidence: meta.confidence,
                          sources: meta.sources || [],
                          provider: meta.provider,
                          sufficientContext: meta.sufficient_context ?? true,
                        }
                      : m
                  ),
                };
              }
              return t;
            })
          );
        },
        isDemo ? "document_qa" : mode,
        selectedDocumentIds.length ? selectedDocumentIds : undefined,
        isDemo,
        streamControllerRef.current.signal,
        !isDemo && isAuthenticated ? activeThreadId : undefined
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if ((error as any)?.name === "AbortError") return;
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: t.messages.map((m) =>
                m.id === aiMsgId
                  ? {
                      ...m,
                      text: m.text.trim() ? m.text : "The assistant is temporarily unavailable. Please try again shortly.",
                    }
                  : m
              ),
            };
          }
          return t;
        })
      );
    } finally {
      streamControllerRef.current = null;
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (!activeThread) return;
    const lastUserMsg = [...activeThread.messages].reverse().find((m) => m.sender === "user");
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.text);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-[#050816] text-slate-100 overflow-hidden relative">
      {/* ── Left Chat Sidebar ─────────────────────────────── */}
      <ChatSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        isOpen={sidebarOpen}
        isDemo={isDemo}
        onSelectThread={handleSelectThread}
        onCreateThread={handleCreateThread}
        onDeleteThread={handleDeleteThread}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {/* ── Main Conversation Workspace ───────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#050816] relative">
        {/* Minimal Header */}
        <header className="h-14 border-b border-white/5 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-[#050816]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Open chat history"
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>

            <h2 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {activeThread?.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              aria-label="Response mode"
              className="bg-[#111827] border border-white/5 text-slate-300 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500/50"
            >
              <option value="auto">🤖 Auto Router</option>
              <option value="document_qa">📚 Document RAG</option>
              <option value="general_ai">🌐 General AI</option>
            </select>

            {isAuthenticated && documents.length > 0 && (
              <select
                multiple
                aria-label="Select documents"
                value={selectedDocumentIds}
                onChange={(event) => setSelectedDocumentIds(Array.from(event.target.selectedOptions, (option) => option.value))}
                className="hidden max-w-40 rounded-xl border border-white/5 bg-[#111827] px-2 py-2 text-xs text-slate-300 outline-none sm:block"
                title="Filter by documents"
              >
                {documents.map((document) => <option key={document.id} value={document.id}>{document.original_filename}</option>)}
              </select>
            )}

            <button
              onClick={() => setCitationPanelOpen(!citationPanelOpen)}
              className={`p-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
                citationPanelOpen
                  ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/30"
                  : "bg-[#111827] text-slate-400 border-white/5 hover:text-white"
              }`}
              title="Toggle Sources Sidebar"
            >
              <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Sources ({activeSources.length})</span>
            </button>
          </div>
        </header>

        {/* Demo Banner */}
        {isDemo && (
          <div className="p-3 pb-0 max-w-[768px] mx-auto w-full">
            <DemoBanner />
          </div>
        )}

        {/* Centered Conversation Column (Max-Width 768px) */}
        <Conversation
          messages={activeThread?.messages || []}
          loading={loading}
          hoveredCitationIdx={hoveredCitationIdx}
          onHoverCitation={(idx) => setHoveredCitationIdx(idx)}
          onOpenSources={() => setCitationPanelOpen(true)}
          onSelectPrompt={(p) => handleSendMessage(p)}
          onRegenerate={handleRegenerate}
          onVerify={(msg) => {
            setVerifyMsgText(msg.text);
            setVerifySources(msg.sources || activeSources);
            setIsVerifyOpen(true);
          }}
        />

        {/* Floating Composer Bar */}
        <ChatComposer
          onSend={(text, file) => handleSendMessage(text, file)}
          loading={loading}
          isDemo={isDemo}
          onCancel={() => streamControllerRef.current?.abort()}
        />
      </main>

      {/* ── Right Source Panel ────────────────────────────── */}
      <aside
        className={`fixed inset-x-0 bottom-0 z-50 h-[min(72vh,560px)] w-full bg-[#050816] border-t border-white/10 backdrop-blur-md transition-transform duration-300 flex flex-col lg:inset-y-14 lg:bottom-auto lg:right-0 lg:left-auto lg:h-auto lg:w-80 lg:border-l lg:border-t-0 ${
          citationPanelOpen ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-x-full"
        } lg:relative lg:translate-y-0 ${citationPanelOpen ? "lg:flex" : "lg:hidden"}`}
      >
        <CitationPanel
          sources={activeSources}
          hoveredIndex={hoveredCitationIdx}
          onHoverSource={(idx) => setHoveredCitationIdx(idx)}
          onClose={() => setCitationPanelOpen(false)}
        />
      </aside>

      {/* Answer Verification Modal */}
      <AnswerVerificationModal
        answer={verifyMsgText}
        sources={verifySources}
        isOpen={isVerifyOpen}
        onClose={() => setIsVerifyOpen(false)}
      />
    </div>
  );
}
