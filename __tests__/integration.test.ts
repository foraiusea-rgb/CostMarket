/**
 * Integration Tests — DB, Engine, Rate Limiter
 * 
 * Tests the full data flow for critical paths.
 * Auth is handled by Supabase and tested separately via the UI.
 * These tests cover: DB operations, LMSR trades, arbitrage, builder, rate limiter.
 * 
 * Run: npx tsx __tests__/integration.test.ts
 */

import { db } from "../src/lib/db";
import { seed } from "../src/lib/db/seed";
import { validateEmail } from "../src/lib/auth";
import { executeTrade, costForShares, probYes, createState, validateState } from "../src/lib/engine/lmsr";
import { generateRecommendation } from "../src/lib/engine/builder";
import { detectAllInsights } from "../src/lib/engine/arbitrage";
import { checkRateLimit } from "../src/lib/ratelimit";
import type { User } from "../src/types";

let passed = 0;
let failed = 0;
const results: { name: string; pass: boolean; detail?: string }[] = [];

function assert(condition: boolean, msg: string, detail?: string) {
  if (condition) { passed++; results.push({ name: msg, pass: true }); }
  else { failed++; results.push({ name: msg, pass: false, detail }); console.error(`  ✗ ${msg}${detail ? ": " + detail : ""}`); }
}

function section(name: string) { console.log(`\n--- ${name} ---`); }

async function main() {
console.log("\n=== Integration Tests ===\n");

const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));

// ============================================================
// 1. DATABASE LAYER (requires Supabase)
// ============================================================
if (hasSupabase) {
  section("Database Layer");
  
  // Init and seed
  await db.init();
  await seed();

// ============================================================
// 1. DATABASE LAYER
// ============================================================
section("Database Layer");

const markets = db.markets.getAll();
assert(markets.length === 10, "Seed creates 10 markets", `got ${markets.length}`);

const providers = db.providers.getAll();
assert(providers.length === 3, "Seed creates 3 providers", `got ${providers.length}`);

const pricePoints = db.pricePoints.getByMarket("m1");
assert(pricePoints.length > 80, "Seed creates price history for m1", `got ${pricePoints.length}`);

const insights = db.insights.getAll();
assert(insights.length > 0, "Seed generates arbitrage insights", `got ${insights.length}`);

const flags = db.featureFlags.getAll();
assert(flags.length === 5, "Seed creates 5 feature flags", `got ${flags.length}`);

// CRUD operations
const testMarket = db.markets.getById("m1");
assert(testMarket !== null, "getById returns market m1");
assert(testMarket?.status === "open", "Market m1 is open");

db.markets.update("m1", { volume: 99999 });
const updated = db.markets.getById("m1");
assert(updated?.volume === 99999, "update() persists changes", `got ${updated?.volume}`);
db.markets.update("m1", { volume: 12400 });

// User CRUD (direct DB, not through Supabase auth)
const now = new Date().toISOString();
const testUser: User = {
  id: "test-user-001",
  email: "test@integration.com",
  passwordHash: "",
  name: "Test User",
  role: "free",
  plan: "free",
  balance: 10000,
  createdAt: now,
  updatedAt: now,
};
db.users.insert(testUser);

const fetchedUser = db.users.getById("test-user-001");
assert(fetchedUser !== null, "User inserted and retrieved");
assert(fetchedUser?.balance === 10000, "User balance correct");
assert(fetchedUser?.email === "test@integration.com", "User email correct");

} else {
  console.log("\n--- Database Layer: SKIPPED (no Supabase env vars) ---");
}

// ============================================================
// 2. VALIDATION (no DB needed)
// ============================================================
section("Validation");

assert(validateEmail("test@example.com") === true, "Valid email passes");
assert(validateEmail("test@example") === false, "Missing TLD rejected");
assert(validateEmail("") === false, "Empty email rejected");
assert(validateEmail("no-at-sign") === false, "No @ rejected");
assert(validateEmail("a".repeat(251) + "@b.c") === false, "Overlength email rejected");

// ============================================================
// 3. TRADE EXECUTION (LMSR math — no DB needed)
// ============================================================
section("Trade Execution (LMSR Math)");

// Use known LMSR state instead of DB
const testState = { qYes: 50, qNo: 50, b: 100 };
const probBefore = probYes(testState);

const cost10 = costForShares(testState, "yes", 10);
assert(cost10 > 0, "Trade cost is positive", `got ${cost10}`);
assert(Number.isFinite(cost10), "Trade cost is finite");

const cost100 = costForShares(testState, "yes", 100);
assert(cost100 > cost10, "Larger trade costs more", `10sh=${cost10.toFixed(2)} vs 100sh=${cost100.toFixed(2)}`);

