"use client";

import { useState } from "react";
import { Card, SectionHeader, Button } from "@/components/ui";

/**
 * NewsDigest — AI-generated market intelligence digest.
 * 
 * Streams a comprehensive market analysis covering:
 * - Market movers and sentiment
 * - Arbitrage opportunities explained in plain English
 * - Upcoming resolution dates
 * - Suggested new markets
 */
export default function NewsDigest() {
  const [digest, setDigest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    setDigest("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "digest" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        setError(data.error || `Error ${res.status}`);
        setLoading(false);
        return;
      }

      const contentType = res.headers.get("content-type") || "";

      // JSON fallback response (non-streaming)
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.ok && data.data?.digest) {
          setDigest(data.data.digest);
        } else {
          setError(data.error || "Failed to generate digest");
        }
        setLoading(false);
        return;
      }

      // Streaming response
      const reader = res.body?.getReader();
      if (!reader) { setError("No response"); setLoading(false); return; }

      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setDigest(content);
      }

      setLoading(false);
    } catch {
      setError("Failed to generate digest. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader>🗞️ AI Market Digest</SectionHeader>
        <Button size="sm" variant="secondary" onClick={generate} disabled={loading}>
          {loading ? "Generating…" : digest ? "Refresh" : "Generate Digest"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 mb-2" role="alert">
          {error}
        </div>
      )}

      {loading && !digest && (
        <div className="text-xs text-slate-500 animate-pulse py-6 text-center">
          Analyzing markets and generating insights…
        </div>
      )}

      {digest && (
        <div className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
          {digest}
          {loading && <span className="animate-pulse text-slate-600">▍</span>}
        </div>
      )}

      {!digest && !loading && !error && (
        <div className="text-center py-6 text-xs text-slate-600">
          Click "Generate Digest" for an AI-powered analysis of current markets, trends, and opportunities.
        </div>
      )}
    </Card>
  );
}
