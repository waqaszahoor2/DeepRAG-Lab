"use client";

import { AlertTriangle, Globe } from "lucide-react";

interface InsufficientContextCardProps {
  topic?: string;
}

export default function InsufficientContextCard({ topic }: InsufficientContextCardProps) {
  return (
    <div className="border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm p-4 rounded-xl mb-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-amber-200 font-semibold text-sm">
            ⚠️ Documents don&apos;t contain this information
          </p>
          {topic && (
            <p className="text-amber-300/80 text-xs mt-1">
              No relevant content found about: <span className="font-medium italic">{topic}</span>
            </p>
          )}
          <p className="text-amber-300/70 text-xs mt-1.5 flex items-center gap-1.5">
            <Globe className="w-3 h-3" />
            The answer below comes from general knowledge, not your files.
          </p>
        </div>
      </div>
    </div>
  );
}
