"use client";

import { Bot } from "lucide-react";
import ModeChip from "./ModeChip";
import ConfidenceBadge from "./ConfidenceBadge";
import MessageActions from "./MessageActions";
import InsufficientContextCard from "@/components/InsufficientContextCard";
import { SourceCitation } from "@/lib/api";

interface AIMessageProps {
  id: string;
  text: string;
  showIdentity?: boolean;
  mode?: string;
  confidence?: number;
  provider?: string;
  sufficientContext?: boolean;
  sources?: SourceCitation[];
  timestamp?: string;
  hoveredCitationIdx?: number | null;
  onHoverCitation?: (idx: number | null) => void;
  onOpenSources?: () => void;
  onRegenerate?: () => void;
  onVerify?: () => void;
}

export default function AIMessage({
  id,
  text,
  showIdentity = true,
  mode = "document_qa",
  confidence,
  provider,
  sufficientContext = true,
  sources = [],
  timestamp,
  hoveredCitationIdx,
  onHoverCitation,
  onOpenSources,
  onRegenerate,
  onVerify,
}: AIMessageProps) {
  const renderInline = (content: string) => {
    const parts = content.split(/(\[\d+\]|\*\*[^*]+\*\*|`[^`]+`)/g);

    return parts.map((part, idx) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const citationNum = parseInt(match[1], 10);
        const isHovered = hoveredCitationIdx === citationNum;

        return (
          <button
            key={idx}
            type="button"
            className={`inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 text-[10px] font-mono font-bold rounded transition-all cursor-pointer min-h-[28px] ${
              isHovered
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/50 scale-110 ring-2 ring-indigo-400"
                : "bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white"
            }`}
            onMouseEnter={() => onHoverCitation?.(citationNum)}
            onMouseLeave={() => onHoverCitation?.(null)}
            onClick={() => {
              onHoverCitation?.(citationNum);
              onOpenSources?.();
            }}
          >
            {part}
          </button>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={idx}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`")) return <code key={idx}>{part.slice(1, -1)}</code>;
      return <span key={idx}>{part}</span>;
    });
  };

  const renderMarkdown = (content: string) => content.split("\n\n").map((block, blockIndex) => {
    const lines = block.split("\n");
    if (lines.every((line) => /^[-*] /.test(line))) {
      return <ul key={blockIndex}>{lines.map((line) => <li key={line}>{renderInline(line.slice(2))}</li>)}</ul>;
    }
    if (lines.every((line) => /^\d+\. /.test(line))) {
      return <ol key={blockIndex}>{lines.map((line) => <li key={line}>{renderInline(line.replace(/^\d+\. /, ""))}</li>)}</ol>;
    }
    if (/^### /.test(block)) return <h3 key={blockIndex}>{renderInline(block.slice(4))}</h3>;
    if (/^## /.test(block)) return <h2 key={blockIndex}>{renderInline(block.slice(3))}</h2>;
    if (block.startsWith("```") && block.endsWith("```")) return <pre key={blockIndex}><code>{block.slice(3, -3).replace(/^\w+\n/, "")}</code></pre>;
    return <p key={blockIndex}>{lines.map((line, idx) => <span key={idx}>{idx > 0 && <br />}{renderInline(line)}</span>)}</p>;
  });

  return (
    <article className="group chat-rise flex flex-col items-start my-5 max-w-full text-left">
      {/* Header: AI Avatar + Name + Metadata */}
      {showIdentity && (
        <div className="flex items-center justify-between w-full mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">DeepRAG AI</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {mode && <ModeChip mode={mode} provider={provider} />}
            {confidence !== undefined && <ConfidenceBadge score={confidence} />}
          </div>
        </div>
      )}

      {/* Insufficient Context Alert Card */}
      {!sufficientContext && <InsufficientContextCard />}

      {/* Document-Style Content (No Heavy Bubble) */}
      <div className={`${showIdentity ? "pl-10" : "pl-0 sm:pl-10"} chat-markdown w-full text-slate-800 dark:text-slate-200 text-sm sm:text-[15px] leading-7`}>
        {text ? renderMarkdown(text) : <span className="inline-block h-4 w-10 animate-pulse rounded bg-slate-300 dark:bg-white/10" />}
      </div>

      {/* Action Bar & Timestamp */}
      <div className={`${showIdentity ? "pl-10" : "pl-0 sm:pl-10"} flex items-center justify-between w-full mt-0.5`}>
        <MessageActions text={text} onRegenerate={onRegenerate} onVerify={onVerify} />
        {timestamp && <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{timestamp}</span>}
      </div>
    </article>
  );
}
