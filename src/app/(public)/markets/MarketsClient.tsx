"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, StatCard, SectionHeader, MarketTypeBadge, ProviderBadge, SeverityBadge } from "@/components/ui";
import { Sparkline } from "@/components/charts/PriceChart";
import type { Market, Insight, MarketType } from "@/types";

interface EnrichedMarket extends Market {
  probability: number;
  recentHistory: { timestamp: string; price: number }[];
}

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "api_threshold", label: "API Threshold" },
  { value: "subscription", label: "Subscription" },
  { value: "relative", label: "Relative" },
  { value: "task_cost", label: "Task Cost" },
];

const PROVIDER_OPTIONS = [
  { value: "all", label: "All Providers" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
];

export default function MarketsClient({ markets, insights }: { markets: EnrichedMarket[]; insights: Insight[] }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [provFilter, setProvFilter] = useState("all");
  const [sort, setSort] = useState("volume");

  const filtered = useMemo(() => {
    let ms = [...markets];
    if (typeFilter !== "all") ms = ms.filter(m => m.type === typeFilter);
    if (provFilter !== "all") ms = ms.filter(m => m.provider === provFilter || m.providers?.includes(provFilter));
    if (sort === "volume") ms.sort((a, b) => b.volume - a.volume);
    if (sort === "probability") ms.sort((a, b) => b.probability - a.probability);
    if (sort === "closing") ms.sort((a, b) => new Date(a.resolutionDate).getTime() - new Date(b.resolutionDate).getTime());
    return ms;
  }, [markets, typeFilter, provFilter, sort]);

  const totalVol = markets.reduce((s, m) => s + m.volume, 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
          AI Pricing<br />
          <span className="text-slate-500 font-light italic">Prediction Markets</span>
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-lg leading-relaxed">
          Trade on future API & subscription pricing. Discover mispricing. Make data-driven infrastructure decisions. All trading is simulated.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        <StatCard label="Active Markets" value={markets.length} color="text-blue-400" />
        <StatCard label="Total Volume" value={`$${totalVol.toLocaleString()}`} color="text-emerald-400" />
        <StatCard label="Arb Alerts" value={insights.length} color={insights.length > 0 ? "text-amber-400" : "text-slate-500"} />
        <StatCard label="Providers" value="3" color="text-purple-400" />
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-5">
          <SectionHeader>Arbitrage Insights ({insights.length})</SectionHeader>
          <div className="flex flex-col gap-1.5">
            {insights.slice(0, 3).map(ins => (
              <Link key={ins.id} href={`/markets/${ins.linkedMarketIds[0]}`}>
                <Card hover className="px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={ins.severity} />
                    <span className="text-xs font-semibold text-slate-200">{ins.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{ins.explanation}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {TYPE_OPTIONS.map(o => (
          <button key={o.value} onClick={() => setTypeFilter(o.value)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium border transition-colors ${
              typeFilter === o.value
                ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                : "border-white/[0.06] text-slate-500 hover:text-slate-300"
            }`}>
            {o.label}
          </button>
        ))}
        <div className="w-px h-5 bg-white/[0.06] mx-1" />
        {PROVIDER_OPTIONS.map(o => (
          <button key={o.value} onClick={() => setProvFilter(o.value)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium border transition-colors ${
              provFilter === o.value
                ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                : "border-white/[0.06] text-slate-500 hover:text-slate-300"
            }`}>
            {o.label}
          </button>
        ))}
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="ml-auto rounded-md border border-white/[0.06] bg-bg-2 px-2 py-1 text-[10px] text-slate-400 outline-none">
          <option value="volume">Volume</option>
          <option value="probability">Probability</option>
          <option value="closing">Closing Soon</option>
        </select>
      </div>

      {/* Market list */}
      <div className="flex flex-col gap-1.5">
        {filtered.map(m => (
          <Link key={m.id} href={`/markets/${m.id}`}>
            <Card hover className="px-4 py-3 grid grid-cols-[1fr_auto_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <MarketTypeBadge type={m.type} />
                  <ProviderBadge provider={m.provider} />
                  <span className="text-[8px] text-slate-500">
                    {new Date(m.resolutionDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="text-xs font-medium leading-snug text-slate-200 truncate">{m.title}</div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                  Vol ${m.volume.toLocaleString()} · {m.tradeCount} trades
                </div>
              </div>
              <div className="hidden sm:block">
                <Sparkline data={m.recentHistory} />
              </div>
              <div className="text-right min-w-[60px]">
                <div className={`text-xl font-bold font-mono ${m.probability > 0.5 ? "text-emerald-400" : "text-red-400"}`}>
                  {(m.probability * 100).toFixed(0)}%
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-500">No markets match your filters.</div>
        )}
      </div>
    </div>
  );
}
