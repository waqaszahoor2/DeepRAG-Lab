"use client";

import { useState } from "react";
import { Copy, Check, RotateCw, ThumbsUp, ThumbsDown, ShieldCheck } from "lucide-react";

interface MessageActionsProps {
  text: string;
  onRegenerate?: () => void;
  onVerify?: () => void;
}

export default function MessageActions({ text, onRegenerate, onVerify }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 opacity-60 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pt-3">
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        title="Copy Answer"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>

      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Regenerate Answer"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      )}

      {onVerify && (
        <button
          onClick={onVerify}
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-colors flex items-center gap-1 text-[11px]"
          title="Verify Answer Faithfulness"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verify</span>
        </button>
      )}

      <div className="h-3 w-[1px] bg-white/10 mx-1" />

      <button
        onClick={() => setFeedback("up")}
        className={`p-1.5 rounded-lg transition-colors ${
          feedback === "up" ? "text-emerald-400 bg-emerald-500/10" : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
        title="Helpful"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setFeedback("down")}
        className={`p-1.5 rounded-lg transition-colors ${
          feedback === "down" ? "text-rose-400 bg-rose-500/10" : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
        title="Not Helpful"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
