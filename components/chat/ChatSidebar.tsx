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
      className={`fixed inset-y-14 left-0 z-30 w-64 bg-slate-100 dark:bg-[#050816] border-r border-slate-200 dark:border-slate-800 backdrop-blur-md transition-transform duration-300 flex flex-col ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } lg:relative lg:translate-x-0`}
    >
      {/* Top Action */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <button
          onClick={onCreateThread}
          className="flex-1 py-2.5 px-3 min-h-[44px] rounded-xl bg-[#6366F1] hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        <button
          onClick={onCloseMobile}
          className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          aria-label="Close Sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search Threads */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-2 min-h-[44px] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Demo Badge Info */}
      {isDemo && (
        <div className="px-3 pb-2">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Public Demo Mode</span>
          </div>
        </div>
      )}

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1">
        {filtered.length === 0 ? (
          <p className="text-center text-slate-500 text-xs py-8">No chats found</p>
        ) : (
          filtered.map((thread) => {
            const isActive = thread.id === activeThreadId;
            return (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={`group flex items-center justify-between p-2.5 min-h-[44px] rounded-xl cursor-pointer text-xs transition-colors ${
                  isActive
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-medium border border-slate-200 dark:border-slate-800 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{thread.title}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteThread(thread.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Delete Thread"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
