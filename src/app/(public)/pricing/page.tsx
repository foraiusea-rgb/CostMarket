import { Card, Button } from "@/components/ui";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-2">Pricing</h1>
        <p className="text-slate-400 text-sm">Start free. Upgrade when you need more.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Free */}
        <Card className="p-6">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Free</div>
          <div className="text-3xl font-bold font-mono mb-1">$0</div>
          <div className="text-xs text-slate-500 mb-6">Forever</div>
          <ul className="text-sm text-slate-400 space-y-2 mb-6">
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span> Browse all markets</li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span> Simulated trading ($10k balance)</li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span> Builder dashboard</li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span> Arbitrage insights</li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span> Portfolio tracking</li>
            <li className="flex items-start gap-2"><span className="text-slate-600 mt-0.5">—</span><span className="text-slate-600"> 3 saved scenarios</span></li>
            <li className="flex items-start gap-2"><span className="text-slate-600 mt-0.5">—</span><span className="text-slate-600"> 5 watchlist items</span></li>
          </ul>
          <Link href="/signup">
            <Button variant="secondary" className="w-full">Get Started</Button>
          </Link>
        </Card>

        {/* Pro */}
        <Card className="p-6 border-blue-500/15 relative">
          <div className="absolute top-3 right-3 text-[8px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Popular</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-1">Pro</div>
          <div className="text-3xl font-bold font-mono mb-1">$19<span className="text-lg text-slate-500">/mo</span></div>
          <div className="text-xs text-slate-500 mb-6">Billed monthly</div>
          <ul className="text-sm text-slate-400 space-y-2 mb-6">
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span> Everything in Free</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> Unlimited saved scenarios</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> Unlimited watchlist</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> Price alerts</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> AI-powered insight summaries</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> Export data (CSV)</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">✓</span> Priority support</li>
          </ul>
          <Link href="/signup">
            <Button variant="primary" className="w-full">Start Pro Trial</Button>
          </Link>
        </Card>
      </div>

      <div className="text-center mt-8 text-xs text-slate-500">
        All trading is simulated. No real money involved. <Link href="/methodology" className="text-blue-400 hover:underline">Learn more</Link>
      </div>
    </div>
  );
}
