"use client";

import { FileText, Bookmark, ExternalLink } from "lucide-react";
import { SourceCitation as SourceCitationType } from "@/lib/api";

interface SourceCitationProps {
  sources: SourceCitationType[];
}

export default function SourceCitation({ sources }: SourceCitationProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-800">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-3">
        <Bookmark className="w-3.5 h-3.5" />
        <span>Document Sources & Citations ({sources.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sources.map((src, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 transition-colors text-left text-xs"
          >
            <div className="flex items-center justify-between font-medium text-slate-200 mb-1">
              <span className="truncate flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                {src.document_name}
              </span>
              {src.page_number && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono shrink-0">
                  Page {src.page_number}
                </span>
              )}
            </div>

            <p className="text-slate-400 text-[11px] line-clamp-2 italic mb-1.5">
              &ldquo;{src.text_snippet}&rdquo;
            </p>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
              <span>Match: {Math.round(src.relevance_score * 100)}%</span>
              <span className="font-mono">{src.chunk_id.slice(0, 8)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
