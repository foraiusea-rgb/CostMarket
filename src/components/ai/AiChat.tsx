"use client";

import { useState, useRef, useEffect } from "react";
import { Card, Button } from "@/components/ui";

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * AiChat — Reusable streaming chat component.
 * 
 * Used on the /ai page for full conversations.
 * Sends messages to /api/ai with action: "chat" and streams the response.
 */
export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError("");

    // Add user message
    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          messages: updatedMessages,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        setError(data.error || `Error ${res.status}`);
        setLoading(false);
        return;
      }

      // Stream the response
      const reader = res.body?.getReader();
      if (!reader) { setError("No response stream"); setLoading(false); return; }

      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add empty assistant message that we'll fill as chunks arrive
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        // Update the last message with accumulated content
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: assistantContent };
          return copy;
        });
      }

      setLoading(false);
    } catch {
      setError("Failed to get response. Please try again.");
      setLoading(false);
    }
  };

  const SUGGESTIONS = [
    "Which markets have the best arbitrage opportunities right now?",
    "Compare OpenAI vs Anthropic pricing outlook for 2026",
    "What should I know before trading on frontier model pricing?",
    "Explain how the LMSR market maker works",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-3xl mb-3">🤖</div>
            <h2 className="font-display text-lg font-bold mb-2">AI Market Assistant</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-md">
              Ask about markets, pricing trends, arbitrage opportunities, or trading strategies. I have access to all live market data.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); }}
                  className="text-left rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-xs text-slate-400 hover:bg-white/[0.05] hover:border-white/[0.1] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-500/15 text-blue-100 border border-blue-500/20"
                  : "bg-white/[0.03] text-slate-300 border border-white/[0.06]"
              }`}>
                {msg.role === "assistant" && msg.content === "" && loading ? (
                  <span className="text-slate-500 animate-pulse">Thinking…</span>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-2 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400" role="alert">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-2 pt-2 border-t border-white/[0.06]">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about markets, pricing trends, strategies…"
          disabled={loading}
          className="flex-1 rounded-lg border border-white/[0.06] bg-bg-1 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50"
        />
        <Button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="px-5">
          {loading ? "…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