const result = executeTrade(testState, "yes", 10);
assert(result.newProbYes > probBefore, "Buying Yes increases probability");
assert(result.cost > 0, "Trade has positive cost");
assert(result.priceImpact > 0, "Trade has price impact");
assert(validateState(result.newState), "New state is valid");

if (hasSupabase) {
  // DB-dependent trade flow
  section("Trade Execution (DB Flow)");

  const market = db.markets.getById("m1")!;
  const state = { qYes: market.qYes, qNo: market.qNo, b: market.b };
  const user = db.users.getById("test-user-001")!;
  const tradeCost = costForShares(state, "yes", 10);
  assert(tradeCost <= user.balance, "User can afford trade");

  const tradeResult = executeTrade(state, "yes", 10);
  db.markets.update("m1", {
    qYes: tradeResult.newState.qYes,
    qNo: tradeResult.newState.qNo,
    volume: market.volume + Math.round(Math.abs(tradeCost) * 100),
    tradeCount: market.tradeCount + 1,
  });
  db.users.update(user.id, { balance: user.balance - tradeCost });

  const afterMarket = db.markets.getById("m1")!;
  assert(afterMarket.tradeCount === market.tradeCount + 1, "Trade count incremented");
  assert(afterMarket.volume > market.volume, "Volume increased");

  const afterUser = db.users.getById(user.id)!;
  assert(afterUser.balance < user.balance, "Balance decreased after trade");
  assert(afterUser.balance === user.balance - tradeCost, "Balance decreased by exact trade cost");

  // Arbitrage on live data
  section("Arbitrage Detection (Live DB)");
  const liveMarkets = db.markets.getAll();
  const liveInsights = detectAllInsights(liveMarkets);
  assert(Array.isArray(liveInsights), "detectAllInsights returns array");
  for (const insight of liveInsights) {
    assert(typeof insight.id === "string" && insight.id.length > 0, `Insight ${insight.id} has valid ID`);
    assert(["high", "medium", "low"].includes(insight.severity), `Insight ${insight.id} has valid severity`);
    assert(insight.linkedMarketIds.length > 0, `Insight ${insight.id} has linked markets`);
  }

  // Builder with live data
  section("Builder Engine (Live DB)");
  const rec = generateRecommendation({
    useCase: "chatbot", monthlyRequests: 100000, tier: "frontier", preferredProvider: "openai",
  }, liveMarkets);
  assert(["stay", "switch", "monitor"].includes(rec.action), `Action is valid: ${rec.action}`);
  assert(rec.projections.length >= 2, "Multiple providers projected");

  // Cross-feature
  section("Cross-Feature Verification");
  const m3 = db.markets.getById("m3")!;
  const bigTrade = executeTrade({ qYes: m3.qYes, qNo: m3.qNo, b: m3.b }, "no", 200);
  db.markets.update("m3", { qYes: bigTrade.newState.qYes, qNo: bigTrade.newState.qNo });
  const insightsAfter = detectAllInsights(db.markets.getAll());
  assert(Array.isArray(insightsAfter), "Insights still valid after large trade");

} else {
  console.log("\n--- DB Trade Flow, Arbitrage, Builder, Cross-Feature: SKIPPED (no Supabase) ---");
}
section("Rate Limiter");

const rlKey = "test:integration:" + Date.now(); // unique key per run
const rlConfig = { limit: 3, windowSeconds: 60 };

const r1 = checkRateLimit(rlKey, rlConfig);
assert(r1.allowed === true, "First request allowed");
assert(r1.remaining === 2, "2 remaining after first");

const r2 = checkRateLimit(rlKey, rlConfig);
assert(r2.allowed === true, "Second request allowed");

const r3 = checkRateLimit(rlKey, rlConfig);
assert(r3.allowed === true, "Third request allowed");

const r4 = checkRateLimit(rlKey, rlConfig);
assert(r4.allowed === false, "Fourth request blocked");
assert(r4.remaining === 0, "0 remaining when blocked");

const r5 = checkRateLimit("test:other:" + Date.now(), rlConfig);
assert(r5.allowed === true, "Different key is independent");

// ============================================================
// RESULTS
// ============================================================
console.log("\n=== RESULTS ===\n");
const failedTests = results.filter(r => !r.pass);
if (failedTests.length > 0) {
  console.log("FAILURES:");
  for (const t of failedTests) {
    console.log(`  ✗ ${t.name}${t.detail ? ": " + t.detail : ""}`);
  }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error("Test runner error:", e); process.exit(1); });
