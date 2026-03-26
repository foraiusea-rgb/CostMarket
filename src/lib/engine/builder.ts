/**
 * Builder Forecast Engine
 * 
 * Generates cost projections per provider, adjusted by live market probabilities.
 * Deterministic — no external calls.
 */

import { probYes, type LMSRState } from "./lmsr";
import type { Market, BuilderProjection, BuilderRecommendation } from "@/types";

// --- Constants ---

export const PROVIDERS = {
  openai: { name: "OpenAI", color: "#10a37f" },
  anthropic: { name: "Anthropic", color: "#d97706" },
  google: { name: "Google DeepMind", color: "#4285f4" },
} as const;

export const PROVIDER_PRICING = [
  { provider: "openai", model: "GPT-4o", inputPer1M: 2.5, outputPer1M: 10.0, tier: "frontier" },
  { provider: "openai", model: "GPT-4o-mini", inputPer1M: 0.15, outputPer1M: 0.6, tier: "mid" },
  { provider: "anthropic", model: "Claude Sonnet 4", inputPer1M: 3.0, outputPer1M: 15.0, tier: "frontier" },
  { provider: "anthropic", model: "Claude Haiku 3.5", inputPer1M: 0.8, outputPer1M: 4.0, tier: "mid" },
  { provider: "google", model: "Gemini 2.0 Pro", inputPer1M: 1.25, outputPer1M: 5.0, tier: "frontier" },
  { provider: "google", model: "Gemini 2.0 Flash", inputPer1M: 0.1, outputPer1M: 0.4, tier: "mid" },
] as const;

export const TASK_PROFILES = {
  chatbot: { label: "Chatbot", inputTokens: 500, outputTokens: 300 },
  agent: { label: "AI Agent", inputTokens: 2000, outputTokens: 1000 },
  summarizer: { label: "Summarizer", inputTokens: 3000, outputTokens: 500 },
  codegen: { label: "Code Generator", inputTokens: 1500, outputTokens: 2000 },
} as const;

const BASE_DECLINE_RATES: Record<string, Record<string, number>> = {
  openai: { frontier: 0.35, mid: 0.40 },
  anthropic: { frontier: 0.30, mid: 0.35 },
  google: { frontier: 0.45, mid: 0.50 },
};

export type UseCase = keyof typeof TASK_PROFILES;

export interface BuilderInput {
  useCase: UseCase;
  monthlyRequests: number;
  avgInputTokens?: number;
  avgOutputTokens?: number;
  tier: string;
  preferredProvider: string;
  budgetSensitivity?: "low" | "medium" | "high";
  qualityPreference?: "highest" | "balanced" | "cost_optimized";
}

/**
 * Calculate market-adjusted decline rate for a provider/tier combination.
 * When markets strongly predict price drops (>50%), the decline rate increases.
 */
function adjustedDeclineRate(
  provider: string,
  tier: string,
  markets: Market[]
): number {
  const baseDec = BASE_DECLINE_RATES[provider]?.[tier] ?? 0.3;

  const relevant = markets.filter(
    m =>
      m.type === "api_threshold" &&
      m.provider === provider &&
      m.modelClass === tier &&
      m.status === "open"
  );

  let boost = 0;
  for (const m of relevant) {
    const prob = probYes({ qYes: m.qYes, qNo: m.qNo, b: m.b });
    if (prob > 0.5) {
      boost = Math.max(boost, (prob - 0.5) * 0.2);
    }
  }

  return Math.min(0.7, baseDec + boost);
}

/**
 * Generate cost projections for a single provider/model.
 */
