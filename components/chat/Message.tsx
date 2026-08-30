"use client";

import UserMessage from "./UserMessage";
import AIMessage from "./AIMessage";
import { SourceCitation } from "@/lib/api";

export interface MessageData {
  id: string;
  sender: "user" | "ai";
  text: string;
  mode?: string;
  confidence?: number;
  provider?: string;
  sufficientContext?: boolean;
  sources?: SourceCitation[];
  attachedDoc?: string;
  timestamp?: string;
}

interface MessageProps {
  message: MessageData;
  showIdentity?: boolean;
  hoveredCitationIdx?: number | null;
  onHoverCitation?: (idx: number | null) => void;
  onOpenSources?: () => void;
  onRegenerate?: () => void;
  onVerify?: () => void;
}

export default function Message({
  message,
  showIdentity,
  hoveredCitationIdx,
  onHoverCitation,
  onOpenSources,
  onRegenerate,
  onVerify,
}: MessageProps) {
  if (message.sender === "user") {
    return (
      <UserMessage
        text={message.text}
        attachedDoc={message.attachedDoc}
        timestamp={message.timestamp}
      />
    );
  }

  return (
    <AIMessage
      id={message.id}
      showIdentity={showIdentity}
      text={message.text}
      mode={message.mode}
      confidence={message.confidence}
      provider={message.provider}
      sufficientContext={message.sufficientContext}
      sources={message.sources}
      timestamp={message.timestamp}
      hoveredCitationIdx={hoveredCitationIdx}
      onHoverCitation={onHoverCitation}
      onOpenSources={onOpenSources}
      onRegenerate={onRegenerate}
      onVerify={onVerify}
    />
  );
}
