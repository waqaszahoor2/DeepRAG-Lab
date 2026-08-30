"use client";

import { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/lib/api";
import { X, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export interface ClaimDetail {
  claim: string;
  verified: boolean;
  confidence: number;
  supporting_snippet?: string | null;
}

export interface VerificationResult {
  faithfulness_score: number;
  total_claims: number;
  verified_count: number;
  unverified_count: number;
  claim_details: ClaimDetail[];
}

interface AnswerVerificationModalProps {
  answer: string;
  sources: any[];
  isOpen: boolean;
  onClose: () => void;
}

export default function AnswerVerificationModal({
  answer,
  sources,
  isOpen,
  onClose,
}: AnswerVerificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    if (isOpen && answer) {
      setLoading(true);
      const apiBase = getApiBaseUrl();

      fetch(`${apiBase}/api/v1/chat/verify-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, sources }),
      })
        .then((res) => res.json())
        .then((data) => setResult(data))
        .catch(() => setResult(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen, answer, sources]);

  if (!isOpen) return null;

  const scorePct = result ? Math.round(result.faithfulness_score * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Answer Verification Breakdown</h3>
              <p className="text-[11px] text-slate-400">
                Audits individual claims against ground-truth document snippets
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
              <p className="text-xs">Extracting & verifying factual claims...</p>
            </div>
          ) : !result ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Unable to verify answer at this time.
            </div>
          ) : (
            <>
              {/* Score Overview Card */}
              <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    Faithfulness Rating
                  </p>
                  <p className="text-2xl font-extrabold text-white mt-0.5">{scorePct}%</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {result.verified_count} of {result.total_claims} claims verified by sources
                  </p>
                </div>

                <div
                  className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                    scorePct >= 80
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {scorePct >= 80 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> High Faithfulness
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" /> Potential Hallucination
                    </>
                  )}
                </div>
              </div>

              {/* Claims List */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Extracted Claims ({result.total_claims})
                </p>

                {result.claim_details.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                      item.verified
                        ? "bg-slate-950/60 border-slate-800"
                        : "bg-amber-500/5 border-amber-500/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {item.verified ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <p className="text-slate-200 font-medium leading-relaxed">
                          &ldquo;{item.claim}&rdquo;
                        </p>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0 ${
                          item.verified
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {item.verified ? `Verified (${Math.round(item.confidence * 100)}%)` : "Unverified"}
                      </span>
                    </div>

                    {item.supporting_snippet && (
                      <div className="ml-6 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 italic">
                        Snippet: &ldquo;{item.supporting_snippet}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}
