"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, SectionHeader, Loading, EmptyState } from "@/components/ui";
import type { BuilderScenario } from "@/types";

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<BuilderScenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/builder").then(r => r.json()).then(d => {
      if (d.ok) setScenarios(d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight mb-6">Saved Scenarios</h1>

      {scenarios.length === 0 ? (
        <EmptyState message="No saved scenarios. Create one in the Builder dashboard."
          action={<Link href="/builder" className="text-blue-400 text-sm hover:underline">Open Builder</Link>} />
      ) : (
        <div className="space-y-1.5">
          {scenarios.map(s => (
            <Card key={s.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    {s.useCase} · {s.monthlyRequests.toLocaleString()} req/mo · {s.tier} · {s.preferredProvider}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500">
                  {new Date(s.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
