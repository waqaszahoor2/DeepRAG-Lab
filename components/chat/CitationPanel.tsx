"use client";

import { useEffect, useRef } from "react";
import { X, Bookmark } from "lucide-react";
import { SourceCitation } from "@/lib/api";
import CitationCard from "./CitationCard";

interface CitationPanelProps {
  sources: SourceCitation[];
  hoveredIndex?: number | null;
  onHoverSource?: (index: number | null) => void;
  onClose?: () => void;
}

export default function CitationPanel({
  sources,
  hoveredIndex,
  onHoverSource,
  onClose,
}: CitationPanelProps) {
  const sourceRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (hoveredIndex) sourceRefs.current[hoveredIndex - 1]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [hoveredIndex]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#050816] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Bookmark className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Sources</h3>
            <p className="text-[10px] text-slate-600 dark:text-slate-400">{sources.length} retrieved {sources.length === 1 ? "source" : "sources"}</p>
          </div>
        </div>

        <div className="lg:hidden absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-300 dark:bg-white/15" />

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sources Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500">
            <Bookmark className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs font-medium text-slate-400">No citations yet</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
              Ask a question about your documents to inspect page citations here.
            </p>
          </div>
        ) : (
            sources.map((src, idx) => (
            <div key={src.chunk_id || idx} ref={(element) => { sourceRefs.current[idx] = element; }}>
              <CitationCard
                source={src}
                index={idx + 1}
                isHovered={hoveredIndex === idx + 1}
                onHover={onHoverSource}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
