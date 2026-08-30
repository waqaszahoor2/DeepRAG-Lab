"use client";

import { FileText, Sparkles, Code, Lightbulb, Cpu } from "lucide-react";

interface SuggestionCardsProps {
  onSelectPrompt: (prompt: string) => void;
}

const SUGGESTIONS = [
  {
    icon: FileText,
    title: "Summarize this document",
    prompt: "Can you summarize the key findings and methodology from my uploaded documents?",
  },
  {
    icon: Sparkles,
    title: "Find key insights",
    prompt: "What are the top 5 strategic insights or statistics mentioned in the files?",
  },
  {
    icon: Lightbulb,
    title: "Explain methodology",
    prompt: "Explain how the RAG retrieval architecture and vector search works.",
  },
  {
    icon: Code,
    title: "Extract important findings",
    prompt: "Extract all quantitative benchmarks, performance metrics, and evaluation results.",
  },
];

export default function SuggestionCards({ onSelectPrompt }: SuggestionCardsProps) {
  return (
    <div className="flex flex-col items-center justify-center my-auto py-16 px-0 text-center max-w-2xl mx-auto">
      {/* Brand Icon */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 text-white shadow-xl shadow-indigo-500/20 mb-5">
        <Cpu className="w-8 h-8" />
      </div>

      {/* Title & Subtitle */}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
        Chat with your documents
      </h1>
      <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-9">
        Upload papers, PDFs, reports and ask intelligent questions.
      </p>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {SUGGESTIONS.map((s, idx) => {
          const Icon = s.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(s.prompt)}
              className="p-4 rounded-2xl bg-white/[.035] hover:bg-white/[.06] border border-white/5 hover:border-indigo-500/30 text-left transition-all group"
            >
              <div className="flex items-center gap-2 text-indigo-400 mb-1.5">
                <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-xs text-white">{s.title}</span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{s.prompt}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
