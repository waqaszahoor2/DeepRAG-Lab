"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History, MessageSquare, Award, Clock } from "lucide-react";
import { fetchChatHistory, ChatHistoryItem } from "@/lib/api";

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetchChatHistory();
        setHistory(res.history);
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <History className="w-7 h-7 text-indigo-400" />
          Chat History
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review your previous document queries and AI responses
        </p>
      </div>

      {history.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 border border-slate-800">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium text-slate-300">No chat history available</p>
          <p className="text-xs text-slate-500 mt-1">Start a chat to save query history</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item.id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="px-2.5 py-0.5 rounded bg-indigo-600/20 text-indigo-400 text-xs font-mono uppercase">
                  {item.mode}
                </span>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {item.confidence_score !== undefined && item.confidence_score !== null && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Award className="w-3.5 h-3.5" />
                      {Math.round(item.confidence_score * 100)}%
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Question</p>
                <p className="text-sm font-semibold text-white mt-0.5">{item.question}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Answer</p>
                <p className="text-sm text-slate-300 mt-0.5 leading-relaxed">{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
