"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Bot, User, Cpu, Sparkles, FileText, Globe, Loader2, AlertCircle } from "lucide-react";
import ConfidenceScore from "@/components/ConfidenceScore";
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

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am DeepRAG Assistant. Ask me anything about your uploaded documents or general topics.",
      mode: "document_qa",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"auto" | "document_qa" | "general_ai">("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setError(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await sendChatMessage(userText, mode);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: res.answer,
        mode: res.mode,
        confidence: res.confidence_score,
        sources: res.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      if (err.message === "Unauthorized") {
        router.push("/login");
        return;
      }
      setError(err.message || "Failed to process question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            AI RAG Workspace
          </h1>
          <p className="text-xs text-slate-400">
            Ask questions with citation verification and automated routing
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl glass-panel border border-slate-800 text-xs">
          <button
            onClick={() => setMode("auto")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
              mode === "auto"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto Classifier</span>
          </button>

          <button
            onClick={() => setMode("document_qa")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
              mode === "document_qa"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document QA Only</span>
          </button>

          <button
            onClick={() => setMode("general_ai")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
              mode === "general_ai"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>General AI</span>
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "ai" && (
              <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
            )}

            <div
              className={`max-w-3xl rounded-2xl p-5 ${
                msg.sender === "user"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "glass-panel border border-slate-800 text-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-xs font-semibold opacity-70">
                  {msg.sender === "user" ? "You" : "DeepRAG AI"}
                </span>

                {msg.sender === "ai" && (
                  <div className="flex items-center gap-2">
                    {msg.mode && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-400 text-[10px] font-mono uppercase border border-slate-700">
                        {msg.mode}
                      </span>
                    )}
                    <ConfidenceScore score={msg.confidence} />
                  </div>
                )}
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

              {msg.sources && msg.sources.length > 0 && (
                <SourceCitation sources={msg.sources} />
              )}

              <span className="block text-[10px] opacity-40 mt-3 text-right">
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === "user" && (
              <div className="w-9 h-9 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-4 justify-start">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="glass-panel border border-slate-800 p-4 rounded-2xl flex items-center gap-3 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Analyzing context & generating response...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Chat Input */}
      <form onSubmit={handleSend} className="shrink-0 pt-2">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents or general knowledge..."
            className="w-full pl-5 pr-14 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm shadow-xl"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2.5 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
