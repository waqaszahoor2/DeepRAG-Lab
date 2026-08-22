"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Bot,
  User,
  Cpu,
  Sparkles,
  FileText,
  Globe,
  Loader2,
  AlertCircle,
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Copy,
  Check,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Code,
  Lightbulb,
  Paperclip,
  Search,
  Edit2,
  X,
} from "lucide-react";
import SourceCitation from "@/components/SourceCitation";
import { sendChatMessage, uploadDocument, SourceCitation as SourceCitationType, DocumentItem } from "@/lib/api";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  mode?: string;
  confidence?: number;
  sources?: SourceCitationType[];
  attachedDoc?: string;
  timestamp: string;
}

interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

const QUICK_PROMPT_SUGGESTIONS = [
  {
    icon: FileText,
    title: "Summarize Documents",
    prompt: "Can you summarize key points from my uploaded documents?",
  },
  {
    icon: Sparkles,
    title: "Explain RAG System",
    prompt: "What is RAG and how does vector search work?",
  },
  {
    icon: Code,
    title: "Write Code",
    prompt: "Write a Python script to fetch data from an API and parse JSON.",
  },
  {
    icon: Lightbulb,
    title: "Brainstorm Ideas",
    prompt: "Give me 5 innovative project ideas using AI and document search.",
  },
];

