"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface Point {
  timestamp: string;
  price: number;
}

export function PriceChart({ data, height = 200 }: { data: Point[]; height?: number }) {
  const cRef = useRef<HTMLCanvasElement>(null);
  const wRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 600, h: height });
  const [tip, setTip] = useState<{ x: number; p: number; t: string } | null>(null);

  useEffect(() => {
    if (!wRef.current) return;
    const o = new ResizeObserver(entries => {
      for (const e of entries) setDim({ w: e.contentRect.width, h: height });
    });
    o.observe(wRef.current);
    return () => o.disconnect();
  }, [height]);

  useEffect(() => {
    const c = cRef.current;
    if (!c || !data?.length) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = dim;
    c.width = w * dpr; c.height = h * dpr;
    c.style.width = w + "px"; c.style.height = h + "px";
    ctx.scale(dpr, dpr);

    const pad = { t: 12, r: 16, b: 28, l: 44 };
    const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const ps = data.map(d => d.price);
    const mn = Math.max(0, Math.min(...ps) - 0.05);
    const mx = Math.min(1, Math.max(...ps) + 0.05);
    const times = data.map(d => new Date(d.timestamp).getTime());
    const t0 = times[0], t1 = times[times.length - 1];
    const tR = t1 - t0 || 1;

    const xf = (t: number) => pad.l + ((t - t0) / tR) * cw;
    const yf = (p: number) => pad.t + (1 - (p - mn) / ((mx - mn) || 1)) * ch;

    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(148,163,184,0.08)";
    ctx.lineWidth = 1;
    for (let p = Math.ceil(mn * 10) / 10; p <= mx; p += 0.1) {
      const yy = yf(p);
      ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke();
      ctx.fillStyle = "rgba(148,163,184,0.4)";
      ctx.font = "11px 'DM Sans', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${(p * 100).toFixed(0)}%`, pad.l - 6, yy + 4);
    }

    const last = ps[ps.length - 1];
    const rgb = last > 0.5 ? "16,185,129" : "239,68,68";

    // Area fill
    const grd = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
    grd.addColorStop(0, `rgba(${rgb},0.12)`);
    grd.addColorStop(1, `rgba(${rgb},0.01)`);
    ctx.beginPath();
    ctx.moveTo(xf(times[0]), yf(ps[0]));
    for (let i = 1; i < data.length; i++) ctx.lineTo(xf(times[i]), yf(ps[i]));
    ctx.lineTo(xf(t1), pad.t + ch);
    ctx.lineTo(xf(t0), pad.t + ch);
    ctx.closePath();
    ctx.fillStyle = grd;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(xf(times[0]), yf(ps[0]));
    for (let i = 1; i < data.length; i++) ctx.lineTo(xf(times[i]), yf(ps[i]));
    ctx.strokeStyle = `rgb(${rgb})`;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // End dot
    ctx.beginPath();
    ctx.arc(xf(t1), yf(last), 4, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.fill();
  }, [data, dim]);

  const onMM = useCallback((e: React.MouseEvent) => {
    if (!data?.length || !wRef.current) return;
    const r = wRef.current.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const cw = dim.w - 44 - 16;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(((mx - 44) / cw) * (data.length - 1))));
    setTip({ x: mx, p: data[idx].price, t: data[idx].timestamp });
  }, [data, dim]);

  return (
    <div ref={wRef} className="relative w-full" onMouseMove={onMM} onMouseLeave={() => setTip(null)} role="img" aria-label="Price history chart">
      <canvas ref={cRef} className="block w-full" aria-hidden="true" />
      {tip && (
        <div className="absolute top-1 pointer-events-none rounded-md border border-white/[0.1] bg-[#0f1521]/95 px-2.5 py-1 text-xs font-mono text-slate-200 z-10"
          style={{ left: Math.min(tip.x, dim.w - 130) }}>
          {(tip.p * 100).toFixed(1)}% · {new Date(tip.t).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ data, width = 100, height = 28 }: { data: Point[]; width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || !data?.length) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr; c.height = height * dpr;
    c.style.width = width + "px"; c.style.height = height + "px";
    ctx.scale(dpr, dpr);

    const ps = data.map(d => d.price);
    const mn = Math.min(...ps), mx = Math.max(...ps), rg = mx - mn || 0.01;
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.price - mn) / rg) * (height - 4) - 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = ps[ps.length - 1] > 0.5 ? "#10b981" : "#ef4444";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();
  }, [data, width, height]);

  return <canvas ref={ref} className="block" />;
}
