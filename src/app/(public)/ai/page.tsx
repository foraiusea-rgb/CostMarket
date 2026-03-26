"use client";

import AiChat from "@/components/ai/AiChat";

export default function AiPage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
          AI Assistant
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Ask about markets, pricing trends, arbitrage, and trading strategies.
        </p>
      </div>
      <AiChat />
    </div>
  );
}
