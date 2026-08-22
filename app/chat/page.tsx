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
} from "lucide-react";
import SourceCitation from "@/components/SourceCitation";
import { sendChatMessage, SourceCitation as SourceCitationType } from "@/lib/api";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  mode?: string;
  confidence?: number;
  sources?: SourceCitationType[];
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"auto" | "document_qa" | "general_ai">("auto");
  const [loading, setLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const submitQuery = async (queryText: string) => {
    if (!queryText.trim() || loading || !activeThread) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setInput("");

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: queryText,
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

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden bg-slate-950 text-slate-100">
      {/* 1. ChatGPT Collapsible Left Chatbar (Sidebar) */}
      <div
        className={`${
          sidebarOpen ? "w-64 sm:w-72" : "w-0"
        } transition-all duration-300 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 overflow-hidden relative z-20`}
      >
        {/* Top + New Chat Button */}
        <div className="p-3 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <button
            onClick={handleCreateNewChat}
            className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Chatbar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Threads History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Recent Conversations
          </div>
          {threads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            return (
              <div
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  isActive
                    ? "bg-indigo-600/20 text-white border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                  <span className="truncate">{thread.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteThread(thread.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
                  title="Delete Chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span>DeepRAG AI Engine</span>
        </div>
      </div>

      {/* 2. Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Action Header */}
        <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                title="Open Chatbar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <span className="text-xs font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
              {activeThread ? activeThread.title : "AI Chat Workspace"}
            </span>
          </div>

          {/* Mode Selector Pills */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
            <button
              onClick={() => setMode("auto")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-all ${
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
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-all ${
                mode === "document_qa"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-3 h-3 text-purple-200" />
              <span className="hidden sm:inline">Doc QA</span>
            </button>

            <button
              onClick={() => setMode("general_ai")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-all ${
                mode === "general_ai"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="w-3 h-3 text-blue-200" />
              <span className="hidden sm:inline">General AI</span>
            </button>
          </div>
        </div>

        {/* Messages Stream Container — Full width ChatGPT responsive container */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto w-full">
          {messages.length === 0 ? (
            /* ChatGPT Empty Hero View with Quick Suggestions */
            <div className="h-full flex flex-col items-center justify-center text-center my-auto py-12">
              <div className="p-4 rounded-3xl bg-indigo-600/20 text-indigo-400 mb-4 border border-indigo-500/30">
                <Bot className="w-10 h-10" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">What can I help with today?</h2>
              <p className="text-xs text-slate-400 max-w-md mb-8">
                Ask questions about your uploaded documents, generate code, or explore general knowledge topics.
              </p>

              {/* Prompt Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
                {QUICK_PROMPT_SUGGESTIONS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => submitQuery(item.prompt)}
                      className="p-3.5 rounded-2xl glass-panel hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all text-slate-200 text-xs flex flex-col justify-between gap-2 group"
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
                className={`flex gap-3 sm:gap-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "ai" && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                )}

                <div
                  className={`transition-all ${
                    msg.sender === "user"
                      ? "w-auto max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4.5 py-3.5 sm:px-5 sm:py-4 shadow-md shadow-indigo-600/10"
                      : "w-full max-w-[95%] sm:max-w-[90%] lg:max-w-[85%] glass-panel bg-slate-900/70 border border-slate-800/80 rounded-2xl rounded-tl-sm p-4 sm:p-5 text-slate-100"
                  }`}
                >
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
                    className={`flex items-center justify-between gap-4 mt-3 pt-2 ${
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
                  <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4.5 h-4.5" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Professional ChatGPT-Style Thinking Indicator */}
          {loading && (
            <div className="flex gap-3.5 justify-start">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
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

        {/* ChatGPT Style Fixed Bottom Input Field with Voice Mic Command Button */}
        <div className="shrink-0 p-4 max-w-5xl mx-auto w-full">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening
                  ? "Listening to your voice command..."
                  : "Ask anything about your documents or general topics..."
              }
              className={`w-full pl-4 pr-24 py-3.5 rounded-2xl bg-slate-900/90 border ${
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
              <span>Voice commands & Text-to-Speech active</span>
            </span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
}
