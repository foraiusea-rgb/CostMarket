"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, StatCard, SectionHeader, Loading } from "@/components/ui";
import type { AdminOverview, AuditLog } from "@/types";

export default function AdminPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin?resource=overview").then(r => r.json()).then(d => {
      if (d.ok) setData(d.data); else setError(d.error);
    }).catch(() => setError("Failed to load admin data"));
    fetch("/api/admin?resource=audit").then(r => r.json()).then(d => {
      if (d.ok) setAudit(d.data || []);
    }).catch(() => {});
  }, []);

  if (error) return <div className="text-center py-12 text-sm text-red-400">{error}</div>;
  if (!data) return <Loading />;

  const links = [
    { href: "/admin/proposals", label: "Proposals", desc: "Review and approve market proposals" },
    { href: "/admin/markets", label: "Markets", desc: "Manage markets and status" },
    { href: "/admin/resolutions", label: "Resolutions", desc: "Review and resolve markets" },
    { href: "/admin/sources", label: "Sources", desc: "Pricing data sources" },
    { href: "/admin/users", label: "Users", desc: "User management" },
    { href: "/admin/flags", label: "Feature Flags", desc: "Toggle features" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight mb-6">Admin Console</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        <StatCard label="Markets" value={data.totalMarkets} color="text-blue-400" />
        <StatCard label="Open" value={data.openMarkets} color="text-emerald-400" />
        <StatCard label="Users" value={data.totalUsers} color="text-purple-400" />
        <StatCard label="Trades" value={data.totalTrades} color="text-amber-400" />
        <StatCard label="Volume" value={`$${data.totalVolume.toLocaleString()}`} color="text-emerald-400" />
        <StatCard label="Active Insights" value={data.activeInsights} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {links.map(l => (
          <Link key={l.href} href={l.href}>
            <Card hover className="p-4">
              <div className="text-sm font-semibold text-slate-200 mb-1">{l.label}</div>
              <div className="text-[10px] text-slate-500">{l.desc}</div>
            </Card>
          </Link>
        ))}
      </div>

      <SectionHeader>Recent Audit Log</SectionHeader>
      {audit.length === 0 ? (
        <div className="text-xs text-slate-500 py-4">No audit entries yet.</div>
      ) : (
        <div className="space-y-1">
          {audit.slice(0, 20).map((log: AuditLog) => (
            <Card key={log.id} className="px-3 py-2 text-[10px] flex items-center gap-3">
              <span className="text-slate-500 font-mono w-32 shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
              <span className="font-semibold text-blue-400 w-28 shrink-0">{log.action}</span>
              <span className="text-slate-400 truncate">{log.resource}/{log.resourceId}: {log.details}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
