"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, MessageSquare, Database, Cpu, Plus, ArrowRight, Activity, Clock } from "lucide-react";
import { fetchDocuments, fetchUserProfile, DocumentItem, User } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const u = await fetchUserProfile();
        setUser(u);
        const docs = await fetchDocuments();
        setDocuments(docs.documents);
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const totalChunks = documents.reduce((acc, d) => acc + d.chunk_count, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, <span className="text-indigo-400">{user?.username}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Overview of your documents, indexed vectors, and AI activity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/upload"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Upload Document
          </Link>
          <Link
            href="/chat"
            className="px-4 py-2.5 rounded-xl glass-panel hover:bg-slate-800 text-slate-200 text-sm font-semibold border border-slate-700 flex items-center gap-2 transition-all"
          >
            <MessageSquare className="w-4 h-4" /> Start AI Chat
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Documents</span>
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{documents.length}</p>
          <p className="text-xs text-slate-400 mt-2">PDF, DOCX, TXT, CSV, MD</p>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Indexed Vectors</span>
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{totalChunks}</p>
          <p className="text-xs text-slate-400 mt-2">Chunks in ChromaDB</p>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Primary Model</span>
            <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl font-bold text-white">Gemini 2.5 Flash</p>
          <p className="text-xs text-emerald-400 mt-2">OpenRouter Fallback Ready</p>
        </div>

        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">System Status</span>
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-400">Operational</p>
          <p className="text-xs text-slate-400 mt-2">RAG Pipeline Active</p>
        </div>
      </div>

      {/* Recent Documents Table */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Recent Documents
          </h2>
          <Link href="/upload" className="text-xs font-medium text-indigo-400 hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-medium text-slate-300">No documents uploaded yet</p>
            <p className="text-xs text-slate-500 mt-1">Upload files to enable document-based AI QA</p>
            <Link
              href="/upload"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
            >
              Upload First File
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Filename</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Size</th>
                  <th className="pb-3 font-semibold">Chunks</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {documents.slice(0, 5).map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 font-medium text-slate-200">{doc.original_filename}</td>
                    <td className="py-4 text-xs font-mono text-indigo-400 uppercase">{doc.file_type}</td>
                    <td className="py-4 text-slate-400">{(doc.file_size_bytes / 1024).toFixed(1)} KB</td>
                    <td className="py-4 text-slate-300">{doc.chunk_count}</td>
                    <td className="py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-4 text-slate-400 text-right text-xs">
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
