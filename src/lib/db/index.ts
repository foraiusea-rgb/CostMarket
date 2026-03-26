/**
 * Database Layer — In-Memory Cache + Write-Through to JSON File
 * 
 * Fixes:
 * - TOCTOU race condition: all mutations happen on in-memory state, then flush
 * - Performance: reads never touch disk after initial load
 * - Write serialization: a simple lock prevents concurrent flushes
 * 
 * Production migration: replace this module with Prisma client.
 * The exported `db` API surface is identical.
 */

import fs from "fs";
import path from "path";
import type {
  User, Market, Trade, Position, PricePoint, Insight,
  Provider, ProviderPricingSnapshot, BenchmarkTier,
  BuilderScenario, Alert, WatchlistItem, AuditLog, FeatureFlag,
} from "@/types";

const DB_PATH = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_PATH, "db.json");

interface DB {
  users: User[];
  markets: Market[];
  trades: Trade[];
  positions: Position[];
  pricePoints: PricePoint[];
  insights: Insight[];
  providers: Provider[];
  pricingSnapshots: ProviderPricingSnapshot[];
  benchmarkTiers: BenchmarkTier[];
  builderScenarios: BuilderScenario[];
  alerts: Alert[];
  watchlist: WatchlistItem[];
  auditLogs: AuditLog[];
  featureFlags: FeatureFlag[];
}

const EMPTY_DB: DB = {
  users: [],
  markets: [],
  trades: [],
  positions: [],
  pricePoints: [],
  insights: [],
  providers: [],
  pricingSnapshots: [],
  benchmarkTiers: [],
  builderScenarios: [],
  alerts: [],
  watchlist: [],
  auditLogs: [],
  featureFlags: [],
};

// ============================================================
// In-memory cache — single source of truth after initial load
// On Vercel (serverless), the filesystem is read-only.
// We detect this and run purely in-memory with seed data.
// ============================================================

let _cache: DB | null = null;
let _writing = false;
let _dirty = false;
let _diskAvailable: boolean | null = null;

function isDiskAvailable(): boolean {
  if (_diskAvailable !== null) return _diskAvailable;
  try {
    if (!fs.existsSync(DB_PATH)) fs.mkdirSync(DB_PATH, { recursive: true });
    // Test write
    const testFile = path.join(DB_PATH, ".write-test");
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    _diskAvailable = true;
  } catch {
    _diskAvailable = false;
  }
  return _diskAvailable;
}

function loadFromDisk(): DB {
  if (!isDiskAvailable()) return structuredClone(EMPTY_DB);
  if (!fs.existsSync(DB_FILE)) return structuredClone(EMPTY_DB);
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return { ...structuredClone(EMPTY_DB), ...JSON.parse(raw) };
  } catch {
    return structuredClone(EMPTY_DB);
  }
}

function getCache(): DB {
  if (!_cache) {
    _cache = loadFromDisk();
  }
  return _cache;
}

/**
 * Flush in-memory state to disk (if disk is available).
 * On Vercel serverless, this is a no-op — data lives in memory only.
 * Serialized: if a flush is in progress, mark dirty and let the current
 * flush handle it on completion.
 */
function flushToDisk(): void {
  if (!isDiskAvailable()) return; // Vercel: skip disk writes, memory is source of truth

  _dirty = true;
  if (_writing) return;

  _writing = true;
  while (_dirty) {
    _dirty = false;
    try {
      const data = JSON.stringify(_cache, null, 2);
      const tmpFile = DB_FILE + ".tmp";
      fs.writeFileSync(tmpFile, data);
      fs.renameSync(tmpFile, DB_FILE);
    } catch (e) {
      console.error("[db] flush failed:", e);
    }
  }
  _writing = false;
}

// ============================================================
// Generic CRUD — all operate on in-memory cache
// ============================================================

type Collection = keyof DB;

function getAll<T>(collection: Collection): T[] {
  const cache = getCache();
  return (cache[collection] as unknown as T[]) || [];
}

function getById<T extends { id: string }>(collection: Collection, id: string): T | null {
  const items = getAll<T>(collection);
  return items.find(i => i.id === id) || null;
}

function getByField<T extends { id: string }>(
  collection: Collection,
  field: string,
  value: unknown
): T[] {
  const items = getAll<T>(collection);
  return items.filter(i => (i as any)[field] === value);
}

function insert<T extends { id: string }>(collection: Collection, item: T): T {
  const cache = getCache();
  (cache[collection] as unknown as T[]).push(item);
  flushToDisk();
  return item;
}

function update<T extends { id: string }>(collection: Collection, id: string, updates: Partial<T>): T | null {
  const cache = getCache();
  const items = cache[collection] as unknown as T[];
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...updates };
  flushToDisk();
  return items[idx];
}

function remove(collection: Collection, id: string): boolean {
  const cache = getCache();
  const items = cache[collection] as unknown as { id: string }[];
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return false;
  items.splice(idx, 1);
  flushToDisk();
  return true;
}

function bulkInsert<T extends { id: string }>(collection: Collection, newItems: T[]): void {
  const cache = getCache();
  (cache[collection] as unknown as T[]).push(...newItems);
  flushToDisk();
}

