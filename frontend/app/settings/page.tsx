"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, User as UserIcon, Shield, Cpu, Database } from "lucide-react";
import { fetchUserProfile, User } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const u = await fetchUserProfile();
        setUser(u);
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-indigo-400" />
          Settings & Configuration
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your account profile, active LLM providers, and vector store configurations
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-indigo-400" />
            User Account Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-500">Username</span>
              <p className="font-semibold text-slate-200 mt-0.5">{user?.username}</p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-500">Email Address</span>
              <p className="font-semibold text-slate-200 mt-0.5">{user?.email}</p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-500">Account ID</span>
              <p className="font-mono text-xs text-slate-400 mt-0.5">{user?.id}</p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-500">Account Status</span>
              <p className="text-xs font-semibold text-emerald-400 mt-0.5">Active</p>
            </div>
          </div>
        </div>

        {/* LLM Provider Config Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            LLM Provider Strategy
          </h2>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Primary Provider</p>
                <p className="text-xs text-slate-400">Google Gemini API (gemini-2.5-flash)</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-semibold">Active</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-200">Fallback Provider</p>
                <p className="text-xs text-slate-400">OpenRouter API (google/gemini-2.5-flash)</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs font-semibold">Standby</span>
            </div>
          </div>
        </div>

        {/* Vector DB Config Card */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            Vector Storage Provider
          </h2>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-slate-200">Development Store</p>
              <p className="text-xs text-slate-400">ChromaDB (Local persistent vector database)</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-semibold">Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
