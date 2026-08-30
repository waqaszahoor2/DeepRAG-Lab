"use client";

import { Award, ShieldCheck, AlertTriangle, XCircle } from "lucide-react";

interface ConfidenceScoreProps {
  score?: number;
}

export default function ConfidenceScore({ score }: ConfidenceScoreProps) {
  if (score === undefined || score === null) return null;

  const percentage = Math.round(score * 100);

  let colorClass: string;
  let label: string;
  let Icon: typeof Award;

  if (percentage >= 85) {
    colorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    label = "High Confidence";
    Icon = ShieldCheck;
  } else if (percentage >= 60) {
    colorClass = "text-amber-400 bg-amber-500/10 border-amber-500/30";
    label = "Partial";
    Icon = AlertTriangle;
  } else {
    colorClass = "text-rose-400 bg-rose-500/10 border-rose-500/30";
    label = "Low Confidence";
    Icon = XCircle;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>
        {label} — {percentage}%
      </span>
    </div>
  );
}
