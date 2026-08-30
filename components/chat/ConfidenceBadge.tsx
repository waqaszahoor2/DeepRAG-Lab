"use client";

interface ConfidenceBadgeProps {
  score?: number;
}

export default function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  if (score === undefined || score === null) return null;

  const percentage = Math.round(score * 100);

  let badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  let dotColor = "bg-emerald-400";
  let label = "High Confidence";

  if (percentage < 70) {
    badgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/20";
    dotColor = "bg-rose-400";
    label = "Low Confidence";
  } else if (percentage < 90) {
    badgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    dotColor = "bg-amber-400";
    label = "Medium Confidence";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
      <span>{percentage}% {label}</span>
    </span>
  );
}
