"use client";

import { FileText, Globe } from "lucide-react";

interface QueryModeChipProps {
  mode: "document_qa" | "general_ai" | string;
}

export default function QueryModeChip({ mode }: QueryModeChipProps) {
  if (mode === "document_qa") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/25 px-2.5 py-1 rounded-full">
        <FileText className="w-3 h-3 text-blue-400" />
        📚 Document RAG
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/25 px-2.5 py-1 rounded-full">
      <Globe className="w-3 h-3 text-purple-400" />
      🌐 General AI
    </span>
  );
}
