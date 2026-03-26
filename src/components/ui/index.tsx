"use client";

import type { MarketType, Severity } from "@/types";

// --- Badge Components ---

const TYPE_STYLES: Record<MarketType, { bg: string; text: string; border: string; label: string }> = {
  api_threshold: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", label: "API Threshold" },
  subscription: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", label: "Subscription" },
  relative: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "Relative" },
  task_cost: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Task Cost" },
};

export function MarketTypeBadge({ type }: { type: MarketType }) {
  const s = TYPE_STYLES[type] || TYPE_STYLES.api_threshold;
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97706",
  google: "#4285f4",
};
const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google DeepMind",
};

export function ProviderBadge({ provider }: { provider: string }) {
  const hex = PROVIDER_COLORS[provider] || "#94a3b8";
  const name = PROVIDER_NAMES[provider] || provider;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border"
      style={{ color: hex, backgroundColor: `rgba(${r},${g},${b},0.1)`, borderColor: `rgba(${r},${g},${b},0.2)` }}>
      {name}
    </span>
  );
}

export function ProbabilityBadge({ probability }: { probability: number }) {
  const pct = (probability * 100).toFixed(0);
  const color = probability > 0.5 ? "text-emerald-400" : "text-red-400";
  return <span className={`font-mono font-bold ${color}`}>{pct}%</span>;
}

const SEV_STYLES: Record<Severity, { bg: string; border: string; text: string; label: string }> = {
  high: { bg: "bg-red-500/[0.06]", border: "border-red-500/20", text: "text-red-400", label: "HIGH" },
  medium: { bg: "bg-amber-500/[0.06]", border: "border-amber-500/20", text: "text-amber-400", label: "MED" },
  low: { bg: "bg-blue-500/[0.06]", border: "border-blue-500/20", text: "text-blue-400", label: "LOW" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEV_STYLES[severity];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${s.text}`}
      style={{ backgroundColor: `${s.text === "text-red-400" ? "rgba(239,68,68,0.1)" : s.text === "text-amber-400" ? "rgba(245,158,11,0.1)" : "rgba(59,130,246,0.1)"}` }}>
      {s.label}
    </span>
  );
}

// --- Card ---

export function Card({ children, className = "", hover = false, onClick }: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-[10px] border border-white/[0.06] bg-bg-2 transition-all duration-200 ${
        hover ? "cursor-pointer hover:border-white/[0.12] hover:bg-bg-3 hover:shadow-[0_0_24px_rgba(59,130,246,0.04)] hover:-translate-y-[1px]" : ""
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// --- Stat Card ---

export function StatCard({ label, value, color = "text-blue-400" }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-slate-400 mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
    </Card>
  );
}

// --- Section Header ---

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500 mb-2.5">
      {children}
    </div>
  );
}

// --- Empty State ---

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-slate-500 mb-3">{message}</p>
      {action}
    </div>
  );
}

// --- Loading ---

export function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" />
      </div>
      <div className="text-xs font-mono text-slate-500">Loading…</div>
    </div>
  );
}

// --- Button ---

export function Button({ children, variant = "primary", size = "md", onClick, disabled, className = "" }: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  className?: string;
}) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-0 active:scale-[0.98]";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25",
    secondary: "bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:bg-white/[0.08]",
    danger: "bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25",
    ghost: "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]",
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

// --- Input ---

let _inputCounter = 0;

export function Input({ label, id: providedId, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = providedId || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}-${++_inputCounter}` : undefined);
  return (
    <div>
      {label && <label htmlFor={id} className="block text-[10px] font-medium text-slate-500 mb-1">{label}</label>}
      <input
        id={id}
        aria-label={!label ? props.placeholder || undefined : undefined}
        {...props}
        className={`w-full rounded-md border border-white/[0.06] bg-bg-1 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20 ${props.className || ""}`}
      />
    </div>
  );
}

let _selectCounter = 0;

export function Select({ label, options, id: providedId, ...props }: { label?: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = providedId || (label ? `select-${label.toLowerCase().replace(/\s+/g, "-")}-${++_selectCounter}` : undefined);
  return (
    <div>
      {label && <label htmlFor={id} className="block text-[10px] font-medium text-slate-500 mb-1">{label}</label>}
      <select
        id={id}
        aria-label={!label ? undefined : undefined}
        {...props}
        className={`w-full rounded-md border border-white/[0.06] bg-bg-1 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/30 ${props.className || ""}`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
