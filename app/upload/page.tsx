"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, Database, AlertCircle, RefreshCw, Eye, Layers } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import ChunkPreviewModal from "@/components/ChunkPreviewModal";
import { fetchDocuments, deleteDocument, DocumentItem } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Chunk Modal State
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewDocName, setPreviewDocName] = useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDocuments();
      setDocuments(res.documents);
    } catch (err) {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert("Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenPreview = (doc: DocumentItem) => {
    setPreviewDocId(doc.id);
    setPreviewDocName(doc.original_filename);
    setIsPreviewOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Document Management</h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload PDFs, DOCX, CSVs, TXT, or Markdown to populate your RAG vector store
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Zone */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-slate-800 h-fit">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Upload File
          </h2>
          <FileUploader onUploadSuccess={() => loadDocuments()} />
        </div>

        {/* Documents Table */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              Indexed Documents ({documents.length})
            </h2>
            <button
              onClick={loadDocuments}
              className="p-2 rounded-lg glass-panel hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium text-slate-300">No documents indexed</p>
              <p className="text-xs text-slate-500 mt-1">
                Upload files on the left to extract text and generate vector embeddings
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Chunks</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-4 font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{doc.original_filename}</span>
                        </div>
                      </td>
                      <td className="py-4 text-xs font-mono text-indigo-400 uppercase">{doc.file_type}</td>
                      <td className="py-4 text-slate-300 font-mono">{doc.chunk_count}</td>
                      <td className="py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenPreview(doc)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 transition-colors flex items-center gap-1"
                            title="Preview Chunks"
                          >
                            <Layers className="w-3.5 h-3.5 text-purple-400" />
                            <span>Chunks</span>
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors disabled:opacity-50"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Chunk Preview Modal */}
      <ChunkPreviewModal
        documentId={previewDocId}
        filename={previewDocName}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}
