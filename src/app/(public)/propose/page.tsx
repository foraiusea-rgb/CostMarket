"use client";

import { useState } from "react";
import { Card, SectionHeader, Button, Input, Select } from "@/components/ui";

/**
 * Propose Market Page
 * 
 * Any logged-in user can propose a new prediction market.
 * Proposals go to the admin approval queue.
 * Also includes an "AI Suggest" button that generates market ideas.
 */
export default function ProposePage() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "api_threshold",
    provider: "openai",
    threshold: "",
    metric: "input_per_1m",
    resolutionDate: "",
    resolutionCriteria: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const up = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/markets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "propose",
          ...form,
          threshold: form.threshold ? parseFloat(form.threshold) : undefined,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setSuccess("Market proposed! It will appear once an admin approves it.");
        setForm({ title: "", description: "", type: "api_threshold", provider: "openai", threshold: "", metric: "input_per_1m", resolutionDate: "", resolutionCriteria: "" });
      } else {
        setError(data.error || "Failed to submit proposal");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  const getAiSuggestions = async () => {
    setAiLoading(true);
    setAiSuggestions([]);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "propose" }),
      });
      const data = await res.json();

      if (data.ok && data.data.proposals?.length > 0) {
        setAiSuggestions(data.data.proposals);
      } else {
        setError("AI couldn't generate suggestions. Try again.");
      }
    } catch {
      setError("Failed to get AI suggestions.");
    }

    setAiLoading(false);
  };

  const fillFromSuggestion = (s: any) => {
    setForm({
      title: s.title || "",
      description: s.description || "",
      type: s.type || "api_threshold",
      provider: s.provider || "openai",
      threshold: s.threshold?.toString() || "",
      metric: s.metric || "input_per_1m",
      resolutionDate: s.resolutionDate || "",
      resolutionCriteria: s.resolutionCriteria || "",
    });
    setAiSuggestions([]);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Propose a Market</h1>
        <p className="text-slate-400 text-sm mt-1">Suggest a new prediction market. An admin will review and approve it.</p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400" role="alert">{error}</div>}
      {success && <div className="mb-4 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400">{success}</div>}

      {/* AI Suggestions */}
      <Card className="p-4 mb-4 border-blue-500/10">
        <div className="flex items-center justify-between mb-2">
          <SectionHeader>🤖 AI Market Ideas</SectionHeader>
          <Button size="sm" variant="secondary" onClick={getAiSuggestions} disabled={aiLoading}>
            {aiLoading ? "Generating…" : "Get AI Ideas"}
          </Button>
        </div>
        {aiLoading && <div className="text-xs text-slate-500 animate-pulse py-3 text-center">AI is analyzing market gaps…</div>}
        {aiSuggestions.length > 0 && (
          <div className="space-y-2">
            {aiSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => fillFromSuggestion(s)}
                className="w-full text-left rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] transition-colors"
              >
                <div className="text-xs font-medium text-slate-200 mb-1">{s.title}</div>
                <div className="text-[10px] text-slate-500">{s.rationale || s.description}</div>
              </button>
            ))}
            <p className="text-[9px] text-slate-600 text-center">Click a suggestion to fill the form below</p>
          </div>
        )}
      </Card>

      {/* Proposal Form */}
      <Card className="p-5">
        <SectionHeader>Market Details</SectionHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Question / Title" value={form.title} onChange={e => up("title", e.target.value)} placeholder="Will GPT-5 cost ≤ $1/1M tokens by Dec 2026?" required />
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => up("description", e.target.value)}
              placeholder="Describe what this market is about and why it matters…"
              required
              rows={3}
              className="w-full rounded-md border border-white/[0.06] bg-bg-1 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Market Type" value={form.type} onChange={e => up("type", e.target.value)} options={[
              { value: "api_threshold", label: "API Threshold" },
              { value: "subscription", label: "Subscription" },
              { value: "relative", label: "Relative" },
              { value: "task_cost", label: "Task Cost" },
            ]} />
            <Select label="Provider" value={form.provider} onChange={e => up("provider", e.target.value)} options={[
              { value: "openai", label: "OpenAI" },
              { value: "anthropic", label: "Anthropic" },
              { value: "google", label: "Google" },
            ]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Threshold (e.g., 2.0 for $2/1M)" value={form.threshold} onChange={e => up("threshold", e.target.value)} placeholder="Optional" type="number" step="0.01" />
            <Input label="Resolution Date" value={form.resolutionDate} onChange={e => up("resolutionDate", e.target.value)} type="date" required />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Resolution Criteria</label>
            <textarea
              value={form.resolutionCriteria}
              onChange={e => up("resolutionCriteria", e.target.value)}
              placeholder="Exact criteria for resolving yes/no…"
              required
              rows={2}
              className="w-full rounded-md border border-white/[0.06] bg-bg-1 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <Button onClick={() => {}} disabled={loading} className="w-full">
            {loading ? "Submitting…" : "Submit Proposal"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
