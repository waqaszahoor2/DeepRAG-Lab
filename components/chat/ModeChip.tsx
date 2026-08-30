"use client";

import { FileText, Globe, Sparkles } from "lucide-react";

interface ModeChipProps {
  mode: "document_qa" | "general_ai" | string;
  provider?: string;
}

export default function ModeChip({ mode, provider }: ModeChipProps) {
  const isDoc = mode === "document_qa";
  const label = isDoc ? "Document RAG" : mode === "general_ai" ? "General AI" : "Auto Router";

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
          isDoc
            ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
            : "bg-violet-500/10 text-violet-300 border-violet-500/20"
        }`}
      >
        {isDoc ? <FileText className="w-3 h-3 text-indigo-400" /> : mode === "general_ai" ? <Globe className="w-3 h-3 text-violet-400" /> : <Sparkles className="w-3 h-3 text-violet-400" />}
        <span>{label}</span>
      </span>

    </div>
  );
}
