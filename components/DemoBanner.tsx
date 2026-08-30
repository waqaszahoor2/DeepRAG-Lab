"use client";

import Link from "next/link";
import { Sparkles, UserPlus, X } from "lucide-react";
import { useState } from "react";

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 border border-indigo-500/30 rounded-xl px-4 py-3 mb-3 backdrop-blur-sm">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center gap-3 pr-8">
        <div className="p-2 rounded-lg bg-indigo-600/30 shrink-0">
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            You&apos;re in Demo Mode
          </p>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Ask questions about three pre-loaded documents: Transformer Paper, RAG Architecture Guide, or DeepRAG Lab Specification.{" "}
            <Link
              href="/register"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2"
            >
              <UserPlus className="w-3 h-3" />
              Sign up to upload your own documents
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