function replaceAll<T>(collection: Collection, items: T[]): void {
  const cache = getCache();
  (cache[collection] as unknown as T[]) = items;
  flushToDisk();
}

// ============================================================
// Typed exports — API surface identical to original
// ============================================================

export const db = {
  users: {
    getAll: () => getAll<User>("users"),
    getById: (id: string) => getById<User>("users", id),
    getByEmail: (email: string) => getByField<User>("users", "email", email)[0] || null,
    insert: (user: User) => insert("users", user),
    update: (id: string, data: Partial<User>) => update<User>("users", id, data),
    delete: (id: string) => remove("users", id),
  },

  markets: {
    getAll: () => getAll<Market>("markets"),
    getById: (id: string) => getById<Market>("markets", id),
    getByType: (type: string) => getByField<Market>("markets", "type", type),
    getByProvider: (provider: string) => getByField<Market>("markets", "provider", provider),
    insert: (market: Market) => insert("markets", market),
    update: (id: string, data: Partial<Market>) => update<Market>("markets", id, data),
    delete: (id: string) => remove("markets", id),
    replaceAll: (markets: Market[]) => replaceAll<Market>("markets", markets),
  },

  trades: {
    getAll: () => getAll<Trade>("trades"),
    getByUser: (userId: string) => getByField<Trade>("trades", "userId", userId),
    getByMarket: (marketId: string) => getByField<Trade>("trades", "marketId", marketId),
    insert: (trade: Trade) => insert("trades", trade),
  },

  positions: {
    getAll: () => getAll<Position>("positions"),
    getByUser: (userId: string) => getByField<Position>("positions", "userId", userId),
    getByUserAndMarket: (userId: string, marketId: string) => {
      return getAll<Position>("positions").filter(p => p.userId === userId && p.marketId === marketId);
    },
    insert: (pos: Position) => insert("positions", pos),
    update: (id: string, data: Partial<Position>) => update<Position>("positions", id, data),
  },

  pricePoints: {
    getByMarket: (marketId: string) =>
      getByField<PricePoint>("pricePoints", "marketId", marketId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    insert: (pp: PricePoint) => insert("pricePoints", pp),
    bulkInsert: (pps: PricePoint[]) => bulkInsert("pricePoints", pps),
  },

  insights: {
    getAll: () => getAll<Insight>("insights"),
    replaceAll: (insights: Insight[]) => replaceAll<Insight>("insights", insights),
  },

  providers: {
    getAll: () => getAll<Provider>("providers"),
    insert: (p: Provider) => insert("providers", p),
    replaceAll: (ps: Provider[]) => replaceAll<Provider>("providers", ps),
  },

  pricingSnapshots: {
    getAll: () => getAll<ProviderPricingSnapshot>("pricingSnapshots"),
    getByProvider: (providerId: string) =>
      getByField<ProviderPricingSnapshot>("pricingSnapshots", "providerId", providerId),
    insert: (s: ProviderPricingSnapshot) => insert("pricingSnapshots", s),
    bulkInsert: (ss: ProviderPricingSnapshot[]) => bulkInsert("pricingSnapshots", ss),
  },

  benchmarkTiers: {
    getAll: () => getAll<BenchmarkTier>("benchmarkTiers"),
    replaceAll: (tiers: BenchmarkTier[]) => replaceAll<BenchmarkTier>("benchmarkTiers", tiers),
  },

  builderScenarios: {
    getByUser: (userId: string) => getByField<BuilderScenario>("builderScenarios", "userId", userId),
    insert: (s: BuilderScenario) => insert("builderScenarios", s),
    update: (id: string, data: Partial<BuilderScenario>) => update<BuilderScenario>("builderScenarios", id, data),
    delete: (id: string) => remove("builderScenarios", id),
  },

  alerts: {
    getByUser: (userId: string) => getByField<Alert>("alerts", "userId", userId),
    insert: (a: Alert) => insert("alerts", a),
    update: (id: string, data: Partial<Alert>) => update<Alert>("alerts", id, data),
    delete: (id: string) => remove("alerts", id),
  },

  watchlist: {
    getByUser: (userId: string) => getByField<WatchlistItem>("watchlist", "userId", userId),
    insert: (w: WatchlistItem) => insert("watchlist", w),
    delete: (id: string) => remove("watchlist", id),
  },

  auditLogs: {
    getAll: () => getAll<AuditLog>("auditLogs"),
    getByUser: (userId: string) => getByField<AuditLog>("auditLogs", "userId", userId),
    insert: (log: AuditLog) => insert("auditLogs", log),
  },

  featureFlags: {
    getAll: () => getAll<FeatureFlag>("featureFlags"),
    getByKey: (key: string) => getByField<FeatureFlag>("featureFlags", "key", key)[0] || null,
    insert: (f: FeatureFlag) => insert("featureFlags", f),
    update: (id: string, data: Partial<FeatureFlag>) => update<FeatureFlag>("featureFlags", id, data),
    replaceAll: (flags: FeatureFlag[]) => replaceAll<FeatureFlag>("featureFlags", flags),
  },

  // Reset — clears in-memory cache AND disk
  reset: () => {
    _cache = structuredClone(EMPTY_DB);
    flushToDisk();
  },

  // Check if seeded
  isSeeded: () => {
    return getCache().markets.length > 0;
  },
};
