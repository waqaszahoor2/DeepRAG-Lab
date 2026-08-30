"use client";

import { useState } from "react";
import { FileText, ChevronDown, ChevronUp, ExternalLink, Bookmark } from "lucide-react";
import { SourceCitation as SourceCitationType } from "@/lib/api";

interface CitationPanelProps {
  citations: SourceCitationType[];
  onHoverCitation?: (index: number | null) => void;
}

export default function CitationPanel({ citations, onHoverCitation }: CitationPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!citations || citations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12 px-4">
        <Bookmark className="w-8 h-8 mb-3 opacity-30" />
        <p className="text-sm font-medium text-slate-400">No citations</p>
        <p className="text-xs text-slate-500 mt-1 text-center">
          Ask a question about your documents to see source citations here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800/80 shrink-0">
        <Bookmark className="w-4 h-4 text-indigo-400" />
        <h3 className="font-bold text-sm text-white">
          Sources ({citations.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {citations.map((c, idx) => {
          const citationIndex = idx + 1;
          const isExpanded = expandedId === c.chunk_id;

          return (
            <div
              key={c.chunk_id || idx}
              className="group p-3 bg-slate-900/70 border border-slate-800/80 rounded-xl hover:border-indigo-500/30 transition-all cursor-pointer"
              onMouseEnter={() => onHoverCitation?.(citationIndex)}
              onMouseLeave={() => onHoverCitation?.(null)}
              onClick={() => setExpandedId(isExpanded ? null : c.chunk_id)}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex items-center justify-center w-5 h-5 rounded bg-indigo-600/30 text-indigo-300 text-[10px] font-bold shrink-0">
                    {citationIndex}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200 truncate">
                      <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="truncate">{c.document_name}</span>
                    </div>
                    {c.page_number && (
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        Page {c.page_number}
                      </span>
                    )}
                  </div>
                </div>

                <button className="text-slate-500 hover:text-white transition-colors shrink-0 p-0.5">
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Relevance score bar */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                    style={{ width: `${Math.round(c.relevance_score * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {Math.round(c.relevance_score * 100)}%
                </span>
              </div>

              {/* Expandable text snippet */}
              {isExpanded ? (
                <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                  <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {c.text_snippet}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-mono">{c.chunk_id.slice(0, 12)}…</span>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-slate-400 line-clamp-2 italic">
                  &ldquo;{c.text_snippet}&rdquo;
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
