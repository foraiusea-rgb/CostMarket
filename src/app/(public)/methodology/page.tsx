import { Card, SectionHeader } from "@/components/ui";

export default function MethodologyPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight mb-2">
        How It Works
      </h1>
      <p className="text-slate-400 text-sm mb-8 leading-relaxed">
        AI Cost Markets is a pricing intelligence platform that uses simulated prediction markets to forecast AI model pricing.
      </p>

      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold mb-3">What Are Prediction Markets?</h2>
          <div className="text-sm text-slate-400 leading-relaxed space-y-3">
            <p>Prediction markets aggregate collective forecasts into probabilities. Each market poses a specific question about future AI pricing — for example, &ldquo;Will GPT-4 class models cost ≤$2/1M tokens by Dec 2026?&rdquo;</p>
            <p>Traders buy Yes or No shares. The current price of a Yes share (between $0 and $1) represents the market&apos;s implied probability of that outcome.</p>
            <p>When a market resolves, Yes shares pay $1 if the outcome occurred, and $0 otherwise. No shares pay the inverse.</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold mb-3">LMSR Market Maker</h2>
          <div className="text-sm text-slate-400 leading-relaxed space-y-3">
            <p>AI Cost Markets uses the <strong className="text-slate-200">Logarithmic Market Scoring Rule (LMSR)</strong>, designed by Robin Hanson. LMSR provides continuous liquidity — you can always buy or sell.</p>
            <p>The cost function is: <code className="text-xs bg-bg-1 px-1.5 py-0.5 rounded font-mono text-blue-400">C(q) = b × ln(e^(q₁/b) + e^(q₂/b))</code></p>
            <p>Where <code className="text-xs font-mono text-slate-300">b</code> is the liquidity parameter (higher b = more liquidity, less price impact per trade), and <code className="text-xs font-mono text-slate-300">q₁, q₂</code> track the total shares bought for each outcome.</p>
            <p>The implied probability is: <code className="text-xs bg-bg-1 px-1.5 py-0.5 rounded font-mono text-blue-400">p₁ = e^(q₁/b) / (e^(q₁/b) + e^(q₂/b))</code></p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold mb-3">Market Types</h2>
          <div className="text-sm text-slate-400 leading-relaxed space-y-3">
            <p><strong className="text-blue-400">API Cost Threshold</strong> — Binary markets on whether a model class will reach a specific per-token price by a date.</p>
            <p><strong className="text-purple-400">Subscription Pricing</strong> — Markets on consumer subscription price changes (e.g., ChatGPT Plus price drops).</p>
            <p><strong className="text-amber-400">Relative Pricing</strong> — Which provider will be cheapest for a given model tier.</p>
            <p><strong className="text-emerald-400">Cost per Task</strong> — Real-world task costs (chatbot responses, agent hours) hitting specific thresholds.</p>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold mb-3">Resolution</h2>
          <div className="text-sm text-slate-400 leading-relaxed space-y-3">
            <p>Each market specifies its resolution criteria, data source, and normalization method. Resolution is based on <strong className="text-slate-200">official pricing from provider websites</strong> at the resolution date.</p>
            <p>Key normalization rules:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Only standard on-demand pricing counts (no batch discounts, no free tier)</li>
              <li>Input and output token pricing are tracked separately unless otherwise specified</li>
              <li>Temporary promotional pricing is excluded unless it becomes permanent</li>
              <li>Model class equivalence is determined by benchmark tier (e.g., MMLU ≥ 85th percentile for &ldquo;frontier&rdquo;)</li>
            </ul>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold mb-3">Arbitrage Detection</h2>
          <div className="text-sm text-slate-400 leading-relaxed space-y-3">
            <p>Our rule-based engine continuously scans markets for logical inconsistencies:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-slate-300">Time inconsistency</strong> — A later deadline with an easier target shouldn&apos;t be less likely</li>
              <li><strong className="text-slate-300">Threshold inconsistency</strong> — An easier threshold shouldn&apos;t have lower probability</li>
              <li><strong className="text-slate-300">Cross-provider</strong> — Relative pricing markets should be consistent with individual threshold markets</li>
              <li><strong className="text-slate-300">Task-to-token</strong> — Task cost markets should align with underlying token pricing</li>
            </ul>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold mb-3">Builder Dashboard</h2>
          <div className="text-sm text-slate-400 leading-relaxed space-y-3">
            <p>The builder generates cost projections for your specific workload across providers. Decline rates are <strong className="text-slate-200">adjusted by live market probabilities</strong> — when markets predict aggressive price cuts for a provider, projected costs decline faster.</p>
            <p>Recommendations (stay/switch/monitor) consider current cost gaps, projected trends, budget sensitivity, and quality preferences.</p>
          </div>
        </Card>

        <Card className="p-5 border-amber-500/10">
          <h2 className="font-display text-lg font-bold mb-3 text-amber-400">Disclosures</h2>
          <div className="text-sm text-slate-400 leading-relaxed space-y-3">
            <p><strong className="text-amber-300">Simulated trading.</strong> All trading on AI Cost Markets uses simulated currency. No real money is at stake. This is not a financial product.</p>
            <p><strong className="text-amber-300">Not financial advice.</strong> Market probabilities and builder recommendations are forecasting tools, not financial or business advice. Always do your own analysis.</p>
            <p><strong className="text-amber-300">No guarantee of accuracy.</strong> Market probabilities reflect collective trader sentiment, not objective truth. Resolution depends on third-party pricing decisions we do not control.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
