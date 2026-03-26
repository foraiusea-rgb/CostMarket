// ============================================================
// DOMAIN TYPES — AI Cost Markets
// ============================================================

export type MarketType = "api_threshold" | "subscription" | "relative" | "task_cost";
export type MarketStatus = "open" | "closed" | "resolved" | "disputed";
export type Role = "free" | "pro" | "admin";
export type Plan = "free" | "pro";
export type AlertType = "price_cross" | "resolution" | "new_insight";
export type InsightType = "time" | "threshold" | "cross_provider" | "task_token" | "subscription_api";
export type Severity = "high" | "medium" | "low";
export type ResolutionOutcome = "yes" | "no" | "void";
export type TradeDirection = "yes" | "no";

// --- User ---
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  plan: Plan;
  balance: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: Role;
  plan: Plan;
  balance: number;
}

// --- Market ---
export interface Market {
  id: string;
  title: string;
  description: string;
  type: MarketType;
  status: MarketStatus;
  provider: string;
  providers?: string[];
  modelClass?: string;
  taskType?: string;
  threshold?: number;
  metric?: string;
  // LMSR state
  qYes: number;
  qNo: number;
  b: number;
  // Volume
  volume: number;
  tradeCount: number;
  // Resolution
  resolutionDate: string;
  resolutionCriteria: string;
  resolutionSourceType: string;
  resolutionSourceName: string;
  resolutionSourceUrl: string;
  normalizationMethod: string;
  normalizationNotes: string;
  benchmarkTier?: string;
  equivalenceTier?: string;
  resolutionStatus: "pending" | "under_review" | "resolved" | "disputed";
  resolvedOutcome?: ResolutionOutcome;
  resolutionValue?: number;
  reviewerId?: string;
  resolvedAt?: string;
  disputeDeadline?: string;
  // Meta
  createdAt: string;
  updatedAt: string;
}

// --- Trade ---
export interface Trade {
  id: string;
  userId: string;
  marketId: string;
  direction: TradeDirection;
  shares: number;
  cost: number;
  priceAtTrade: number;
  newProbability: number;
  createdAt: string;
}

// --- Position ---
export interface Position {
  id: string;
  userId: string;
  marketId: string;
  direction: TradeDirection;
  shares: number;
  avgPrice: number;
  realizedPnl: number;
  createdAt: string;
  updatedAt: string;
}

// --- PricePoint ---
export interface PricePoint {
  id: string;
  marketId: string;
  price: number;
  timestamp: string;
}

// --- Insight ---
export interface Insight {
  id: string;
  title: string;
  type: InsightType;
  explanation: string;
  severity: Severity;
  confidence: number;
  linkedMarketIds: string[];
  status: "active" | "resolved" | "dismissed";
  createdAt: string;
  updatedAt: string;
}

// --- Provider ---
export interface Provider {
  id: string;
  slug: string;
  name: string;
  color: string;
  website: string;
  pricingUrl: string;
}

// --- ProviderPricingSnapshot ---
export interface ProviderPricingSnapshot {
  id: string;
  providerId: string;
  model: string;
  tier: string;
  inputPer1M: number;
  outputPer1M: number;
  effectiveDate: string;
  sourceUrl: string;
  createdAt: string;
}

// --- SubscriptionSnapshot ---
export interface SubscriptionSnapshot {
  id: string;
  providerId: string;
  planName: string;
  monthlyPrice: number;
  effectiveDate: string;
  sourceUrl: string;
  createdAt: string;
}

// --- BenchmarkTier ---
export interface BenchmarkTier {
  id: string;
  name: string;
  description: string;
  criteria: string;
  models: string[];
}

// --- BuilderScenario ---
export interface BuilderScenario {
  id: string;
  userId: string;
  name: string;
  useCase: string;
  monthlyRequests: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  tier: string;
  preferredProvider: string;
  budgetSensitivity: "low" | "medium" | "high";
  qualityPreference: "highest" | "balanced" | "cost_optimized";
  createdAt: string;
  updatedAt: string;
}

// --- BuilderProjection ---
export interface BuilderProjection {
  provider: string;
  model: string;
  currentMonthlyCost: number;
  projected12mCost: number;
  declineRate: number;
  marketAdjustedDecline: number;
  monthlyProjections: { month: number; cost: number }[];
}

export interface BuilderRecommendation {
  action: "stay" | "switch" | "monitor";
  explanation: string;
  projections: BuilderProjection[];
  bestProvider: string;
  bestModel: string;
  task: { label: string; inputTokens: number; outputTokens: number };
}

// --- Alert ---
export interface Alert {
  id: string;
  userId: string;
  marketId: string;
  type: AlertType;
  condition: string;
  threshold?: number;
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
}

// --- WatchlistItem ---
export interface WatchlistItem {
  id: string;
  userId: string;
  marketId: string;
  createdAt: string;
}

// --- AuditLog ---
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  createdAt: string;
}

// --- FeatureFlag ---
export interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string;
  updatedAt: string;
}

// --- API types ---
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface TradeRequest {
  marketId: string;
  direction: TradeDirection;
  shares: number;
}

export interface TradePreview {
  cost: number;
  newProbability: number;
  priceImpact: number;
  potentialPayout: number;
  currentPrice?: number;
}

// --- Frontend API response shapes ---

export interface PortfolioData {
  balance: number;
  positions: EnrichedPosition[];
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  totalMarketValue: number;
  portfolioValue: number;
  tradeCount: number;
}

export interface EnrichedPosition extends Position {
  marketTitle: string;
  marketStatus: string;
  currentPrice: number;
  unrealizedPnl: number;
  marketValue: number;
}

export interface AdminOverview {
  totalMarkets: number;
  openMarkets: number;
  totalUsers: number;
  totalTrades: number;
  totalVolume: number;
  activeInsights: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  plan: Plan;
  balance: number;
  createdAt: string;
}

export interface TradeExecuteResult {
  trade: Trade;
  newProbability: number;
  newBalance: number;
  priceImpact: number;
}

export interface WatchlistEntry extends WatchlistItem {
  market: Market & { probability: number };
}

