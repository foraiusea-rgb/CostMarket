"use client";

import { useState, useEffect } from "react";
import { Card, SectionHeader, Loading } from "@/components/ui";
import type { FeatureFlag } from "@/types";

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/admin?resource=flags").then(r => r.json()).then(d => {
      if (d.ok) setFlags(d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(load, []);

  const toggle = async (key: string, enabled: boolean) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_flag", key, enabled }),
    });
    load();
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight mb-6">Feature Flags</h1>

      <div className="space-y-1.5">
        {flags.map((f: FeatureFlag) => (
          <Card key={f.id} className="px-4 py-3 flex items-center gap-4">
            <div className="flex-1">
              <div className="text-sm font-mono font-medium">{f.key}</div>
              <div className="text-[10px] text-slate-500">{f.description}</div>
            </div>
            <button onClick={() => toggle(f.key, !f.enabled)}
              role="switch"
              aria-checked={f.enabled}
              aria-label={`Toggle ${f.key}`}
              className={`relative w-10 h-5 rounded-full transition-colors ${f.enabled ? "bg-emerald-500/30" : "bg-slate-700"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${
                f.enabled ? "translate-x-5 bg-emerald-400" : "translate-x-0.5 bg-slate-500"
              }`} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
