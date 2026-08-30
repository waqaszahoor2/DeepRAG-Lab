"use client";

import { useState } from "react";
import { FileText, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { SourceCitation } from "@/lib/api";

interface CitationCardProps {
  source: SourceCitation;
  index: number;
  isHovered?: boolean;
  onHover?: (index: number | null) => void;
}

export default function CitationCard({
  source,
  index,
  isHovered,
  onHover,
}: CitationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const pct = Math.round(source.relevance_score * 100);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(source.text_snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`p-3.5 rounded-xl bg-slate-900/60 border transition-all cursor-pointer ${
        isHovered
          ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
          : "border-white/5 hover:border-white/10 hover:bg-slate-900/90"
      }`}
      onMouseEnter={() => onHover?.(index)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-600/30 text-indigo-300 text-[10px] font-bold font-mono shrink-0">
            [{index}]
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">{source.document_name}</span>
            </p>
            {source.page_number && (
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Page {source.page_number}
              </p>
            )}
          </div>
        </div>

          <button aria-label={`${expanded ? "Collapse" : "Expand"} source ${index}`} className="text-slate-500 hover:text-slate-300 transition-colors p-0.5">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Score Progress Bar */}
      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-400 font-mono font-semibold">
          {pct}%
        </span>
      </div>

      {/* Snippet Preview */}
      <div className="mt-2.5 pt-2 border-t border-white/5">
        <p className={`text-[11px] text-slate-300 leading-relaxed italic ${expanded ? "" : "line-clamp-2"}`}>
          &ldquo;{source.text_snippet}&rdquo;
        </p>

        {expanded && (
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 pt-1">
            <span className="font-mono">{source.chunk_id.slice(0, 12)}…</span>
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copied" : "Copy snippet"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
