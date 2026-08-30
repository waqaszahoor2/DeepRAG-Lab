"use client";

import { useState } from "react";
import { Plus, MessageSquare, Trash2, Search, X, Sparkles } from "lucide-react";

export interface ThreadItem {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatSidebarProps {
  threads: ThreadItem[];
  activeThreadId: string;
  isOpen: boolean;
  isDemo?: boolean;
  onSelectThread: (id: string) => void;
  onCreateThread: () => void;
  onDeleteThread: (id: string) => void;
  onCloseMobile: () => void;
}

export default function ChatSidebar({
  threads,
  activeThreadId,
  isOpen,
  isDemo,
  onSelectThread,
  onCreateThread,
  onDeleteThread,
  onCloseMobile,
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = threads.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside
      className={`fixed inset-y-14 left-0 z-30 w-64 bg-[#050816] border-r border-white/5 backdrop-blur-md transition-transform duration-300 flex flex-col ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } lg:relative lg:translate-x-0`}
    >
      {/* Top Action */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between gap-2">
        <button
          onClick={onCreateThread}
          className="flex-1 py-2 px-3 rounded-xl bg-[#6366F1] hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111827] border border-white/5 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {filtered.map((t) => {
          const isActive = t.id === activeThreadId;
          return (
            <div
              key={t.id}
              onClick={() => onSelectThread(t.id)}
              className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                isActive
                  ? "bg-indigo-600/20 text-white border border-indigo-500/30 font-semibold"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                <span className="truncate">{t.title}</span>
              </div>
              {threads.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteThread(t.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Demo Badge Footer */}
      {isDemo && (
        <div className="p-3 border-t border-white/5 text-[10px] text-indigo-300 bg-indigo-500/5 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
          <span>Public Demo Mode</span>
        </div>
      )}
    </aside>
  );
}
