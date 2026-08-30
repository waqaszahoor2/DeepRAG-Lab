"use client";

import { useState, useEffect } from "react";
import { X, FileText, Layers, Loader2, Copy, Check } from "lucide-react";
import { fetchDocumentChunks, ChunkItem } from "@/lib/api";

interface ChunkPreviewModalProps {
  documentId: string | null;
  filename: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChunkPreviewModal({
  documentId,
  filename,
  isOpen,
  onClose,
}: ChunkPreviewModalProps) {
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && documentId) {
      setLoading(true);
      setError(null);
      fetchDocumentChunks(documentId)
        .then((res) => setChunks(res.chunks || []))
        .catch(() => { setChunks([]); setError("Unable to load chunks for this document."); })
        .finally(() => setLoading(false));
    }
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white truncate max-w-md">
                Indexed Chunks: {filename}
              </h3>
              <p className="text-[11px] text-slate-400">
                {chunks.length} semantic text chunks stored in Vector Database
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-3" />
              <p className="text-xs">Fetching document chunks from vector store...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-rose-300">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{error}</p>
            </div>
          ) : chunks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No chunks found for this document.</p>
            </div>
          ) : (
            chunks.map((chunk, idx) => (
              <div
                key={chunk.chunk_id || idx}
                className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs space-y-2 hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-purple-600/20 text-purple-300 font-mono text-[10px] font-bold">
                      Chunk #{idx + 1}
                    </span>
                    {chunk.page_number && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Page {chunk.page_number}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">
                      {chunk.character_count} chars
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopy(chunk.chunk_id, chunk.text)}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                    title="Copy Chunk Text"
                  >
                    {copiedId === chunk.chunk_id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-slate-300 leading-relaxed font-sans whitespace-pre-wrap bg-slate-900/80 p-3 rounded-lg border border-slate-800/60">
                  {chunk.text}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
