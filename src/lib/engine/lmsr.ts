/**
 * LMSR (Logarithmic Market Scoring Rule) AMM Engine
 * 
 * Implements Hanson's LMSR for binary prediction markets.
 * All math is deterministic — no randomness, no external calls.
 */

export interface LMSRState {
  qYes: number;
  qNo: number;
  b: number;
}

export interface TradeResult {
  newState: LMSRState;
  cost: number;
  newProbYes: number;
  newProbNo: number;
  priceImpact: number;
}

/**
 * Cost function C(q) = b * ln(e^(q1/b) + e^(q2/b))
 * Uses numerically stable log-sum-exp
 */
export function cost(state: LMSRState): number {
  const { qYes, qNo, b } = state;
  const max = Math.max(qYes, qNo);
  return b * (max / b + Math.log(
    Math.exp((qYes - max) / b) + Math.exp((qNo - max) / b)
  ));
}

/**
 * Price (implied probability) for outcome i
 * p_i = e^(q_i/b) / sum(e^(q_j/b))
 */
export function price(state: LMSRState, outcome: "yes" | "no"): number {
  const { qYes, qNo, b } = state;
  const max = Math.max(qYes, qNo);
  const eYes = Math.exp((qYes - max) / b);
  const eNo = Math.exp((qNo - max) / b);
  const sum = eYes + eNo;
  return outcome === "yes" ? eYes / sum : eNo / sum;
}

/**
 * Probability of Yes outcome (convenience)
 */
export function probYes(state: LMSRState): number {
  return price(state, "yes");
}

/**
 * Cost to buy `shares` of outcome
 * cost = C(q_new) - C(q_old)
 */
export function costForShares(
  state: LMSRState,
  outcome: "yes" | "no",
  shares: number
): number {
  const newState = { ...state };
  if (outcome === "yes") newState.qYes += shares;
  else newState.qNo += shares;
  return cost(newState) - cost(state);
}

/**
 * Execute a trade: buy `shares` of outcome
 * Returns new state and trade details
 */
export function executeTrade(
  state: LMSRState,
  outcome: "yes" | "no",
  shares: number
): TradeResult {
  if (shares <= 0) throw new Error("Shares must be positive");
  if (!Number.isFinite(shares)) throw new Error("Invalid share count");
  
  const oldProbYes = price(state, "yes");
  const tradeCost = costForShares(state, outcome, shares);
  
  const newState: LMSRState = { ...state };
  if (outcome === "yes") newState.qYes += shares;
  else newState.qNo += shares;
  
  const newProbYes = price(newState, "yes");
  const newProbNo = price(newState, "no");
  const priceImpact = Math.abs(newProbYes - oldProbYes);
  
  return {
    newState,
    cost: tradeCost,
    newProbYes,
    newProbNo,
    priceImpact,
  };
}

/**
 * Preview a trade without executing it
 */
export function previewTrade(
  state: LMSRState,
  outcome: "yes" | "no",
  shares: number
): TradeResult {
  return executeTrade(state, outcome, shares);
}

/**
 * Calculate potential payout if outcome resolves to the traded direction
 * Payout = shares - cost (since each share pays $1 if correct)
 */
export function potentialPayout(
  state: LMSRState,
  outcome: "yes" | "no",
  shares: number
): number {
  const tradeCost = costForShares(state, outcome, shares);
  return shares - tradeCost;
}

/**
 * Calculate unrealized PnL for a position
 */
export function unrealizedPnl(
  state: LMSRState,
  direction: "yes" | "no",
  shares: number,
  avgEntryPrice: number
): number {
  const currentPrice = price(state, direction);
  return (currentPrice - avgEntryPrice) * shares;
}

/**
 * Calculate realized PnL after resolution
 */
export function realizedPnl(
  resolvedYes: boolean,
  direction: "yes" | "no",
  shares: number,
  totalCost: number
): number {
  const won = (resolvedYes && direction === "yes") || (!resolvedYes && direction === "no");
  const payout = won ? shares : 0;
  return payout - totalCost;
}

/**
 * Validate LMSR state
 */
export function validateState(state: LMSRState): boolean {
  return (
    Number.isFinite(state.qYes) &&
    Number.isFinite(state.qNo) &&
    Number.isFinite(state.b) &&
    state.b > 0
  );
}

/**
 * Create initial LMSR state from desired probability
 */
export function createState(initialProbYes: number, b: number = 100): LMSRState {
  if (initialProbYes <= 0 || initialProbYes >= 1) {
    throw new Error("Initial probability must be between 0 and 1 exclusive");
  }
  // p = e^(qYes/b) / (e^(qYes/b) + e^(qNo/b))
  // Set qNo = 0, solve for qYes: qYes = b * ln(p / (1-p))
  const qYes = b * Math.log(initialProbYes / (1 - initialProbYes));
  return { qYes, qNo: 0, b };
}
