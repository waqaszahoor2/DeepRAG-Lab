"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

const STAGES = [
  { key: "validating", label: "Validating file...", pct: 10 },
  { key: "extracting", label: "Extracting text...", pct: 30 },
  { key: "chunking", label: "Splitting into chunks...", pct: 50 },
  { key: "embedding", label: "Generating embeddings...", pct: 75 },
  { key: "indexing", label: "Storing in vector DB...", pct: 90 },
  { key: "complete", label: "Done!", pct: 100 },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

interface UploadProgressProps {
  currentStage: StageKey;
  fileName?: string;
}

export default function UploadProgress({ currentStage, fileName }: UploadProgressProps) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);
  const currentInfo = STAGES[currentIndex] || STAGES[0];
  const isComplete = currentStage === "complete";

  return (
    <div className="w-full p-4 rounded-xl glass-panel border border-slate-800/80">
      {/* File name */}
      {fileName && (
        <p className="text-xs text-slate-300 font-medium mb-2 truncate">
          {fileName}
        </p>
      )}

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isComplete
              ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
              : "bg-gradient-to-r from-indigo-500 to-purple-500"
          }`}
          style={{ width: `${currentInfo.pct}%` }}
        />
      </div>

      {/* Stage label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          {isComplete ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          )}
          <span className={isComplete ? "text-emerald-400 font-semibold" : "text-slate-300"}>
            {currentInfo.label}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          {currentInfo.pct}%
        </span>
      </div>

      {/* Stage dots */}
      <div className="flex items-center gap-1 mt-3 justify-center">
        {STAGES.map((stage, idx) => (
          <div
            key={stage.key}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              idx < currentIndex
                ? "bg-indigo-400"
                : idx === currentIndex
                ? isComplete
                  ? "bg-emerald-400"
                  : "bg-indigo-400 animate-pulse"
                : "bg-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
