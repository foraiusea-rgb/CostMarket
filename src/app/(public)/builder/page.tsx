"use client";

import { useState, useEffect } from "react";
import { Card, SectionHeader, Select, Button } from "@/components/ui";
import type { BuilderRecommendation, BuilderProjection } from "@/types";

const PROVIDER_COLORS: Record<string, string> = { openai: "#10a37f", anthropic: "#d97706", google: "#4285f4" };
const PROVIDER_NAMES: Record<string, string> = { openai: "OpenAI", anthropic: "Anthropic", google: "Google DeepMind" };
const usd = (n: number, d = 2) => `$${n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;

export default function BuilderPage() {
  const [form, setForm] = useState({
    useCase: "chatbot",
    monthlyRequests: 100000,
    tier: "frontier",
    preferredProvider: "openai",
    budgetSensitivity: "medium",
    qualityPreference: "balanced",
  });
  const [result, setResult] = useState<BuilderRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const fetchRec = async () => {
    setLoading(true);
    const res = await fetch("/api/builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "recommend", ...form }),
    });
    const data = await res.json();
    if (data.ok) setResult(data.data);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => { fetchRec(); }, 400);
    return () => clearTimeout(timer);
  }, [form]);

  const up = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const saveScenario = async () => {
    const name = prompt("Name this scenario:", `${form.useCase} - ${form.tier}`);
    if (!name) return;
    const res = await fetch("/api/builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", name, ...form }),
    });
    const data = await res.json();
    setSaveMsg(data.ok ? "Saved!" : data.error || "Failed");
    setTimeout(() => setSaveMsg(""), 2000);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
          Cost Builder<br />
          <span className="text-slate-500 font-light italic">Dashboard</span>
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-lg leading-relaxed">
          Projections adjust dynamically based on live market probabilities. Your trades influence these recommendations.
        </p>
      </div>

      {/* Config */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <SectionHeader>Configure Scenario</SectionHeader>
          <div className="flex items-center gap-2">
            {saveMsg && <span className="text-[10px] text-emerald-400">{saveMsg}</span>}
            <Button size="sm" variant="secondary" onClick={saveScenario}>Save Scenario</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Select label="Use Case" value={form.useCase} onChange={e => up("useCase", e.target.value)}
            options={[
              { value: "chatbot", label: "Chatbot" },
              { value: "agent", label: "AI Agent" },
              { value: "summarizer", label: "Summarizer" },
              { value: "codegen", label: "Code Gen" },
            ]} />
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Monthly Requests</label>
            <input type="number" value={form.monthlyRequests} onChange={e => up("monthlyRequests", parseInt(e.target.value) || 0)}
              className="w-full rounded-md border border-white/[0.06] bg-bg-1 px-3 py-2 text-sm text-slate-100 font-mono outline-none" />
          </div>
          <Select label="Model Tier" value={form.tier} onChange={e => up("tier", e.target.value)}
            options={[{ value: "frontier", label: "Frontier" }, { value: "mid", label: "Mid-tier" }]} />
          <Select label="Current Provider" value={form.preferredProvider} onChange={e => up("preferredProvider", e.target.value)}
            options={[
              { value: "openai", label: "OpenAI" },
              { value: "anthropic", label: "Anthropic" },
              { value: "google", label: "Google" },
            ]} />
          <Select label="Budget Sensitivity" value={form.budgetSensitivity} onChange={e => up("budgetSensitivity", e.target.value)}
            options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]} />
          <Select label="Quality Pref" value={form.qualityPreference} onChange={e => up("qualityPreference", e.target.value)}
            options={[{ value: "highest", label: "Highest" }, { value: "balanced", label: "Balanced" }, { value: "cost_optimized", label: "Cost Opt" }]} />
        </div>
      </Card>

      {loading && <div className="text-center py-8 text-sm text-slate-500 font-mono animate-pulse">Computing projections…</div>}

      {result && !loading && (
        <>
          {/* Recommendation */}
          <div className={`rounded-[10px] border p-5 mb-4 ${
            result.action === "switch" ? "bg-amber-500/[0.04] border-amber-500/15" :
            result.action === "stay" ? "bg-emerald-500/[0.04] border-emerald-500/15" :
            "bg-blue-500/[0.04] border-blue-500/15"
          }`}>
            <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-2 ${
              result.action === "switch" ? "text-amber-400 bg-amber-500/15" :
              result.action === "stay" ? "text-emerald-400 bg-emerald-500/15" :
              "text-blue-400 bg-blue-500/15"
            }`}>{result.action.toUpperCase()}</span>
            <p className="text-sm text-slate-200 leading-relaxed">{result.explanation}</p>
          </div>

          {/* Table */}
          <Card className="p-5 mb-4 overflow-x-auto">
            <SectionHeader>Provider Comparison</SectionHeader>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Provider", "Model", "Current/mo", "Projected 12m", "Decline Rate", ""].map((h, i) => (
                    <th key={i} className="py-2 px-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.projections.map((r: BuilderProjection, i: number) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="py-2 px-2"><span className="font-semibold" style={{ color: PROVIDER_COLORS[r.provider] }}>{PROVIDER_NAMES[r.provider]}</span></td>
                    <td className="py-2 px-2 font-mono text-[10px]">{r.model}</td>
                    <td className="py-2 px-2 font-mono font-semibold">{usd(r.currentMonthlyCost)}</td>
                    <td className="py-2 px-2 font-mono font-semibold text-emerald-400">{usd(r.projected12mCost)}</td>
                    <td className="py-2 px-2 font-mono text-slate-400">{(r.marketAdjustedDecline * 100).toFixed(0)}%</td>
                    <td className="py-2 px-2">
                      {i === 0 && <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">BEST</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Assumptions */}
          <Card className="p-4">
            <SectionHeader>Methodology</SectionHeader>
            <div className="text-[11px] text-slate-400 leading-relaxed space-y-1">
              <p>Task: <span className="text-slate-300 font-medium">{result.task.label}</span> · Tokens/request: <span className="font-mono">{result.task.inputTokens} input + {result.task.outputTokens} output</span></p>
              <p>Decline rates are base historical rates adjusted by live market probability. When markets predict price drops (&gt;50%), decline rate increases. Your trades directly influence projections.</p>
              <p className="text-[10px] text-slate-500 italic mt-2">This is not financial advice. All projections are estimates based on current market data and simulated prediction market probabilities.</p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
