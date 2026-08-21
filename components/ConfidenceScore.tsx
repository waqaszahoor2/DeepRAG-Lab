"use client";

import { Award } from "lucide-react";

interface ConfidenceScoreProps {
  score?: number;
}

export default function ConfidenceScore({ score }: ConfidenceScoreProps) {
  if (score === undefined || score === null) return null;

  const percentage = Math.round(score * 100);

  let colorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  if (percentage < 50) {
    colorClass = "text-rose-400 bg-rose-500/10 border-rose-500/30";
  } else if (percentage < 75) {
    colorClass = "text-amber-400 bg-amber-500/10 border-amber-500/30";
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
      <Award className="w-3.5 h-3.5" />
      <span>Confidence: {percentage}%</span>
    </div>
  );
}
