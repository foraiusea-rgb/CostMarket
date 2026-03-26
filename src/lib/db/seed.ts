/**
 * Seed Data
 * 
 * Generates initial markets, providers, pricing snapshots, and benchmark tiers.
 * Intentionally creates some arbitrage-detectable inconsistencies.
 */

import { db } from "@/lib/db";
import { createState, probYes } from "@/lib/engine/lmsr";
import { detectAllInsights } from "@/lib/engine/arbitrage";
import type { Market, Provider, ProviderPricingSnapshot, BenchmarkTier, PricePoint, FeatureFlag } from "@/types";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function generatePriceHistory(marketId: string, startProb: number, volatility: number, days: number = 90): PricePoint[] {
  const points: PricePoint[] = [];
  let p = startProb;
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    p += (Math.random() - 0.48) * volatility;
    p = Math.max(0.03, Math.min(0.97, p));
    points.push({
      id: uid(),
      marketId,
      price: Math.round(p * 1000) / 1000,
      timestamp: new Date(now - i * 86400000).toISOString(),
    });
  }
  return points;
}

export function seed(): void {
  if (db.isSeeded()) return;

  // --- Providers ---
  const providers: Provider[] = [
    { id: "openai", slug: "openai", name: "OpenAI", color: "#10a37f", website: "https://openai.com", pricingUrl: "https://openai.com/api/pricing" },
    { id: "anthropic", slug: "anthropic", name: "Anthropic", color: "#d97706", website: "https://anthropic.com", pricingUrl: "https://www.anthropic.com/pricing" },
    { id: "google", slug: "google", name: "Google DeepMind", color: "#4285f4", website: "https://deepmind.google", pricingUrl: "https://ai.google.dev/pricing" },
  ];
  db.providers.replaceAll(providers);

  // --- Pricing Snapshots ---
  const snapshots: ProviderPricingSnapshot[] = [
    { id: uid(), providerId: "openai", model: "GPT-4o", tier: "frontier", inputPer1M: 2.5, outputPer1M: 10.0, effectiveDate: "2025-03-01", sourceUrl: "https://openai.com/api/pricing", createdAt: new Date().toISOString() },
    { id: uid(), providerId: "openai", model: "GPT-4o-mini", tier: "mid", inputPer1M: 0.15, outputPer1M: 0.6, effectiveDate: "2025-03-01", sourceUrl: "https://openai.com/api/pricing", createdAt: new Date().toISOString() },
    { id: uid(), providerId: "anthropic", model: "Claude Sonnet 4", tier: "frontier", inputPer1M: 3.0, outputPer1M: 15.0, effectiveDate: "2025-03-01", sourceUrl: "https://www.anthropic.com/pricing", createdAt: new Date().toISOString() },
    { id: uid(), providerId: "anthropic", model: "Claude Haiku 3.5", tier: "mid", inputPer1M: 0.8, outputPer1M: 4.0, effectiveDate: "2025-03-01", sourceUrl: "https://www.anthropic.com/pricing", createdAt: new Date().toISOString() },
    { id: uid(), providerId: "google", model: "Gemini 2.0 Pro", tier: "frontier", inputPer1M: 1.25, outputPer1M: 5.0, effectiveDate: "2025-03-01", sourceUrl: "https://ai.google.dev/pricing", createdAt: new Date().toISOString() },
    { id: uid(), providerId: "google", model: "Gemini 2.0 Flash", tier: "mid", inputPer1M: 0.1, outputPer1M: 0.4, effectiveDate: "2025-03-01", sourceUrl: "https://ai.google.dev/pricing", createdAt: new Date().toISOString() },
  ];
  db.pricingSnapshots.bulkInsert(snapshots);

  // --- Benchmark Tiers ---
  const tiers: BenchmarkTier[] = [
    { id: "frontier", name: "Frontier", description: "Top-tier models scoring in the 85th+ percentile on major benchmarks", criteria: "MMLU >= 85th pct, HumanEval >= 85th pct, GPQA >= 85th pct", models: ["GPT-4o", "Claude Sonnet 4", "Gemini 2.0 Pro"] },
    { id: "mid", name: "Mid-tier", description: "Capable models scoring 60-84th percentile on major benchmarks", criteria: "MMLU 60-84th pct, HumanEval 60-84th pct", models: ["GPT-4o-mini", "Claude Haiku 3.5", "Gemini 2.0 Flash"] },
  ];
  db.benchmarkTiers.replaceAll(tiers);

  // --- Markets ---
  const now = new Date().toISOString();
  const mkMarket = (
    id: string, title: string, desc: string, type: Market["type"],
    provider: string, opts: Partial<Market>, initProb: number
  ): Market => {
    const state = createState(initProb);
    return {
      id, title, description: desc, type, status: "open", provider,
      qYes: state.qYes, qNo: state.qNo, b: state.b,
      volume: 0, tradeCount: 0,
      resolutionDate: "2026-12-31",
      resolutionCriteria: "",
      resolutionSourceType: "official_pricing_page",
      resolutionSourceName: "",
      resolutionSourceUrl: "",
      normalizationMethod: "standard_on_demand",
      normalizationNotes: "",
      resolutionStatus: "pending",
      createdAt: now, updatedAt: now,
      ...opts,
    };
  };

  const markets: Market[] = [
    mkMarket("m1", "GPT-4 class ≤ $2/1M input tokens by Dec 2026",
      "Will any GPT-4 class model be available at $2.00 or less per million input tokens by end of 2026?",
      "api_threshold", "openai", {
        modelClass: "frontier", threshold: 2.0, metric: "input_per_1m",
        resolutionDate: "2026-12-31", volume: 12400, tradeCount: 187,
        resolutionCriteria: "Official OpenAI API pricing page shows any GPT-4 class model (scoring ≥85th percentile on MMLU, HumanEval, GPQA) at ≤$2.00 per 1M input tokens.",
        resolutionSourceName: "OpenAI Pricing", resolutionSourceUrl: "https://openai.com/api/pricing",
        normalizationNotes: "Input tokens only. Output tokens excluded. Batch API discounts excluded. Standard on-demand pricing only.",
        equivalenceTier: "frontier", benchmarkTier: "MMLU ≥ 85th pct, HumanEval ≥ 85th pct",
      }, 0.62),

    mkMarket("m2", "Claude class ≤ $1/1M input tokens by Sept 2026",
      "Will any frontier Claude model be available at $1.00 or less per million input tokens by September 2026?",
      "api_threshold", "anthropic", {
        modelClass: "frontier", threshold: 1.0, metric: "input_per_1m",
        resolutionDate: "2026-09-30", volume: 8200, tradeCount: 134,
        resolutionCriteria: "Official Anthropic API pricing shows any Claude model (frontier tier) at ≤$1.00 per 1M input tokens.",
        resolutionSourceName: "Anthropic Pricing", resolutionSourceUrl: "https://www.anthropic.com/pricing",
        normalizationNotes: "Input tokens only. Prompt caching discounts excluded. Standard on-demand pricing.",
        equivalenceTier: "frontier", benchmarkTier: "MMLU ≥ 85th pct",
      }, 0.28),

    mkMarket("m3", "GPT-4 class ≤ $5/1M input tokens by June 2026",
      "Will any GPT-4 class model cost $5.00 or less per million input tokens by mid-2026?",
      "api_threshold", "openai", {
        modelClass: "frontier", threshold: 5.0, metric: "input_per_1m",
        resolutionDate: "2026-06-30", volume: 15800, tradeCount: 243,
        resolutionCriteria: "Official OpenAI API pricing shows any GPT-4 class model at ≤$5.00 per 1M input tokens.",
        resolutionSourceName: "OpenAI Pricing", resolutionSourceUrl: "https://openai.com/api/pricing",
        normalizationNotes: "Input tokens only. Standard on-demand pricing.",
        equivalenceTier: "frontier", benchmarkTier: "MMLU ≥ 85th pct",
      }, 0.89),

    mkMarket("m4", "ChatGPT Plus ≤ $10/month by Dec 2026",
      "Will OpenAI reduce ChatGPT Plus to $10/month or less by end of 2026?",
      "subscription", "openai", {
        threshold: 10, metric: "monthly_usd",
        resolutionDate: "2026-12-31", volume: 6100, tradeCount: 92,
        resolutionCriteria: "ChatGPT Plus subscription (or direct equivalent tier) is available at ≤$10/month for new subscribers on openai.com.",
        resolutionSourceName: "OpenAI Pricing", resolutionSourceUrl: "https://openai.com/chatgpt/pricing",
        normalizationNotes: "Monthly price for individual plan. Annual billing discounts count if monthly effective rate ≤ threshold. Student/education discounts excluded.",
      }, 0.15),

    mkMarket("m5", "Claude Pro free tier by June 2026",
      "Will Anthropic offer a free tier of Claude Pro by mid-2026?",
      "subscription", "anthropic", {
        threshold: 0, metric: "monthly_usd",
        resolutionDate: "2026-06-30", volume: 3400, tradeCount: 56,
        resolutionCriteria: "Anthropic offers a free tier of Claude Pro (or equivalent premium product) with no payment required, providing access to frontier models.",
        resolutionSourceName: "Anthropic Pricing", resolutionSourceUrl: "https://www.anthropic.com/pricing",
        normalizationNotes: "Free tier must include access to at least one frontier-class model. Rate-limited free access counts.",
      }, 0.07),

    mkMarket("m6", "Anthropic cheaper than OpenAI for frontier by Q4 2026",
      "Will Anthropic's cheapest frontier model have a lower blended rate than OpenAI's by end of 2026?",
      "relative", "anthropic", {
        providers: ["anthropic", "openai"], modelClass: "frontier",
        resolutionDate: "2026-12-31", volume: 9800, tradeCount: 156,
        resolutionCriteria: "As of Dec 31 2026, the cheapest frontier-tier model from Anthropic has a lower blended rate (avg of input + output per 1M tokens) than the cheapest frontier-tier model from OpenAI.",
        resolutionSourceName: "Provider Pricing Pages", resolutionSourceUrl: "https://www.anthropic.com/pricing",
        normalizationNotes: "Blended rate = (input_per_1M + output_per_1M) / 2. Standard on-demand pricing only.",
        equivalenceTier: "frontier", benchmarkTier: "MMLU ≥ 85th pct, HumanEval ≥ 85th pct",
      }, 0.53),

    mkMarket("m7", "Google cheapest mid-tier vs OpenAI & Anthropic by Q3 2026",
      "Will Google offer the cheapest mid-tier model compared to both OpenAI and Anthropic by Q3 2026?",
      "relative", "google", {
        providers: ["google", "openai", "anthropic"], modelClass: "mid",
        resolutionDate: "2026-09-30", volume: 7200, tradeCount: 118,
        resolutionCriteria: "As of Sept 30 2026, Google's cheapest mid-tier model has a lower blended rate than both OpenAI's and Anthropic's cheapest mid-tier models.",
        resolutionSourceName: "Provider Pricing Pages", resolutionSourceUrl: "https://ai.google.dev/pricing",
        normalizationNotes: "Blended rate = (input_per_1M + output_per_1M) / 2. Mid-tier = scoring 60-84th percentile on standard benchmarks.",
        equivalenceTier: "mid", benchmarkTier: "MMLU 60-84th pct",
      }, 0.74),

    mkMarket("m8", "Cost per 1k chatbot responses ≤ $0.50 by Dec 2026",
      "Will the cost of 1,000 standard chatbot responses drop to $0.50 or less using any frontier model?",
      "task_cost", "openai", {
        taskType: "chatbot", threshold: 0.50, metric: "per_1k_responses",
        resolutionDate: "2026-12-31", volume: 5600, tradeCount: 87,
        resolutionCriteria: "Using the cheapest frontier-tier model from any major provider, 1,000 standard chatbot responses (avg 500 input + 300 output tokens each) costs ≤ $0.50.",
        resolutionSourceName: "Calculated from provider pricing", resolutionSourceUrl: "https://openai.com/api/pricing",
        normalizationNotes: "Standard chatbot response = 500 input tokens + 300 output tokens. Uses cheapest frontier model available. Standard on-demand pricing.",
      }, 0.58),

    mkMarket("m9", "Cost per AI agent hour ≤ $3 by Dec 2027",
      "Will the cost of running an AI agent for one hour drop to $3 or less?",
      "task_cost", "anthropic", {
        taskType: "agent", threshold: 3.0, metric: "per_agent_hour",
        resolutionDate: "2027-12-31", volume: 4300, tradeCount: 68,
        resolutionCriteria: "Using the cheapest frontier-tier model, an AI agent performing ~120 tool calls/hour (avg 2000 input + 1000 output tokens per call) costs ≤ $3.00/hour.",
        resolutionSourceName: "Calculated from provider pricing", resolutionSourceUrl: "https://openai.com/api/pricing",
        normalizationNotes: "Agent hour = 120 calls × (2000 input + 1000 output tokens). Uses cheapest frontier model. Standard on-demand pricing.",
      }, 0.42),

    mkMarket("m10", "Gemini Pro class ≤ $1/1M input tokens by June 2026",
      "Will any Gemini Pro class model cost $1.00 or less per million input tokens by mid-2026?",
      "api_threshold", "google", {
        modelClass: "frontier", threshold: 1.0, metric: "input_per_1m",
        resolutionDate: "2026-06-30", volume: 6700, tradeCount: 103,
        resolutionCriteria: "Official Google AI pricing shows any Gemini Pro class model at ≤$1.00 per 1M input tokens.",
        resolutionSourceName: "Google AI Pricing", resolutionSourceUrl: "https://ai.google.dev/pricing",
        normalizationNotes: "Input tokens only. Free tier excluded. Standard on-demand pricing.",
        equivalenceTier: "frontier", benchmarkTier: "MMLU ≥ 85th pct",
      }, 0.67),
  ];

  db.markets.replaceAll(markets);

  // --- Price History ---
  const historyConfigs: Record<string, { prob: number; vol: number }> = {
    m1: { prob: 0.62, vol: 0.03 }, m2: { prob: 0.28, vol: 0.025 },
    m3: { prob: 0.89, vol: 0.015 }, m4: { prob: 0.15, vol: 0.02 },
    m5: { prob: 0.07, vol: 0.015 }, m6: { prob: 0.53, vol: 0.035 },
    m7: { prob: 0.74, vol: 0.02 }, m8: { prob: 0.58, vol: 0.03 },
    m9: { prob: 0.42, vol: 0.025 }, m10: { prob: 0.67, vol: 0.025 },
  };

  for (const [marketId, cfg] of Object.entries(historyConfigs)) {
    const points = generatePriceHistory(marketId, cfg.prob, cfg.vol);
    db.pricePoints.bulkInsert(points);
  }

  // --- Compute initial insights ---
  const insights = detectAllInsights(markets);
  db.insights.replaceAll(insights);

  // --- Feature Flags ---
  const flags: FeatureFlag[] = [
    { id: uid(), key: "trading_enabled", enabled: true, description: "Enable simulated trading", updatedAt: now },
    { id: uid(), key: "builder_enabled", enabled: true, description: "Enable builder dashboard", updatedAt: now },
    { id: uid(), key: "alerts_enabled", enabled: true, description: "Enable price alerts", updatedAt: now },
    { id: uid(), key: "openrouter_enabled", enabled: false, description: "Enable OpenRouter AI features", updatedAt: now },
    { id: uid(), key: "stripe_enabled", enabled: false, description: "Enable Stripe billing", updatedAt: now },
  ];
  db.featureFlags.replaceAll(flags);

  console.log(`[seed] Created ${markets.length} markets, ${providers.length} providers, ${snapshots.length} pricing snapshots, ${tiers.length} benchmark tiers, ${insights.length} insights, ${flags.length} feature flags`);
}
