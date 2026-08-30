"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, MessageSquare, Database, Cpu, Plus, ArrowRight, Activity, Clock } from "lucide-react";
import { fetchDocuments, DocumentItem } from "@/lib/api";
import { getCurrentUser } from "@/lib/authService";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const u = await getCurrentUser();
        if (!u) {
          router.push("/login");
          return;
        }
        setUser(u);
        const docs = await fetchDocuments();
        setDocuments(docs.documents);
      } catch (err) {
        // Safe fallback for documents if server is offline
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const totalChunks = documents.reduce((acc, d) => acc + d.chunk_count, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome back, <span className="text-indigo-600 dark:text-indigo-400">{user?.username}</span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Overview of your documents, indexed vectors, and AI activity
          </p>
        </div>

        {/* Reduced Action Buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/upload"
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Upload Document
          </Link>
          <Link
            href="/chat"
            className="px-3 py-1.5 rounded-lg glass-panel hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" /> AI Chat
          </Link>
        </div>
      </div>

      {/* Reduced Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Documents</span>
            <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">{documents.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">PDF, DOCX, TXT, CSV, MD</p>
        </div>

        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Indexed Vectors</span>
            <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">{totalChunks}</p>
          <p className="text-[10px] text-slate-400 mt-1">Chunks in Vector Store</p>
        </div>

        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">LLM Provider Chain</span>
            <div className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base font-bold text-white">Gemini 2.5 Flash</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Gemini
            </span>
            <span className="text-[10px] text-slate-500">→</span>
            <span className="flex items-center gap-1 text-[10px] text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Z.AI
            </span>
            <span className="text-[10px] text-slate-500">→</span>
            <span className="flex items-center gap-1 text-[10px] text-purple-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              OpenRouter
            </span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">System Status</span>
            <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base font-bold text-emerald-400">Operational</p>
          <p className="text-[10px] text-slate-400 mt-1">RAG Engine Active</p>
        </div>
      </div>

      {/* Reduced Recent Documents Table Container */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Recent Documents
          </h2>
          <Link href="/upload" className="text-[11px] font-medium text-indigo-400 hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-medium text-slate-300">No documents uploaded yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Upload files to enable document-based AI QA</p>
            <Link
              href="/upload"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Upload First File
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-2 font-semibold">Filename</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">Size</th>
                  <th className="pb-2 font-semibold">Chunks</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {documents.slice(0, 5).map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 font-medium text-slate-200">{doc.original_filename}</td>
                    <td className="py-2.5 text-[10px] font-mono text-indigo-400 uppercase">{doc.file_type}</td>
                    <td className="py-2.5 text-slate-400">{(doc.file_size_bytes / 1024).toFixed(1)} KB</td>
                    <td className="py-2.5 text-slate-300">{doc.chunk_count}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400 text-right text-[11px]">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
