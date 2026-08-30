"use client";

import { Suspense } from "react";
import ChatLayout from "@/components/chat/ChatLayout";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050816]" />}>
      <ChatLayout />
    </Suspense>
  );
}
