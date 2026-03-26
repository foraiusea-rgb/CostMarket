/**
 * Arbitrage Detection Tests
 * Run: npx tsx __tests__/arbitrage.test.ts
 */

import { detectAllInsights } from "../src/lib/engine/arbitrage";
import { createState } from "../src/lib/engine/lmsr";
import type { Market } from "../src/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

function makeMarket(id: string, overrides: Partial<Market>, initProb: number): Market {
  const state = createState(initProb);
  return {
    id, title: `Market ${id}`, description: "", type: "api_threshold", status: "open",
    provider: "openai", qYes: state.qYes, qNo: state.qNo, b: state.b,
    volume: 0, tradeCount: 0, resolutionDate: "2026-12-31",
    resolutionCriteria: "", resolutionSourceType: "", resolutionSourceName: "",
    resolutionSourceUrl: "", normalizationMethod: "", normalizationNotes: "",
    resolutionStatus: "pending", createdAt: "", updatedAt: "",
    ...overrides,
  } as Market;
}

console.log("\n=== Arbitrage Detection Tests ===\n");

// Rule 1: Time inconsistency
console.log("Time Inconsistency Detection:");
{
  const markets = [
    makeMarket("early", { provider: "openai", modelClass: "frontier", threshold: 2, resolutionDate: "2026-06-30" }, 0.70),
    makeMarket("late", { provider: "openai", modelClass: "frontier", threshold: 2, resolutionDate: "2026-12-31" }, 0.55),
  ];
  const insights = detectAllInsights(markets);
  const timeInsights = insights.filter(i => i.type === "time");
  assert(timeInsights.length > 0, `Detected time inconsistency (later+same threshold has lower prob)`);
}

// Rule 1: No false positive
console.log("Time Inconsistency - No false positive:");
{
  const markets = [
    makeMarket("early", { provider: "openai", modelClass: "frontier", threshold: 2, resolutionDate: "2026-06-30" }, 0.55),
    makeMarket("late", { provider: "openai", modelClass: "frontier", threshold: 2, resolutionDate: "2026-12-31" }, 0.70),
  ];
  const insights = detectAllInsights(markets);
  const timeInsights = insights.filter(i => i.type === "time");
  assert(timeInsights.length === 0, `No false positive when probabilities are consistent`);
}

// Rule 2: Threshold inconsistency
console.log("Threshold Inconsistency Detection:");
{
  const markets = [
    makeMarket("easy", { provider: "openai", modelClass: "frontier", threshold: 5, resolutionDate: "2026-12-31" }, 0.50),
    makeMarket("hard", { provider: "openai", modelClass: "frontier", threshold: 2, resolutionDate: "2026-12-31" }, 0.65),
  ];
  const insights = detectAllInsights(markets);
  const threshInsights = insights.filter(i => i.type === "threshold");
  assert(threshInsights.length > 0, `Detected: easier threshold has lower probability`);
}

// Rule 3: Cross-provider
console.log("Cross-Provider Inconsistency:");
{
  const markets = [
    makeMarket("rel", { type: "relative", providers: ["anthropic", "openai"], modelClass: "frontier", resolutionDate: "2026-12-31", provider: "anthropic" }, 0.75),
    makeMarket("ant", { provider: "anthropic", modelClass: "frontier", threshold: 2, resolutionDate: "2026-12-31" }, 0.30),
    makeMarket("oai", { provider: "openai", modelClass: "frontier", threshold: 2, resolutionDate: "2026-12-31" }, 0.60),
  ];
  const insights = detectAllInsights(markets);
  const crossInsights = insights.filter(i => i.type === "cross_provider");
  assert(crossInsights.length > 0, `Detected: relative market says A cheaper, but A's threshold is lower`);
}

// Rule 4: Task-to-token
console.log("Task-to-Token Inconsistency:");
{
  // chatbot: 1000 * (500*threshold + 300*threshold*3) / 1M = 1000 * (500*2 + 300*6) / 1M = 2.8/1k
  // So at threshold=2, cost/1k = $2.80, which is above $0.50 — use lower threshold
  // At threshold=0.3: 1000 * (500*0.3 + 300*0.9) / 1M = 1000 * (150+270)/1M = 0.42 < 0.50
  const markets = [
    makeMarket("task", { type: "task_cost", taskType: "chatbot", threshold: 0.50, resolutionDate: "2026-12-31", provider: "openai" }, 0.30),
    makeMarket("api", { type: "api_threshold", provider: "openai", modelClass: "frontier", threshold: 0.3, resolutionDate: "2026-12-31" }, 0.70),
  ];
  const insights = detectAllInsights(markets);
  const taskInsights = insights.filter(i => i.type === "task_token");
  assert(taskInsights.length > 0, `Detected: API market implies task should be cheap, but task market disagrees`);
}

// Severity ordering
console.log("Severity ordering:");
{
  const markets = [
    makeMarket("early", { provider: "openai", modelClass: "frontier", threshold: 2, resolutionDate: "2026-06-30" }, 0.70),
    makeMarket("late", { provider: "openai", modelClass: "frontier", threshold: 2, resolutionDate: "2026-12-31" }, 0.55),
    makeMarket("easy", { provider: "anthropic", modelClass: "frontier", threshold: 5, resolutionDate: "2026-12-31" }, 0.50),
    makeMarket("hard", { provider: "anthropic", modelClass: "frontier", threshold: 2, resolutionDate: "2026-12-31" }, 0.65),
  ];
  const insights = detectAllInsights(markets);
  if (insights.length >= 2) {
    const sevOrder = { high: 0, medium: 1, low: 2 };
    const sorted = insights.every((ins, i) => i === 0 || sevOrder[ins.severity] >= sevOrder[insights[i-1].severity]);
    assert(sorted, `Insights sorted by severity (high first)`);
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