export default function ChatPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"auto" | "document_qa" | "general_ai">("auto");
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set default sidebar state based on screen width
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    }
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join("");
          setInput(transcript);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        rec.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleVoiceListen = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const toggleSpeakText = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);
      window.speechSynthesis.speak(utterance);
      setSpeakingMsgId(msgId);
    }
  };

  // Initialize Threads from Local Storage
  useEffect(() => {
    const saved = localStorage.getItem("deeprag_chat_threads");
    if (saved) {
      try {
        const parsed: ChatThread[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setThreads(parsed);
          setActiveThreadId(parsed[0].id);
          return;
        }
      } catch (e) {
        // ignore parse error
      }
    }

    const initialThread: ChatThread = {
      id: `thread_${Date.now()}`,
      title: "New Chat",
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    setThreads([initialThread]);
    setActiveThreadId(initialThread.id);
  }, []);

  // Save Threads to Local Storage when updated
  useEffect(() => {
    if (threads.length > 0) {
      localStorage.setItem("deeprag_chat_threads", JSON.stringify(threads));
    }
  }, [threads]);

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];
  const messages = activeThread ? activeThread.messages : [];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleCreateNewChat = () => {
    const newThread: ChatThread = {
      id: `thread_${Date.now()}`,
      title: "New Chat",
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = threads.filter((t) => t.id !== id);
    if (filtered.length === 0) {
      const freshThread: ChatThread = {
        id: `thread_${Date.now()}`,
        title: "New Chat",
        messages: [],
        updatedAt: new Date().toISOString(),
      };
      setThreads([freshThread]);
      setActiveThreadId(freshThread.id);
    } else {
      setThreads(filtered);
      if (activeThreadId === id) {
        setActiveThreadId(filtered[0].id);
      }
    }
  };

  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, title: editTitle.trim() } : t))
      );
    }
    setEditingThreadId(null);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile(file);
    setMode("document_qa");

    setUploadingDoc(true);
    try {
      await uploadDocument(file);
    } catch (err) {
      // safe client fallback
    } finally {
      setUploadingDoc(false);
    }
  };

  const submitQuery = async (queryText: string) => {
    if (!queryText.trim() || loading || !activeThread) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const currentDocName = attachedFile?.name;
    setInput("");
    setAttachedFile(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: queryText,
      attachedDoc: currentDocName,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThreadId) {
          const updatedMessages = [...t.messages, userMsg];
          const newTitle = t.title === "New Chat" ? queryText.slice(0, 24) + "..." : t.title;
          return {
            ...t,
            title: newTitle,
            messages: updatedMessages,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    setLoading(true);

    try {
      const res = await sendChatMessage(queryText, mode);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: res.answer,
        mode: res.mode,
        confidence: res.confidence_score,
        sources: res.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: [...t.messages, aiMsg],
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        })
      );
    } catch (err: any) {
      if (err.message === "Unauthorized") {
        router.push("/login");
        return;
      }
      const errorAiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "Unable to generate response. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: [...t.messages, errorAiMsg],
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    submitQuery(input);
  };

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden bg-slate-950 text-slate-100 relative">
      {/* Mobile Drawer Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* 1. ChatGPT Collapsible Left Chatbar (Responsive Sidebar Drawer on Mobile) */}
      <aside
        className={`${
          sidebarOpen
            ? "translate-x-0 w-72 md:w-64 lg:w-72"
            : "-translate-x-full md:translate-x-0 md:w-0"
        } fixed md:static inset-y-0 left-0 z-50 md:z-20 transition-all duration-300 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 overflow-hidden shadow-2xl md:shadow-none`}
      >
        {/* Top + New Chat Button & Close Icon */}
        <div className="p-3 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <button
            onClick={handleCreateNewChat}
            className="flex-1 py-2.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Search Conversations Input */}
        <div className="px-3 pt-3">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Chat Threads History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 mt-1">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Recent Conversations
          </div>
          {filteredThreads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            const isEditing = editingThreadId === thread.id;

            return (
              <div
                key={thread.id}
                onClick={() => {
                  setActiveThreadId(thread.id);
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  isActive
                    ? "bg-indigo-600/20 text-white border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => handleSaveRename(thread.id, e)}
                    className="flex items-center gap-1 w-full"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-slate-950 px-2 py-1 rounded text-white text-xs border border-indigo-500 focus:outline-none"
                    />
                    <button type="submit" className="text-emerald-400 p-1">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 truncate">
                      <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                      <span className="truncate">{thread.title}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleStartRename(thread.id, thread.title, e)}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteThread(thread.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span>DeepRAG AI Engine</span>
        </div>
      </aside>

      {/* 2. Main Chat Workspace — Occupies 100% Mobile Width */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        {/* Top Action Header */}
        <header className="h-12 border-b border-slate-800/80 px-3 sm:px-4 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title="Toggle Sidebar"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <span className="text-xs font-semibold text-white truncate max-w-[140px] sm:max-w-xs">
              {activeThread ? activeThread.title : "AI Chat Workspace"}
            </span>
          </div>

          {/* Mode Selector Switcher */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
            <button
              onClick={() => setMode("auto")}
              className={`px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all ${
                mode === "auto"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3 h-3 text-indigo-200" />
              <span className="hidden sm:inline">Auto</span>
            </button>

            <button
              onClick={() => setMode("document_qa")}
              className={`px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all ${
                mode === "document_qa"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-3 h-3 text-purple-200" />
              <span className="hidden sm:inline">Doc AI</span>
            </button>

            <button
              onClick={() => setMode("general_ai")}
              className={`px-2 py-1 rounded-md flex items-center gap-1 font-medium transition-all ${
                mode === "general_ai"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="w-3 h-3 text-blue-200" />
              <span className="hidden sm:inline">General AI</span>
            </button>
          </div>
        </header>

        {/* Messages Stream Container — Full 100% Mobile Reading Width */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 max-w-5xl mx-auto w-full">
          {messages.length === 0 ? (
            /* ChatGPT Empty Hero View with Quick Suggestions */
            <div className="h-full flex flex-col items-center justify-center text-center my-auto py-8 sm:py-12 px-2">
              <div className="p-3.5 sm:p-4 rounded-3xl bg-indigo-600/20 text-indigo-400 mb-3 sm:mb-4 border border-indigo-500/30">
                <Bot className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-white mb-1.5">What can I help with today?</h2>
              <p className="text-xs text-slate-400 max-w-md mb-6 sm:mb-8">
                Ask questions about your uploaded documents, generate code, or explore general knowledge topics.
              </p>

              {/* Prompt Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-2xl text-left">
                {QUICK_PROMPT_SUGGESTIONS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => submitQuery(item.prompt)}
                      className="p-3 rounded-2xl glass-panel hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all text-slate-200 text-xs flex flex-col justify-between gap-2 group"
                    >
                      <div className="flex items-center gap-2 font-semibold text-white">
                        <Icon className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span>{item.title}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">{item.prompt}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "ai" && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`transition-all ${
                    msg.sender === "user"
                      ? "w-auto max-w-[88%] sm:max-w-[75%] lg:max-w-[70%] bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 sm:px-5 sm:py-4 shadow-md shadow-indigo-600/10"
                      : "w-full max-w-[98%] sm:max-w-[90%] lg:max-w-[85%] glass-panel bg-slate-900/70 border border-slate-800/80 rounded-2xl rounded-tl-sm p-3.5 sm:p-5 text-slate-100"
                  }`}
                >
                  {/* Document Attachment Badge */}
                  {msg.attachedDoc && (
                    <div className="mb-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="truncate max-w-[180px]">{msg.attachedDoc}</span>
                    </div>
                  )}

                  {/* Clean Answer Content */}
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {/* Document QA Sources & Confidence rendering */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-800/60">
                      <SourceCitation sources={msg.sources} />
                      {msg.confidence !== undefined && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Confidence: {Math.round(msg.confidence * 100)}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Unobtrusive Bottom Corner Footer for Actions & Timestamp */}
                  <div
                    className={`flex items-center justify-between gap-4 mt-2.5 pt-1.5 ${
                      msg.sender === "ai" ? "border-t border-slate-800/40" : ""
                    }`}
                  >
                    {msg.sender === "ai" ? (
                      <div className="flex items-center gap-1.5">
                        {/* Text to Speech Voice Output */}
                        <button
                          onClick={() => toggleSpeakText(msg.id, msg.text)}
                          className={`transition-colors p-1 rounded-md hover:bg-slate-800 ${
                            speakingMsgId === msg.id ? "text-indigo-400" : "text-slate-400 hover:text-white"
                          }`}
                          title={speakingMsgId === msg.id ? "Stop voice reading" : "Listen to response"}
                        >
                          {speakingMsgId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Copy Message Button */}
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800"
                          title="Copy message"
                        >
                          {copiedMessageId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div />
                    )}

                    <span
                      className={`text-[10px] ml-auto ${
                        msg.sender === "user" ? "text-indigo-200/80" : "text-slate-400/70"
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>

                {msg.sender === "user" && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Professional ChatGPT-Style Thinking Indicator */}
          {loading && (
            <div className="flex gap-3.5 justify-start">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="glass-panel border border-slate-800 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-slate-400">
                <span className="font-medium text-slate-300">Thinking</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ChatGPT Style Fixed Bottom Input Field with Attachment & Voice mic buttons */}
        <div className="shrink-0 p-3 sm:p-4 max-w-5xl mx-auto w-full">
          {/* Attached Document Preview Chip */}
          {attachedFile && (
            <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-xs text-indigo-300 max-w-fit">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span className="font-medium truncate max-w-[200px]">{attachedFile.name}</span>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="relative flex items-center">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.docx,.txt,.csv,.md"
              className="hidden"
            />

            {/* Document Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDoc}
              className="absolute left-2.5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Attach Document (PDF, DOCX, TXT, CSV, MD)"
            >
              {uploadingDoc ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening
                  ? "Listening to your voice command..."
                  : "Ask anything about your documents or general topics..."
              }
              className={`w-full pl-11 pr-24 py-3 sm:py-3.5 rounded-2xl bg-slate-900/90 border ${
                isListening ? "border-indigo-500 ring-2 ring-indigo-500/30" : "border-slate-800"
              } text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-xs sm:text-sm shadow-xl`}
            />

            {/* Voice Command Button */}
            <button
              type="button"
              onClick={toggleVoiceListen}
              className={`absolute right-11 p-2 rounded-lg transition-all ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title={isListening ? "Stop voice listening" : "Give voice command (Mic)"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 px-2">
            <span className="flex items-center gap-1">
              <Mic className="w-3 h-3 text-indigo-400" />
              <span>Voice commands & File attachment enabled</span>
            </span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </main>
    </div>
  );
}
