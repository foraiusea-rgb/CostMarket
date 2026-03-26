"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, SectionHeader, MarketTypeBadge, ProviderBadge, SeverityBadge, Button } from "@/components/ui";
import { PriceChart } from "@/components/charts/PriceChart";
import MarketAnalysis from "@/components/ai/MarketAnalysis";
import type { Market, Insight, UserPublic, Trade, TradePreview } from "@/types";

interface Props {
  market: Market & { probability: number };
  priceHistory: { timestamp: string; price: number }[];
  insights: Insight[];
  related: (Market & { probability: number })[];
}

const fmtD = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const usd = (n: number, d = 2) => `$${n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;

export default function MarketDetailClient({ market, priceHistory, insights, related }: Props) {
  const router = useRouter();
  const [shares, setShares] = useState(10);
  const [flash, setFlash] = useState<string | null>(null);
  const [previewYes, setPreviewYes] = useState<TradePreview | null>(null);
  const [previewNo, setPreviewNo] = useState<TradePreview | null>(null);
  const [user, setUser] = useState<UserPublic | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    fetch("/api/auth").then(r => r.json()).then(d => { if (d.ok && d.data) setUser(d.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/trades?marketId=${market.id}`).then(r => r.json()).then(d => { if (d.ok) setTrades(d.data || []); }).catch(() => {});
    fetch("/api/watchlist").then(r => r.json()).then(d => {
      if (d.ok) setIsWatched(d.data?.some((w: { marketId: string }) => w.marketId === market.id) || false);
    }).catch(() => {});
  }, [user, market.id]);

  useEffect(() => {
    if (!user) return;
    const fetchPreview = (dir: "yes" | "no") =>
      fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", marketId: market.id, direction: dir, shares }),
      }).then(r => r.json());

    fetchPreview("yes").then(d => { if (d.ok) setPreviewYes(d.data); }).catch(() => {});
    fetchPreview("no").then(d => { if (d.ok) setPreviewNo(d.data); }).catch(() => {});
  }, [shares, user, market.id]);

  const doTrade = async (direction: "yes" | "no") => {
    if (!user) { setFlash("Please sign in to trade"); setTimeout(() => setFlash(null), 2500); return; }
    const res = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "execute", marketId: market.id, direction, shares }),
    });
    const data = await res.json();
    if (data.ok) {
      setFlash(`Bought ${shares} ${direction.toUpperCase()} for ${usd(data.data.trade.cost)}`);
      setTimeout(() => { setFlash(null); router.refresh(); }, 1500);
    } else {
      setFlash(data.error || "Trade failed");
      setTimeout(() => setFlash(null), 2500);
    }
  };

  const toggleWatch = async () => {
    if (!user) return;
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: isWatched ? "remove" : "add", marketId: market.id }),
    });
    setIsWatched(!isWatched);
  };

  const prob = market.probability;

  return (
    <div>
      <Link href="/markets" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors mb-3 inline-block">← Markets</Link>

      {/* Header */}
      <Card className="p-5 mb-4">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <MarketTypeBadge type={market.type} />
          <ProviderBadge provider={market.provider} />
          {user && (
            <button onClick={toggleWatch} className="ml-auto text-[10px] text-slate-500 hover:text-amber-400 transition-colors">
              {isWatched ? "★ Watching" : "☆ Watch"}
            </button>
          )}
        </div>
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight leading-snug mb-4">{market.title}</h1>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">{market.description}</p>
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">Probability</div>
            <div className={`text-3xl font-bold font-mono ${prob > 0.5 ? "text-emerald-400" : "text-red-400"}`}>{(prob * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">Volume</div>
            <div className="text-base font-semibold font-mono">${market.volume.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">Trades</div>
            <div className="text-base font-semibold font-mono">{market.tradeCount}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">Closes</div>
            <div className="text-sm text-slate-300">{fmtD(market.resolutionDate)}</div>
          </div>
        </div>
      </Card>

      {/* Chart */}
      <Card className="p-4 mb-4">
        <SectionHeader>Price History ({priceHistory.length} points)</SectionHeader>
        <PriceChart data={priceHistory} />
      </Card>

      {/* Trade + History grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Trade Ticket */}
        <Card className="p-4">
          <SectionHeader>Trade</SectionHeader>

          {flash && (
            <div className={`mb-3 rounded-md px-3 py-2 text-xs font-medium border ${
              flash.includes("failed") || flash.includes("Insufficient") || flash.includes("sign in")
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}>{flash}</div>
          )}

          <div className="mb-3">
            <label className="block text-[9px] text-slate-500 mb-1.5">Shares</label>
            <div className="flex gap-1.5">
              {[1, 5, 10, 25, 50, 100].map(n => (
                <button key={n} onClick={() => setShares(n)}
                  className={`flex-1 rounded-md py-1.5 text-[11px] font-mono font-semibold border transition-colors ${
                    shares === n
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                      : "border-white/[0.06] bg-bg-1 text-slate-400"
                  }`}>{n}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => doTrade("yes")}
              className="rounded-md bg-emerald-500/10 border border-emerald-500/20 py-3 text-center transition-colors hover:bg-emerald-500/20">
              <div className="text-sm font-bold text-emerald-400">Buy Yes</div>
              <div className="text-[10px] font-mono text-emerald-400/70 mt-0.5">
                {previewYes ? usd(previewYes.cost) : "—"}
              </div>
            </button>
            <button onClick={() => doTrade("no")}
              className="rounded-md bg-red-500/10 border border-red-500/20 py-3 text-center transition-colors hover:bg-red-500/20">
              <div className="text-sm font-bold text-red-400">Buy No</div>
              <div className="text-[10px] font-mono text-red-400/70 mt-0.5">
                {previewNo ? usd(previewNo.cost) : "—"}
              </div>
            </button>
          </div>

          <div className="rounded-md bg-bg-1 p-2.5 text-[10px] text-slate-500 space-y-1">
            <div className="flex justify-between"><span>Yes price:</span><span className="font-mono text-emerald-400">{usd(prob, 3)}</span></div>
            <div className="flex justify-between"><span>No price:</span><span className="font-mono text-red-400">{usd(1 - prob, 3)}</span></div>
            {previewYes && (
              <>
                <div className="border-t border-white/[0.04] pt-1 flex justify-between">
                  <span>Yes price impact:</span><span className="font-mono">{(previewYes.priceImpact * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Payout if Yes ({shares}sh):</span><span className="font-mono text-emerald-400">{usd(previewYes.potentialPayout)}</span>
                </div>
                {previewNo && (
                  <div className="flex justify-between">
                    <span>Payout if No ({shares}sh):</span><span className="font-mono text-red-400">{usd(previewNo.potentialPayout)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Trade History */}
        <Card className="p-4">
          <SectionHeader>Your Trades ({trades.length})</SectionHeader>
          {trades.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">{user ? "No trades yet." : "Sign in to trade."}</div>
          ) : (
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              {trades.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-[10px] py-1.5 border-b border-white/[0.04]">
                  <span className={`font-mono font-semibold ${t.direction === "yes" ? "text-emerald-400" : "text-red-400"}`}>
                    {t.direction.toUpperCase()}
                  </span>
                  <span className="font-mono text-slate-400">{t.shares}sh</span>
                  <span className="font-mono text-slate-400">{usd(t.cost)}</span>
                  <span className="text-slate-500 text-[8px]">
                    {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Resolution Rules */}
      <Card className="p-4 mb-4">
        <SectionHeader>Resolution Rules</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ResField label="Criteria" value={market.resolutionCriteria} />
          <ResField label="Source" value={market.resolutionSourceName} link={market.resolutionSourceUrl} />
          <ResField label="Normalization" value={market.normalizationNotes} />
          <ResField label="Method" value={market.normalizationMethod.replace(/_/g, " ")} />
          {market.equivalenceTier && <ResField label="Equivalence Tier" value={market.equivalenceTier} />}
          {market.benchmarkTier && <ResField label="Benchmark Tier" value={market.benchmarkTier} />}
          <ResField label="Resolution Date" value={fmtD(market.resolutionDate)} />
          <ResField label="Status" value={market.resolutionStatus} />
        </div>
      </Card>

      {/* AI Analysis */}
      <MarketAnalysis marketId={market.id} />

      {/* Insights + Related */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.length > 0 && (
          <Card className="p-4">
            <SectionHeader>Arbitrage Insights</SectionHeader>
            {insights.map(ins => (
              <div key={ins.id} className="rounded-md border border-white/[0.04] bg-bg-1 p-2.5 mb-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <SeverityBadge severity={ins.severity} />
                  <span className="text-[11px] font-semibold">{ins.title}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">{ins.explanation}</p>
              </div>
            ))}
          </Card>
        )}
        {related.length > 0 && (
          <Card className="p-4">
            <SectionHeader>Related Markets</SectionHeader>
            {related.map(rm => (
              <Link key={rm.id} href={`/markets/${rm.id}`}>
                <div className="rounded-md border border-white/[0.04] bg-bg-1 p-2.5 mb-1.5 hover:border-white/[0.1] transition-colors">
                  <div className="text-[10px] font-medium leading-snug mb-1">{rm.title}</div>
                  <span className={`text-sm font-bold font-mono ${rm.probability > 0.5 ? "text-emerald-400" : "text-red-400"}`}>
                    {(rm.probability * 100).toFixed(0)}%
                  </span>
                </div>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

function ResField({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div>
      <div className="text-[8px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">{label}</div>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:underline leading-relaxed">
          {value} ↗
        </a>
      ) : (
        <div className="text-[11px] text-slate-400 leading-relaxed">{value}</div>
      )}
    </div>
  );
}
