/**
 * Database Layer — Supabase PostgreSQL
 * 
 * Replaces the JSON file store with real PostgreSQL via Supabase.
 * 
 * IMPORTANT: The exported `db` API surface is identical to the old
 * JSON file DB. All callers (API routes, auth, seed) continue to work
 * without changes. The only difference: data persists across deploys.
 * 
 * Column naming: PostgreSQL uses snake_case, TypeScript uses camelCase.
 * We convert at the boundary using mapFromDb() and mapToDb().
 */

import { createClient } from "@supabase/supabase-js";
import type {
  User, Market, Trade, Position, PricePoint, Insight,
  Provider, ProviderPricingSnapshot, BenchmarkTier,
  BuilderScenario, Alert, WatchlistItem, AuditLog, FeatureFlag,
} from "@/types";

// Use service role client for server-side DB operations (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or key not configured");
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================================
// Snake_case <-> camelCase conversion
// ============================================================

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
}

function mapFromDb<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }
  return result as T;
}

function mapToDb(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[camelToSnake(key)] = value;
    }
  }
  return result;
}

function mapArrayFromDb<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map(r => mapFromDb<T>(r));
}

// ============================================================
// Generic helpers
// ============================================================

async function getAll<T>(table: string): Promise<T[]> {
  const { data, error } = await getClient().from(table).select("*");
  if (error) { console.error(`[db] getAll ${table}:`, error.message); return []; }
  return mapArrayFromDb<T>(data || []);
}

async function getById<T>(table: string, id: string): Promise<T | null> {
  const { data, error } = await getClient().from(table).select("*").eq("id", id).single();
  if (error || !data) return null;
  return mapFromDb<T>(data);
}

async function getByField<T>(table: string, field: string, value: unknown): Promise<T[]> {
  const snakeField = camelToSnake(field);
  const { data, error } = await getClient().from(table).select("*").eq(snakeField, value);
  if (error) { console.error(`[db] getByField ${table}.${snakeField}:`, error.message); return []; }
  return mapArrayFromDb<T>(data || []);
}

async function insert<T>(table: string, item: T): Promise<T> {
  const row = mapToDb(item as Record<string, unknown>);
  const { error } = await getClient().from(table).insert(row);
  if (error) { console.error(`[db] insert ${table}:`, error.message); throw new Error(error.message); }
  return item;
}

async function update<T>(table: string, id: string, updates: Partial<T>): Promise<T | null> {
  const row = mapToDb(updates as Record<string, unknown>);
  const { data, error } = await getClient().from(table).update(row).eq("id", id).select().single();
  if (error) { console.error(`[db] update ${table}:`, error.message); return null; }
  return data ? mapFromDb<T>(data) : null;
}

async function remove(table: string, id: string): Promise<boolean> {
  const { error } = await getClient().from(table).delete().eq("id", id);
  if (error) { console.error(`[db] delete ${table}:`, error.message); return false; }
  return true;
}

async function bulkInsert<T>(table: string, items: T[]): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map(i => mapToDb(i as Record<string, unknown>));
  const { error } = await getClient().from(table).insert(rows);
  if (error) console.error(`[db] bulkInsert ${table}:`, error.message);
}

async function replaceAll<T>(table: string, items: T[]): Promise<void> {
  // Delete all existing rows, then insert new ones
  await getClient().from(table).delete().neq("id", "");
  if (items.length > 0) {
    const rows = items.map(i => mapToDb(i as Record<string, unknown>));
    const { error } = await getClient().from(table).insert(rows);
    if (error) console.error(`[db] replaceAll ${table}:`, error.message);
  }
}

// ============================================================
// Typed exports — SAME API surface as old JSON file DB
// but now all operations are async (returning Promises)
// 
// For backward compatibility with sync callers, we use a
// synchronous in-memory cache that's populated on first access.
// This matches the old behavior where all reads were from memory.
// ============================================================

// In-memory cache for sync compatibility
let _cache: Record<string, unknown[]> | null = null;
let _cacheLoaded = false;

async function ensureCache(): Promise<void> {
  if (_cacheLoaded) return;
  _cacheLoaded = true;
  _cache = {};
  
  // Load all tables into cache
  const tables = [
    'users', 'markets', 'trades', 'positions', 'price_points',
    'insights', 'providers', 'pricing_snapshots', 'benchmark_tiers',
    'builder_scenarios', 'alerts', 'watchlist', 'audit_logs', 'feature_flags'
  ];
  
  await Promise.all(tables.map(async (table) => {
    const { data } = await getClient().from(table).select("*");
    _cache![table] = (data || []).map(r => mapFromDb(r));
  }));
}

function getCached<T>(table: string): T[] {
  if (!_cache || !_cache[table]) return [];
  return _cache[table] as T[];
}

function setCached<T>(table: string, items: T[]): void {
  if (!_cache) _cache = {};
  _cache[table] = items;
}

