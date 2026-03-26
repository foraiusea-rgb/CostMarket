/**
 * LMSR Engine Tests
 * Run: npx tsx __tests__/lmsr.test.ts
 */

import {
  cost, price, probYes, costForShares, executeTrade,
  potentialPayout, unrealizedPnl, realizedPnl, createState, validateState,
  type LMSRState,
} from "../src/lib/engine/lmsr";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

function approxEq(a: number, b: number, epsilon = 0.001): boolean {
  return Math.abs(a - b) < epsilon;
}

console.log("\n=== LMSR Engine Tests ===\n");

// --- Prices sum to 1 ---
console.log("Prices sum to 1:");
{
  const state: LMSRState = { qYes: 50, qNo: 50, b: 100 };
  const pYes = price(state, "yes");
  const pNo = price(state, "no");
  assert(approxEq(pYes + pNo, 1.0), `pYes(${pYes.toFixed(4)}) + pNo(${pNo.toFixed(4)}) = ${(pYes + pNo).toFixed(4)}`);
}

// --- Equal shares = 50/50 ---
console.log("Equal shares → 50/50:");
{
  const state: LMSRState = { qYes: 0, qNo: 0, b: 100 };
  assert(approxEq(probYes(state), 0.5), `prob = ${probYes(state).toFixed(4)}`);
}

// --- Buying Yes increases probability ---
console.log("Buying Yes increases probability:");
{
  const state: LMSRState = { qYes: 50, qNo: 50, b: 100 };
  const before = probYes(state);
  const result = executeTrade(state, "yes", 20);
  assert(result.newProbYes > before, `${before.toFixed(4)} → ${result.newProbYes.toFixed(4)}`);
}

// --- Buying No decreases Yes probability ---
console.log("Buying No decreases Yes probability:");
{
  const state: LMSRState = { qYes: 50, qNo: 50, b: 100 };
  const before = probYes(state);
  const result = executeTrade(state, "no", 20);
  assert(result.newProbYes < before, `${before.toFixed(4)} → ${result.newProbYes.toFixed(4)}`);
}

// --- Cost is positive ---
console.log("Cost is positive:");
{
  const state: LMSRState = { qYes: 50, qNo: 50, b: 100 };
  const c = costForShares(state, "yes", 10);
  assert(c > 0, `cost = ${c.toFixed(4)}`);
}

// --- Larger trades cost more ---
console.log("Larger trades cost more:");
{
  const state: LMSRState = { qYes: 50, qNo: 50, b: 100 };
  const c10 = costForShares(state, "yes", 10);
  const c50 = costForShares(state, "yes", 50);
  assert(c50 > c10, `10sh=${c10.toFixed(2)} < 50sh=${c50.toFixed(2)}`);
}

// --- Price impact grows with shares ---
console.log("Price impact grows with shares:");
{
  const state: LMSRState = { qYes: 50, qNo: 50, b: 100 };
  const r5 = executeTrade(state, "yes", 5);
  const r50 = executeTrade(state, "yes", 50);
  assert(r50.priceImpact > r5.priceImpact, `5sh impact=${r5.priceImpact.toFixed(4)} < 50sh=${r50.priceImpact.toFixed(4)}`);
}

// --- Potential payout ---
console.log("Potential payout:");
{
  const state: LMSRState = { qYes: 50, qNo: 50, b: 100 };
  const pp = potentialPayout(state, "yes", 10);
  assert(pp > 0, `payout = ${pp.toFixed(2)}`);
  assert(pp < 10, `payout < shares (${pp.toFixed(2)} < 10)`);
}

// --- Realized PnL ---
console.log("Realized PnL:");
{
  const pnlWin = realizedPnl(true, "yes", 10, 5);
  assert(pnlWin === 5, `Win: 10 - 5 = ${pnlWin}`);
  const pnlLose = realizedPnl(false, "yes", 10, 5);
  assert(pnlLose === -5, `Lose: 0 - 5 = ${pnlLose}`);
}

// --- createState ---
console.log("createState from probability:");
{
  const state = createState(0.7);
  const p = probYes(state);
  assert(approxEq(p, 0.7, 0.01), `target=0.7, got=${p.toFixed(4)}`);
}

// --- Validate state ---
console.log("Validate state:");
{
  assert(validateState({ qYes: 50, qNo: 50, b: 100 }), "valid state");
  assert(!validateState({ qYes: NaN, qNo: 50, b: 100 }), "NaN rejected");
  assert(!validateState({ qYes: 50, qNo: 50, b: 0 }), "b=0 rejected");
  assert(!validateState({ qYes: 50, qNo: 50, b: -1 }), "b<0 rejected");
}

// --- Numerical stability at extremes ---
console.log("Numerical stability:");
{
  const extreme: LMSRState = { qYes: 500, qNo: 0, b: 100 };
  const p = probYes(extreme);
  assert(p > 0.99 && p <= 1, `extreme high: ${p.toFixed(6)}`);
  assert(Number.isFinite(p), "finite result");

  const extremeLow: LMSRState = { qYes: 0, qNo: 500, b: 100 };
  const pLow = probYes(extremeLow);
  assert(pLow < 0.01 && pLow >= 0, `extreme low: ${pLow.toFixed(6)}`);
  assert(Number.isFinite(pLow), "finite result");
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
