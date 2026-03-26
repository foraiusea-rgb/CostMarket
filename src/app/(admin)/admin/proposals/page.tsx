"use client";

import { useState, useEffect } from "react";
import { Card, SectionHeader, Button, Loading, MarketTypeBadge, ProviderBadge } from "@/components/ui";
import type { Market } from "@/types";

/**
 * Admin Proposals Page
 * 
 * Shows all proposed markets. Admin can approve (opens the market)
 * or reject each one. Also has an "AI Generate" button to create
 * new proposals automatically.
 */
export default function AdminProposalsPage() {
  const [proposals, setProposals] = useState<(Market & { probability: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/markets/create?status=proposed").then(r => r.json()).then(d => {
      if (d.ok) setProposals(d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAction = async (marketId: string, action: "approve" | "reject") => {
    const res = await fetch("/api/markets/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, marketId }),
    });
    const data = await res.json();
    if (data.ok) load();
    else setError(data.error || "Action failed");
  };

  const generateAiMarkets = async () => {
    setAiLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "propose" }),
      });
      const data = await res.json();

      if (data.ok && data.data.proposals?.length > 0) {
        // Create each proposal as a "proposed" market
        for (const p of data.data.proposals) {
          await fetch("/api/markets/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "propose",
              ...p,
              threshold: p.threshold || undefined,
            }),
          });
        }
        load(); // Refresh the list
      } else {
        setError("AI couldn't generate proposals. Check OPENROUTER_API_KEY.");
      }
    } catch {
      setError("Failed to generate AI proposals.");
    }

    setAiLoading(false);
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Market Proposals ({proposals.length})</h1>
        <Button size="sm" variant="primary" onClick={generateAiMarkets} disabled={aiLoading}>
          {aiLoading ? "AI Generating…" : "🤖 AI Generate Markets"}
        </Button>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400" role="alert">{error}</div>}

      {proposals.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-500">
          No pending proposals. Click "AI Generate Markets" to create some, or users can propose markets at /propose.
        </div>
      ) : (
        <div className="space-y-2">
          {proposals.map(m => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <MarketTypeBadge type={m.type} />
                <ProviderBadge provider={m.provider} />
                <span className="text-[9px] text-slate-500 ml-auto">
                  {new Date(m.resolutionDate).toLocaleDateString()}
                </span>
              </div>
              <div className="text-sm font-semibold mb-1">{m.title}</div>
              <div className="text-[10px] text-slate-400 mb-2 leading-relaxed">{m.description}</div>
              <div className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                <span className="font-medium text-slate-400">Resolution:</span> {m.resolutionCriteria}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={() => handleAction(m.id, "approve")}>
                  Approve & Open
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleAction(m.id, "reject")}>
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
