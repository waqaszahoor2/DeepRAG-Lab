"use client";

import { useEffect, useState } from "react";
import { Settings, User as UserIcon, Cpu, Database } from "lucide-react";
import { getCurrentUser } from "@/lib/authService";

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email: string; username: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const u = await getCurrentUser();
        setUser(u);
      } catch (err) {
        setUser({
          id: "guest_user",
          email: "guest@deeprag.lab",
          username: "Guest Explorer",
        });
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 pb-4 border-b border-slate-800/80">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-400" />
          Settings & Configuration
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Overview of your account profile, active LLM providers, and vector store configurations
        </p>
      </div>

      <div className="space-y-5">
        {/* Profile Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-indigo-400" />
            User Account Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Username</span>
              <p className="font-semibold text-slate-200 mt-0.5">{user?.username || "Developer"}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Email Address</span>
              <p className="font-semibold text-slate-200 mt-0.5">{user?.email || "user@deeprag.lab"}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Account ID</span>
              <p className="font-mono text-[11px] text-slate-400 mt-0.5">{user?.id || "session_active"}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Account Status</span>
              <p className="text-[11px] font-semibold text-emerald-400 mt-0.5">Active</p>
            </div>
          </div>
        </div>

        {/* LLM Provider Config Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            LLM Provider Strategy
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Primary Provider</p>
                <p className="text-[11px] text-slate-400">Google Gemini API (gemini-2.5-flash)</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">Active</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Fallback Provider</p>
                <p className="text-[11px] text-slate-400">OpenRouter API (google/gemini-2.5-flash)</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold">Standby</span>
            </div>
          </div>
        </div>

        {/* Vector DB Config Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Vector Storage Provider
          </h2>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-slate-200">Development Store</p>
              <p className="text-[11px] text-slate-400">ChromaDB (Local persistent vector database)</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
