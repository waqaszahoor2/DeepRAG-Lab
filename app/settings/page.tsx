"use client";

import { useEffect, useState } from "react";
import { Settings, User as UserIcon, Cpu, Database } from "lucide-react";
import { getCurrentUser } from "@/lib/authService";
import { getApiBaseUrl } from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email: string; username: string } | null>(null);
  const [health, setHealth] = useState<{ status: string; checks: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const u = await getCurrentUser();
        setUser(u);
      } catch (err) {
        setUser(null);
      }
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/api/v1/health/ready`);
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
        }
      } catch {
        setHealth({ status: 'offline', checks: {} });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const isGuest = !user;

  return (
    <div className="site-container py-8">
      <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
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
          {isGuest ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <p className="font-semibold text-amber-200">Guest Demo Mode</p>
              <p className="mt-1 text-slate-300">
                You are currently browsing as a Guest. Create an account or sign in to save private documents and conversations.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Username</span>
                <p className="font-semibold text-slate-200 mt-0.5">{user.username}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Email Address</span>
                <p className="font-semibold text-slate-200 mt-0.5">{user.email}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Account ID</span>
                <p className="font-mono text-[11px] text-slate-400 mt-0.5">{user.id}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Account Status</span>
                <p className="text-[11px] font-semibold text-emerald-400 mt-0.5">Active Member</p>
              </div>
            </div>
          )}
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
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${health?.checks?.gemini_key === 'configured' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                {health?.checks?.gemini_key === 'configured' ? 'Active' : 'Unconfigured'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Secondary Fallback</p>
                <p className="text-[11px] text-slate-400">OpenRouter API (google/gemini-2.5-flash)</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${health?.checks?.openrouter_key === 'configured' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                {health?.checks?.openrouter_key === 'configured' ? 'Standby' : 'Unconfigured'}
              </span>
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
              <p className="font-semibold text-slate-200">Vector Engine</p>
              <p className="text-[11px] text-slate-400">ChromaDB (Local) / Qdrant (Production)</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${health?.checks?.vector_db?.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {health?.checks?.vector_db?.status === 'connected' ? 'Connected' : 'Unavailable'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