function projectProvider(
  provider: string,
  model: string,
  inputPer1M: number,
  outputPer1M: number,
  inputTokens: number,
  outputTokens: number,
  monthlyRequests: number,
  declineRate: number
): BuilderProjection {
  const costPerRequest = (inputTokens * inputPer1M + outputTokens * outputPer1M) / 1_000_000;
  const currentMonthlyCost = costPerRequest * monthlyRequests;

  const monthlyProjections: { month: number; cost: number }[] = [];
  for (let m = 0; m <= 12; m++) {
    const factor = Math.pow(1 - declineRate, m / 12);
    monthlyProjections.push({ month: m, cost: currentMonthlyCost * factor });
  }

  return {
    provider,
    model,
    currentMonthlyCost,
    projected12mCost: monthlyProjections[12].cost,
    declineRate: BASE_DECLINE_RATES[provider]?.[model] ?? 0.3,
    marketAdjustedDecline: declineRate,
    monthlyProjections,
  };
}

/**
 * Generate full builder recommendation from inputs + live market state.
 */
export function generateRecommendation(
  input: BuilderInput,
  markets: Market[]
): BuilderRecommendation {
  const taskProfile = TASK_PROFILES[input.useCase];
  const inputTokens = input.avgInputTokens ?? taskProfile.inputTokens;
  const outputTokens = input.avgOutputTokens ?? taskProfile.outputTokens;

  const projections: BuilderProjection[] = [];

  for (const pricing of PROVIDER_PRICING) {
    if (pricing.tier !== input.tier) continue;

    const decline = adjustedDeclineRate(pricing.provider, pricing.tier, markets);

    projections.push(
      projectProvider(
        pricing.provider,
        pricing.model,
        pricing.inputPer1M,
        pricing.outputPer1M,
        inputTokens,
        outputTokens,
        input.monthlyRequests,
        decline
      )
    );
  }

  // Sort by projected 12-month cost
  projections.sort((a, b) => a.projected12mCost - b.projected12mCost);

  const best = projections[0];
  const current = input.preferredProvider
    ? projections.find(p => p.provider === input.preferredProvider)
    : null;

  let action: "stay" | "switch" | "monitor" = "stay";
  let explanation = "";

  if (current && best) {
    const provName = (slug: string) =>
      PROVIDERS[slug as keyof typeof PROVIDERS]?.name ?? slug;

    if (current.provider === best.provider) {
      action = "stay";
      explanation = `${provName(current.provider)} is projected to be the cheapest option for your ${taskProfile.label.toLowerCase()} workload over the next 12 months. No action needed.`;
    } else {
      const savings = ((1 - best.projected12mCost / current.projected12mCost) * 100).toFixed(0);
      const costGap = current.currentMonthlyCost / best.currentMonthlyCost;

      if (costGap > 1.3) {
        action = "switch";
        explanation = `${provName(best.provider)} (${best.model}) is projected to be ${savings}% cheaper than ${provName(current.provider)} over 12 months. The gap is significant enough to justify migration.`;
      } else if (costGap > 1.1) {
        action = "monitor";
        explanation = `${provName(best.provider)} is slightly cheaper, but the gap (${savings}% projected savings) is narrow. Monitor pricing trends before committing to migration.`;
      } else {
        action = "stay";
        explanation = `${provName(current.provider)} and ${provName(best.provider)} are very close in projected cost. Switching costs likely outweigh the ~${savings}% difference.`;
      }
    }

    // Adjust for quality preference
    if (input.qualityPreference === "highest" && action === "switch") {
      explanation += " Note: you selected 'highest quality' preference — ensure the recommended model meets your quality bar before switching.";
    }

    // Adjust for budget sensitivity
    if (input.budgetSensitivity === "high" && action === "monitor") {
      action = "switch";
      explanation += " Given your high budget sensitivity, earlier switching may be warranted.";
    }
  } else if (best) {
    action = "switch";
    explanation = `${PROVIDERS[best.provider as keyof typeof PROVIDERS]?.name ?? best.provider} (${best.model}) offers the best projected pricing for your workload.`;
  }

  return {
    action,
    explanation,
    projections,
    bestProvider: best?.provider ?? "",
    bestModel: best?.model ?? "",
    task: {
      label: taskProfile.label,
      inputTokens,
      outputTokens,
    },
  };
}