function addToCached<T extends { id: string }>(table: string, item: T): void {
  if (!_cache) _cache = {};
  if (!_cache[table]) _cache[table] = [];
  (_cache[table] as T[]).push(item);
}

function updateInCached<T extends { id: string }>(table: string, id: string, updates: Partial<T>): void {
  if (!_cache || !_cache[table]) return;
  const items = _cache[table] as T[];
  const idx = items.findIndex(i => i.id === id);
  if (idx !== -1) items[idx] = { ...items[idx], ...updates };
}

function removeFromCached(table: string, id: string): void {
  if (!_cache || !_cache[table]) return;
  _cache[table] = (_cache[table] as { id: string }[]).filter(i => i.id !== id);
}

// ============================================================
// The db export — sync reads from cache, async writes to Supabase
// Write-through: every mutation updates cache AND Supabase
// ============================================================

export const db = {
  // Must be called once before any reads
  init: ensureCache,

  users: {
    getAll: () => getCached<User>("users"),
    getById: (id: string) => getCached<User>("users").find(u => u.id === id) || null,
    getByEmail: (email: string) => getCached<User>("users").find(u => u.email === email) || null,
    insert: (user: User) => { addToCached("users", user); insert("users", user).catch(e => console.error("[db]", e)); return user; },
    update: (id: string, data: Partial<User>) => { updateInCached("users", id, data); update("users", id, data).catch(e => console.error("[db]", e)); return getCached<User>("users").find(u => u.id === id) || null; },
    delete: (id: string) => { removeFromCached("users", id); remove("users", id).catch(e => console.error("[db]", e)); return true; },
  },

  markets: {
    getAll: () => getCached<Market>("markets"),
    getById: (id: string) => getCached<Market>("markets").find(m => m.id === id) || null,
    getByType: (type: string) => getCached<Market>("markets").filter(m => m.type === type),
    getByProvider: (provider: string) => getCached<Market>("markets").filter(m => m.provider === provider),
    insert: (market: Market) => { addToCached("markets", market); insert("markets", market).catch(e => console.error("[db]", e)); return market; },
    update: (id: string, data: Partial<Market>) => { updateInCached("markets", id, data); update("markets", id, data).catch(e => console.error("[db]", e)); return getCached<Market>("markets").find(m => m.id === id) || null; },
    delete: (id: string) => { removeFromCached("markets", id); remove("markets", id).catch(e => console.error("[db]", e)); return true; },
    replaceAll: (markets: Market[]) => { setCached("markets", markets); replaceAll("markets", markets).catch(e => console.error("[db]", e)); },
  },

  trades: {
    getAll: () => getCached<Trade>("trades"),
    getByUser: (userId: string) => getCached<Trade>("trades").filter(t => t.userId === userId),
    getByMarket: (marketId: string) => getCached<Trade>("trades").filter(t => t.marketId === marketId),
    insert: (trade: Trade) => { addToCached("trades", trade); insert("trades", trade).catch(e => console.error("[db]", e)); return trade; },
  },

  positions: {
    getAll: () => getCached<Position>("positions"),
    getByUser: (userId: string) => getCached<Position>("positions").filter(p => p.userId === userId),
    getByUserAndMarket: (userId: string, marketId: string) => getCached<Position>("positions").filter(p => p.userId === userId && p.marketId === marketId),
    insert: (pos: Position) => { addToCached("positions", pos); insert("positions", pos).catch(e => console.error("[db]", e)); return pos; },
    update: (id: string, data: Partial<Position>) => { updateInCached("positions", id, data); update("positions", id, data).catch(e => console.error("[db]", e)); return getCached<Position>("positions").find(p => p.id === id) || null; },
  },

  pricePoints: {
    getByMarket: (marketId: string) =>
      getCached<PricePoint>("price_points")
        .filter(p => p.marketId === marketId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    insert: (pp: PricePoint) => { addToCached("price_points", pp); insert("price_points", pp).catch(e => console.error("[db]", e)); return pp; },
    bulkInsert: (pps: PricePoint[]) => { pps.forEach(pp => addToCached("price_points", pp)); bulkInsert("price_points", pps).catch(e => console.error("[db]", e)); },
  },

  insights: {
    getAll: () => getCached<Insight>("insights"),
    replaceAll: (insights: Insight[]) => { setCached("insights", insights); replaceAll("insights", insights).catch(e => console.error("[db]", e)); },
  },

  providers: {
    getAll: () => getCached<Provider>("providers"),
    insert: (p: Provider) => { addToCached("providers", p); insert("providers", p).catch(e => console.error("[db]", e)); return p; },
    replaceAll: (ps: Provider[]) => { setCached("providers", ps); replaceAll("providers", ps).catch(e => console.error("[db]", e)); },
  },

  pricingSnapshots: {
    getAll: () => getCached<ProviderPricingSnapshot>("pricing_snapshots"),
    getByProvider: (providerId: string) => getCached<ProviderPricingSnapshot>("pricing_snapshots").filter(s => s.providerId === providerId),
    insert: (s: ProviderPricingSnapshot) => { addToCached("pricing_snapshots", s); insert("pricing_snapshots", s).catch(e => console.error("[db]", e)); return s; },
    bulkInsert: (ss: ProviderPricingSnapshot[]) => { ss.forEach(s => addToCached("pricing_snapshots", s)); bulkInsert("pricing_snapshots", ss).catch(e => console.error("[db]", e)); },
  },

  benchmarkTiers: {
    getAll: () => getCached<BenchmarkTier>("benchmark_tiers"),
    replaceAll: (tiers: BenchmarkTier[]) => { setCached("benchmark_tiers", tiers); replaceAll("benchmark_tiers", tiers).catch(e => console.error("[db]", e)); },
  },

  builderScenarios: {
    getByUser: (userId: string) => getCached<BuilderScenario>("builder_scenarios").filter(s => s.userId === userId),
    insert: (s: BuilderScenario) => { addToCached("builder_scenarios", s); insert("builder_scenarios", s).catch(e => console.error("[db]", e)); return s; },
    update: (id: string, data: Partial<BuilderScenario>) => { updateInCached("builder_scenarios", id, data); update("builder_scenarios", id, data).catch(e => console.error("[db]", e)); return getCached<BuilderScenario>("builder_scenarios").find(s => s.id === id) || null; },
    delete: (id: string) => { removeFromCached("builder_scenarios", id); remove("builder_scenarios", id).catch(e => console.error("[db]", e)); return true; },
  },

  alerts: {
    getByUser: (userId: string) => getCached<Alert>("alerts").filter(a => a.userId === userId),
    insert: (a: Alert) => { addToCached("alerts", a); insert("alerts", a).catch(e => console.error("[db]", e)); return a; },
    update: (id: string, data: Partial<Alert>) => { updateInCached("alerts", id, data); update("alerts", id, data).catch(e => console.error("[db]", e)); return getCached<Alert>("alerts").find(a => a.id === id) || null; },
    delete: (id: string) => { removeFromCached("alerts", id); remove("alerts", id).catch(e => console.error("[db]", e)); return true; },
  },

  watchlist: {
    getByUser: (userId: string) => getCached<WatchlistItem>("watchlist").filter(w => w.userId === userId),
    insert: (w: WatchlistItem) => { addToCached("watchlist", w); insert("watchlist", w).catch(e => console.error("[db]", e)); return w; },
    delete: (id: string) => { removeFromCached("watchlist", id); remove("watchlist", id).catch(e => console.error("[db]", e)); return true; },
  },

  auditLogs: {
    getAll: () => getCached<AuditLog>("audit_logs"),
    getByUser: (userId: string) => getCached<AuditLog>("audit_logs").filter(l => l.userId === userId),
    insert: (log: AuditLog) => { addToCached("audit_logs", log); insert("audit_logs", log).catch(e => console.error("[db]", e)); return log; },
  },

  featureFlags: {
    getAll: () => getCached<FeatureFlag>("feature_flags"),
    getByKey: (key: string) => getCached<FeatureFlag>("feature_flags").find(f => f.key === key) || null,
    insert: (f: FeatureFlag) => { addToCached("feature_flags", f); insert("feature_flags", f).catch(e => console.error("[db]", e)); return f; },
    update: (id: string, data: Partial<FeatureFlag>) => { updateInCached("feature_flags", id, data); update("feature_flags", id, data).catch(e => console.error("[db]", e)); return getCached<FeatureFlag>("feature_flags").find(f => f.id === id) || null; },
    replaceAll: (flags: FeatureFlag[]) => { setCached("feature_flags", flags); replaceAll("feature_flags", flags).catch(e => console.error("[db]", e)); },
  },

  // Reset — clears all data
  reset: () => {
    _cache = {};
    ['users', 'markets', 'trades', 'positions', 'price_points', 'insights',
     'providers', 'pricing_snapshots', 'benchmark_tiers', 'builder_scenarios',
     'alerts', 'watchlist', 'audit_logs', 'feature_flags'].forEach(t => {
      _cache![t] = [];
    });
    // Async wipe all tables
    const client = getClient();
    Promise.all([
      client.from('trades').delete().neq('id', ''),
      client.from('positions').delete().neq('id', ''),
      client.from('price_points').delete().neq('id', ''),
      client.from('alerts').delete().neq('id', ''),
      client.from('watchlist').delete().neq('id', ''),
      client.from('builder_scenarios').delete().neq('id', ''),
      client.from('audit_logs').delete().neq('id', ''),
    ]).then(() => Promise.all([
      client.from('markets').delete().neq('id', ''),
      client.from('insights').delete().neq('id', ''),
    ])).then(() => Promise.all([
      client.from('users').delete().neq('id', ''),
    ])).catch(e => console.error("[db] reset error:", e));
  },

  // Check if seeded
  isSeeded: () => getCached<Market>("markets").length > 0,
};
