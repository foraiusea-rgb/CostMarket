"use client";

import { useState } from "react";
import { Card, SectionHeader, Button } from "@/components/ui";

interface BuilderResult {
  action: string;
  explanation: string;
  projections: { provider: string; currentMonthlyCost: number; projected12mCost: number; marketAdjustedDecline: number }[];
  bestProvider: string;
}

interface FormInputs {
  useCase: string;
  monthlyRequests: number;
  tier: string;
  preferredProvider: string;
}

/**
 * BuilderAdvisor — AI-powered strategic advice shown below builder projections.
 * 
 * Takes the builder's formula output and asks the AI to provide deeper
 * strategic analysis considering factors the formula can't capture.
 */
export default function BuilderAdvisor({ builderResult, formInputs }: { builderResult: BuilderResult; formInputs: FormInputs }) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advise", builderResult, formInputs }),
      });
      const data = await res.json();

      if (data.ok) {
        setAdvice(data.data.advice);
      } else {
        setError(data.error || "Failed to get advice");
      }
    } catch {
      setError("Failed to generate advice. Please try again.");
    }

    setLoading(false);
  };

  return (
    <Card className="p-4 border-blue-500/10">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader>🤖 AI Strategy Advisor</SectionHeader>
        {!advice && (
          <Button size="sm" variant="secondary" onClick={generate} disabled={loading}>
            {loading ? "Thinking…" : "Get AI Advice"}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 mb-2" role="alert">
          {error}
        </div>
      )}

      {loading && !advice && (
        <div className="text-xs text-slate-500 animate-pulse py-4 text-center">
          Analyzing your scenario against live market data…
        </div>
      )}

      {advice && (
        <div className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
          {advice}
          <div className="mt-3 pt-2 border-t border-white/[0.04]">
            <Button size="sm" variant="ghost" onClick={generate} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh advice"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
