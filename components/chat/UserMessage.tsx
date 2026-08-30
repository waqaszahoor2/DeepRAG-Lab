"use client";

import { Paperclip, UserRound } from "lucide-react";

interface UserMessageProps {
  text: string;
  attachedDoc?: string;
  timestamp?: string;
}

export default function UserMessage({ text, attachedDoc, timestamp }: UserMessageProps) {
  return (
    <div className="flex items-end justify-end gap-2.5 my-4 max-w-full chat-rise">
      <div className="max-w-[88%] sm:max-w-[78%] px-4 py-2.5 rounded-2xl rounded-br-md bg-[#242044] text-slate-100 text-sm leading-6 ring-1 ring-white/5">
        {attachedDoc && (
          <div className="mb-2 p-2 rounded-lg bg-indigo-900/50 border border-indigo-400/30 flex items-center gap-2 text-xs text-indigo-100">
            <Paperclip className="w-3.5 h-3.5" />
            <span className="truncate">{attachedDoc}</span>
          </div>
        )}
        <p className="whitespace-pre-wrap">{text}</p>
      </div>

      {timestamp && <span className="sr-only">{timestamp}</span>}
      <div className="hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300"><UserRound className="w-3.5 h-3.5" /></div>
    </div>
  );
}
