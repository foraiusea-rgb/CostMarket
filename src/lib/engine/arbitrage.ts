/**
 * Arbitrage / Mispricing Detection Engine
 * 
 * Rule-based system that detects logical inconsistencies across markets.
 * No ML — purely deterministic rules applied to LMSR state.
 */

import { probYes, type LMSRState } from "./lmsr";
import type { Market, Insight, InsightType, Severity } from "@/types";

interface MarketWithProb extends Market {
  probability: number;
}

function enrich(markets: Market[]): MarketWithProb[] {
  return markets.filter(m => m.status === "open").map(m => ({
    ...m,
    probability: probYes({ qYes: m.qYes, qNo: m.qNo, b: m.b }),
  }));
}

/**
 * Rule 1: Time Inconsistency
 * A later-date market with an equal or easier threshold should not have
 * lower probability than an earlier-date equivalent.
 */
function detectTimeInconsistencies(markets: MarketWithProb[]): Insight[] {
  const insights: Insight[] = [];
  const apis = markets.filter(m => m.type === "api_threshold");

  for (let i = 0; i < apis.length; i++) {
    for (let j = i + 1; j < apis.length; j++) {
      const a = apis[i], b = apis[j];
      if (a.provider !== b.provider || a.modelClass !== b.modelClass) continue;

      const [early, late] = new Date(a.resolutionDate) < new Date(b.resolutionDate) ? [a, b] : [b, a];
      if (
        late.threshold !== undefined &&
        early.threshold !== undefined &&
        late.threshold >= early.threshold &&
        late.probability < early.probability - 0.05
      ) {
        insights.push({
          id: `time-${early.id}-${late.id}`,
          title: "Time Inconsistency",
          type: "time",
          explanation: `"${late.title}" resolves later with an equal or easier threshold but has lower implied probability (${(late.probability * 100).toFixed(0)}%) than "${early.title}" (${(early.probability * 100).toFixed(0)}%). A later deadline with the same or easier target should be at least as likely.`,
          severity: "high",
          confidence: 0.9,
          linkedMarketIds: [early.id, late.id],
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
  return insights;
}

/**
 * Rule 2: Threshold Monotonicity
 * For the same provider, model class, and date: an easier (higher) threshold
 * must not have a lower probability than a harder (lower) threshold.
 */
function detectThresholdInconsistencies(markets: MarketWithProb[]): Insight[] {
  const insights: Insight[] = [];
  const apis = markets.filter(m => m.type === "api_threshold");

  for (let i = 0; i < apis.length; i++) {
    for (let j = i + 1; j < apis.length; j++) {
      const a = apis[i], b = apis[j];
      if (
        a.provider !== b.provider ||
        a.modelClass !== b.modelClass ||
        a.resolutionDate !== b.resolutionDate
      ) continue;

      if (a.threshold === undefined || b.threshold === undefined) continue;

      const [easier, harder] = a.threshold >= b.threshold ? [a, b] : [b, a];
      if (easier.probability < harder.probability - 0.03) {
        insights.push({
          id: `thresh-${easier.id}-${harder.id}`,
          title: "Threshold Inconsistency",
          type: "threshold",
          explanation: `"${easier.title}" has an easier threshold ($${easier.threshold}) but lower probability (${(easier.probability * 100).toFixed(0)}%) than "${harder.title}" ($${harder.threshold}, ${(harder.probability * 100).toFixed(0)}%). The easier target should be more likely.`,
          severity: "medium",
          confidence: 0.85,
          linkedMarketIds: [easier.id, harder.id],
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
  return insights;
}

/**
 * Rule 3: Cross-Provider Inconsistency
 * If a relative pricing market says Provider A will be cheaper than Provider B
 * with high probability, but A's individual threshold markets show lower
 * probability than B's, that's inconsistent.
 */
function detectCrossProviderInconsistencies(markets: MarketWithProb[]): Insight[] {
  const insights: Insight[] = [];
  const apis = markets.filter(m => m.type === "api_threshold");
  const relatives = markets.filter(m => m.type === "relative");

  for (const rel of relatives) {
    if (!rel.providers || rel.providers.length < 2) continue;
    const [cheaperProv, expensiveProv] = rel.providers;

    const cheaperThresholds = apis.filter(
      m => m.provider === cheaperProv && m.modelClass === rel.modelClass
    );
    const expensiveThresholds = apis.filter(
      m => m.provider === expensiveProv && m.modelClass === rel.modelClass
    );

    for (const ct of cheaperThresholds) {
      for (const et of expensiveThresholds) {
        if (
          ct.threshold !== undefined &&
          et.threshold !== undefined &&
          ct.threshold >= et.threshold &&
          rel.probability > 0.6 &&
          ct.probability < et.probability - 0.1
        ) {
          insights.push({
            id: `cross-${rel.id}-${ct.id}-${et.id}`,
            title: "Cross-Provider Inconsistency",
            type: "cross_provider",
            explanation: `The market predicts ${cheaperProv} will be cheaper (${(rel.probability * 100).toFixed(0)}% likely), but their threshold market "${ct.title}" shows lower probability (${(ct.probability * 100).toFixed(0)}%) than ${expensiveProv}'s equivalent (${(et.probability * 100).toFixed(0)}%).`,
            severity: "high",
            confidence: 0.8,
            linkedMarketIds: [rel.id, ct.id, et.id],
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  }
  return insights;
}

/**
 * Rule 4: Task-to-Token Inconsistency
 * If a task-cost market and a token-cost market have materially different
 * implied probabilities, but one logically entails the other, flag it.
 */
function detectTaskTokenInconsistencies(markets: MarketWithProb[]): Insight[] {
  const insights: Insight[] = [];
  const apis = markets.filter(m => m.type === "api_threshold" && m.modelClass === "frontier");
  const tasks = markets.filter(m => m.type === "task_cost");

  // Standard task token profiles
  const taskProfiles: Record<string, { input: number; output: number; multiplier: number }> = {
    chatbot: { input: 500, output: 300, multiplier: 1000 }, // per 1k responses
    agent: { input: 2000, output: 1000, multiplier: 120 },   // per hour (120 calls)
  };

  for (const task of tasks) {
    const profile = task.taskType ? taskProfiles[task.taskType] : null;
    if (!profile || task.threshold === undefined) continue;

    for (const api of apis) {
      if (api.threshold === undefined) continue;

      // Estimate task cost if API threshold resolves YES
      const impliedInputCost = api.threshold;
      const impliedOutputCost = api.threshold * 3; // rough output:input ratio
      const taskCostPerUnit =
        (profile.input * impliedInputCost + profile.output * impliedOutputCost) /
        1_000_000 *
        profile.multiplier;

      const probGap = Math.abs(task.probability - api.probability);

      if (probGap > 0.25 && taskCostPerUnit <= task.threshold) {
        insights.push({
          id: `task-${task.id}-${api.id}`,
          title: "Task-to-Token Inconsistency",
          type: "task_token",
          explanation: `If "${api.title}" resolves YES, the implied ${task.taskType} cost would be ~$${taskCostPerUnit.toFixed(2)}, which is below the $${task.threshold} threshold in "${task.title}". But the probability gap is ${(probGap * 100).toFixed(0)} percentage points.`,
          severity: "medium",
          confidence: 0.75,
          linkedMarketIds: [task.id, api.id],
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
  return insights;
}

/**
 * Rule 5: Subscription-to-API Inconsistency
 * If subscription pricing markets imply aggressive cost cuts but API markets don't
 * (or vice versa), flag the contradiction.
 */
function detectSubscriptionApiInconsistencies(markets: MarketWithProb[]): Insight[] {
  const insights: Insight[] = [];
  const subs = markets.filter(m => m.type === "subscription");
  const apis = markets.filter(m => m.type === "api_threshold");

  for (const sub of subs) {
    const providerApis = apis.filter(m => m.provider === sub.provider);
    for (const api of providerApis) {
      // If subscription price drop is highly likely but API price drop isn't
      if (sub.probability > 0.7 && api.probability < 0.3) {
        insights.push({
          id: `subapi-${sub.id}-${api.id}`,
          title: "Subscription-API Divergence",
          type: "subscription_api",
          explanation: `"${sub.title}" is ${(sub.probability * 100).toFixed(0)}% likely, suggesting ${sub.provider} is cutting consumer prices. But "${api.title}" is only ${(api.probability * 100).toFixed(0)}% likely. Provider pricing strategies usually correlate.`,
          severity: "low",
          confidence: 0.6,
          linkedMarketIds: [sub.id, api.id],
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
  return insights;
}

/**
 * Run all arbitrage detection rules against current market state.
 * Returns deduplicated insights sorted by severity.
 */
export function detectAllInsights(markets: Market[]): Insight[] {
  const enriched = enrich(markets);

  const allInsights = [
    ...detectTimeInconsistencies(enriched),
    ...detectThresholdInconsistencies(enriched),
    ...detectCrossProviderInconsistencies(enriched),
    ...detectTaskTokenInconsistencies(enriched),
    ...detectSubscriptionApiInconsistencies(enriched),
  ];

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = allInsights.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  // Sort: high > medium > low
  const sevOrder: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  unique.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  return unique;
}
