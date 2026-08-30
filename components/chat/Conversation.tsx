"use client";

import { useRef, useEffect } from "react";
import Message, { MessageData } from "./Message";
import SuggestionCards from "./SuggestionCards";

interface ConversationProps {
  messages: MessageData[];
  loading?: boolean;
  hoveredCitationIdx?: number | null;
  onHoverCitation?: (idx: number | null) => void;
  onOpenSources?: () => void;
  onSelectPrompt?: (prompt: string) => void;
  onRegenerate?: () => void;
  onVerify?: (msg: MessageData) => void;
}

export default function Conversation({
  messages,
  loading,
  hoveredCitationIdx,
  onHoverCitation,
  onOpenSources,
  onSelectPrompt,
  onRegenerate,
  onVerify,
}: ConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const realUserMessages = messages.filter((m) => m.sender === "user");

  return (
    <div className="flex-1 overflow-y-auto w-full px-4 sm:px-6">
      {/* Centered Document-Style Container (Max-Width 768px) */}
      <div className="max-w-[768px] mx-auto min-h-full flex flex-col pt-3 pb-28">
        {realUserMessages.length === 0 ? (
          <SuggestionCards onSelectPrompt={(p) => onSelectPrompt?.(p)} />
        ) : (
          messages.map((msg, index) => (
            <Message
              key={msg.id}
              message={msg}
              showIdentity={msg.sender === "ai" && messages.findIndex((item) => item.sender === "ai") === index}
              hoveredCitationIdx={hoveredCitationIdx}
              onHoverCitation={onHoverCitation}
              onOpenSources={onOpenSources}
              onRegenerate={onRegenerate}
              onVerify={() => onVerify?.(msg)}
            />
          ))
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
