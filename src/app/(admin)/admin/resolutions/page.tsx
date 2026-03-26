"use client";

import { useState, useEffect } from "react";
import { Card, SectionHeader, Button, Loading, MarketTypeBadge, ProviderBadge } from "@/components/ui";
import type { Market } from "@/types";
import { useRouter } from "next/navigation";

export default function AdminResolutionsPage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/admin?resource=resolutions").then(r => r.json()).then(d => {
      if (d.ok) setMarkets(d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(load, []);

  const resolve = async (marketId: string, outcome: string) => {
    const notes = prompt("Resolution notes (optional):", "");
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve_market", marketId, outcome, value: outcome === "yes" ? 1 : 0, notes }),
    });
    const data = await res.json();
    if (data.ok) { alert("Market resolved."); load(); }
    else alert(data.error || "Failed");
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight mb-6">Resolution Queue</h1>

      {markets.length === 0 ? (
        <div className="text-sm text-slate-500 py-8 text-center">No markets pending resolution.</div>
      ) : (
        <div className="space-y-2">
          {markets.map((m: Market) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <MarketTypeBadge type={m.type} />
                <ProviderBadge provider={m.provider} />
                <span className="text-[9px] text-slate-500 ml-auto">
                  Resolves {new Date(m.resolutionDate).toLocaleDateString()}
                </span>
              </div>
              <div className="text-sm font-semibold mb-2">{m.title}</div>
              <div className="text-[10px] text-slate-400 mb-3 leading-relaxed">{m.resolutionCriteria}</div>
              <div className="text-[10px] text-slate-500 mb-3">
                Source: <a href={m.resolutionSourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400">{m.resolutionSourceName} ↗</a>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={() => resolve(m.id, "yes")}>Resolve YES</Button>
                <Button size="sm" variant="danger" onClick={() => resolve(m.id, "no")}>Resolve NO</Button>
                <Button size="sm" variant="ghost" onClick={() => resolve(m.id, "void")}>Void</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
