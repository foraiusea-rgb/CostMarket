"use client";

import { useState, useEffect } from "react";
import { Card, SectionHeader, Loading } from "@/components/ui";
import type { Provider, ProviderPricingSnapshot } from "@/types";

export default function AdminSourcesPage() {
  const [data, setData] = useState<{ providers: Provider[]; snapshots: ProviderPricingSnapshot[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin?resource=sources").then(r => r.json()).then(d => {
      if (d.ok) setData(d.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return <div className="text-sm text-slate-500 py-8 text-center">Failed to load sources.</div>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight mb-6">Pricing Sources</h1>

      <SectionHeader>Providers ({data.providers.length})</SectionHeader>
      <div className="space-y-1.5 mb-6">
        {data.providers.map((p: Provider) => (
          <Card key={p.id} className="px-4 py-3 flex items-center gap-4">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
            <div className="flex-1">
              <div className="text-sm font-semibold">{p.name}</div>
              <div className="text-[10px] text-slate-500">{p.slug}</div>
            </div>
            <a href={p.pricingUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline">
              Pricing Page ↗
            </a>
          </Card>
        ))}
      </div>

      <SectionHeader>Pricing Snapshots ({data.snapshots.length})</SectionHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {["Provider", "Model", "Tier", "Input/1M", "Output/1M", "Effective Date", "Source"].map(h => (
                <th key={h} className="py-2 px-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.snapshots.map((s: ProviderPricingSnapshot) => (
              <tr key={s.id} className="border-b border-white/[0.04]">
                <td className="py-2 px-2 font-medium">{s.providerId}</td>
                <td className="py-2 px-2 font-mono">{s.model}</td>
                <td className="py-2 px-2">{s.tier}</td>
                <td className="py-2 px-2 font-mono">${s.inputPer1M}</td>
                <td className="py-2 px-2 font-mono">${s.outputPer1M}</td>
                <td className="py-2 px-2">{s.effectiveDate}</td>
                <td className="py-2 px-2">
                  <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">↗</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
