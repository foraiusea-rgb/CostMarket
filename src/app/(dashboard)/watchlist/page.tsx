"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, SectionHeader, Loading, EmptyState, MarketTypeBadge, ProviderBadge } from "@/components/ui";
import type { WatchlistEntry } from "@/types";

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/watchlist").then(r => r.json()).then(d => {
      if (d.ok) setItems(d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const removeItem = async (marketId: string) => {
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", marketId }),
    });
    setItems(prev => prev.filter(i => i.marketId !== marketId));
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight mb-6">Watchlist</h1>

      {items.length === 0 ? (
        <EmptyState message="Your watchlist is empty. Star markets to track them."
          action={<Link href="/markets" className="text-blue-400 text-sm hover:underline">Browse Markets</Link>} />
      ) : (
        <div className="space-y-1.5">
          {items.map((item: WatchlistEntry) => (
            <Card key={item.id} className="px-4 py-3 flex items-center gap-3">
              <Link href={`/markets/${item.market.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <MarketTypeBadge type={item.market.type} />
                  <ProviderBadge provider={item.market.provider} />
                </div>
                <div className="text-xs font-medium truncate">{item.market.title}</div>
              </Link>
              <div className={`text-lg font-bold font-mono ${item.market.probability > 0.5 ? "text-emerald-400" : "text-red-400"}`}>
                {(item.market.probability * 100).toFixed(0)}%
              </div>
              <button onClick={() => removeItem(item.marketId)} className="text-slate-500 hover:text-red-400 text-xs transition-colors" aria-label="Remove from watchlist">✕</button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
