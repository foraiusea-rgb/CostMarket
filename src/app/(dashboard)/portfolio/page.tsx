"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, StatCard, SectionHeader, Loading, EmptyState } from "@/components/ui";
import type { PortfolioData, EnrichedPosition } from "@/types";

const usd = (n: number, d = 2) => `$${n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio").then(r => r.json()).then(d => {
      if (d.ok) setData(d.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return <EmptyState message="Sign in to view your portfolio." action={<Link href="/login" className="text-blue-400 text-sm hover:underline">Sign In</Link>} />;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight mb-6">Portfolio</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <StatCard label="Cash Balance" value={usd(data.balance)} color="text-emerald-400" />
        <StatCard label="Market Value" value={usd(data.totalMarketValue)} color="text-blue-400" />
        <StatCard label="Unrealized P&L" value={usd(data.totalUnrealizedPnl)}
          color={data.totalUnrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"} />
        <StatCard label="Portfolio Value" value={usd(data.portfolioValue)} color="text-slate-200" />
      </div>

      <SectionHeader>Positions ({data.positions.length})</SectionHeader>

      {data.positions.length === 0 ? (
        <EmptyState message="No positions yet. Start trading to build your portfolio."
          action={<Link href="/markets" className="text-blue-400 text-sm hover:underline">Browse Markets</Link>} />
      ) : (
        <div className="space-y-1.5">
          {data.positions.map((p: EnrichedPosition) => (
            <Link key={p.id} href={`/markets/${p.marketId}`}>
              <Card hover className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto] items-center gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{p.marketTitle}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    <span className={`font-mono font-semibold ${p.direction === "yes" ? "text-emerald-400" : "text-red-400"}`}>
                      {p.direction.toUpperCase()}
                    </span>
                    {" · "}{p.shares} shares · avg {usd(p.avgPrice, 3)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono">{usd(p.marketValue)}</div>
                  <div className="text-[9px] text-slate-500">value</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-mono ${p.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {p.unrealizedPnl >= 0 ? "+" : ""}{usd(p.unrealizedPnl)}
                  </div>
                  <div className="text-[9px] text-slate-500">P&L</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-mono ${
                    p.marketStatus === "open" ? "text-emerald-400" : "text-slate-500"
                  }`}>{p.marketStatus}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
