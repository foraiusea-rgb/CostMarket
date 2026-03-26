"use client";

import { useState, useEffect } from "react";
import { Card, SectionHeader, Button, Loading, MarketTypeBadge, ProviderBadge } from "@/components/ui";
import type { Market } from "@/types";

export default function AdminMarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/admin?resource=markets").then(r => r.json()).then(d => {
      if (d.ok) setMarkets(d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(load, []);

  const updateStatus = async (marketId: string, status: string) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_market_status", marketId, status }),
    });
    load();
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight mb-6">Markets ({markets.length})</h1>

      <div className="space-y-1.5">
        {markets.map((m: Market) => (
          <Card key={m.id} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <MarketTypeBadge type={m.type} />
              <ProviderBadge provider={m.provider} />
              <span className={`text-[9px] font-mono font-semibold ml-auto ${
                m.status === "open" ? "text-emerald-400" : m.status === "resolved" ? "text-blue-400" : "text-slate-500"
              }`}>{m.status.toUpperCase()}</span>
            </div>
            <div className="text-xs font-medium mb-2">{m.title}</div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-slate-500 font-mono">Vol ${m.volume.toLocaleString()} · {m.tradeCount} trades</span>
              <div className="ml-auto flex gap-1">
                {m.status === "open" && <Button size="sm" variant="ghost" onClick={() => updateStatus(m.id, "closed")}>Close</Button>}
                {m.status === "closed" && <Button size="sm" variant="ghost" onClick={() => updateStatus(m.id, "open")}>Reopen</Button>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
