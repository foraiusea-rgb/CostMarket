"use client";

import { useState } from "react";
import { Card, SectionHeader, Button } from "@/components/ui";

/**
 * MarketAnalysis — Inline AI analysis card for market detail pages.
 * 
 * Shows a "Generate Analysis" button. When clicked, sends the market ID
 * to /api/ai with action: "analyze" and displays the AI-generated summary.
 */
export default function MarketAnalysis({ marketId }: { marketId: string }) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", marketId }),
      });
      const data = await res.json();

      if (data.ok) {
        setAnalysis(data.data.analysis);
      } else {
        setError(data.error || "Analysis failed");
      }
    } catch {
      setError("Failed to generate analysis. Please try again.");
    }

    setLoading(false);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader>AI Analysis</SectionHeader>
        {!analysis && (
          <Button size="sm" variant="secondary" onClick={generate} disabled={loading}>
            {loading ? "Analyzing…" : "Generate"}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 mb-2" role="alert">
          {error}
        </div>
      )}

      {loading && !analysis && (
        <div className="text-xs text-slate-500 animate-pulse py-4 text-center">
          Analyzing market data and arbitrage signals…
        </div>
      )}

      {analysis && (
        <div className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
          {analysis}
          <div className="mt-3 pt-2 border-t border-white/[0.04]">
            <Button size="sm" variant="ghost" onClick={generate} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh analysis"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
