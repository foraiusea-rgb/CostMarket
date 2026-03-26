-- ============================================================
-- AI Cost Markets — Supabase PostgreSQL Schema
-- 
-- Paste this entire file into Supabase SQL Editor and click Run.
-- It creates all 14 tables, indexes, and seed data.
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. USERS
-- ============================================================
create table if not exists users (
  id text primary key,                    -- Supabase auth UID
  email text unique not null,
  password_hash text not null default '',  -- Empty — Supabase handles auth
  name text not null,
  role text not null default 'free' check (role in ('free', 'pro', 'admin')),
  plan text not null default 'free' check (plan in ('free', 'pro')),
  balance numeric not null default 10000,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. PROVIDERS
-- ============================================================
create table if not exists providers (
  id text primary key,
  slug text unique not null,
  name text not null,
  color text not null,
  website text not null,
  pricing_url text not null
);

-- ============================================================
-- 3. MARKETS
-- ============================================================
create table if not exists markets (
  id text primary key,
  title text not null,
  description text not null,
  type text not null check (type in ('api_threshold', 'subscription', 'relative', 'task_cost')),
  status text not null default 'open' check (status in ('open', 'closed', 'resolved', 'disputed', 'proposed')),
  provider text not null,
  providers text[] default '{}',
  model_class text,
  task_type text,
  threshold numeric,
  metric text,
  q_yes numeric not null,
  q_no numeric not null,
  b numeric not null default 100,
  volume integer not null default 0,
  trade_count integer not null default 0,
  resolution_date date not null,
  resolution_criteria text not null,
  resolution_source_type text not null default 'official_pricing_page',
  resolution_source_name text not null default '',
  resolution_source_url text not null default '',
  normalization_method text not null default 'standard_on_demand',
  normalization_notes text not null default '',
  benchmark_tier text,
  equivalence_tier text,
  resolution_status text not null default 'pending',
  resolved_outcome text,
  resolution_value numeric,
  reviewer_id text,
  resolved_at timestamptz,
  dispute_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_markets_status on markets(status);
create index idx_markets_provider on markets(provider);

-- ============================================================
-- 4. TRADES
-- ============================================================
create table if not exists trades (
  id text primary key,
  user_id text not null references users(id),
  market_id text not null references markets(id),
  direction text not null check (direction in ('yes', 'no')),
  shares numeric not null,
  cost numeric not null,
  price_at_trade numeric not null,
  new_probability numeric not null,
  created_at timestamptz not null default now()
);

create index idx_trades_user on trades(user_id);
create index idx_trades_market on trades(market_id);

-- ============================================================
-- 5. POSITIONS
-- ============================================================
create table if not exists positions (
  id text primary key,
  user_id text not null references users(id),
  market_id text not null references markets(id),
  direction text not null check (direction in ('yes', 'no')),
  shares numeric not null,
  avg_price numeric not null,
  realized_pnl numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, market_id, direction)
);

-- ============================================================
-- 6. PRICE_POINTS
-- ============================================================
create table if not exists price_points (
  id text primary key,
  market_id text not null references markets(id),
  price numeric not null,
  timestamp timestamptz not null default now()
);

create index idx_price_points_market_time on price_points(market_id, timestamp);

-- ============================================================
-- 7. INSIGHTS
-- ============================================================
create table if not exists insights (
  id text primary key,
  title text not null,
  type text not null,
  explanation text not null,
  severity text not null check (severity in ('high', 'medium', 'low')),
  confidence numeric not null,
  linked_market_ids text[] not null default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 8. PRICING_SNAPSHOTS
-- ============================================================
create table if not exists pricing_snapshots (
  id text primary key,
  provider_id text not null references providers(id),
  model text not null,
  tier text not null,
  input_per_1m numeric not null,
  output_per_1m numeric not null,
  effective_date date not null,
  source_url text not null,
  created_at timestamptz not null default now()
);

create index idx_snapshots_provider on pricing_snapshots(provider_id);

-- ============================================================
-- 9. BENCHMARK_TIERS
-- ============================================================
create table if not exists benchmark_tiers (
  id text primary key,
  name text not null,
  description text not null,
  criteria text not null,
  models text[] not null default '{}'
);

-- ============================================================
-- 10. BUILDER_SCENARIOS
-- ============================================================
create table if not exists builder_scenarios (
  id text primary key,
  user_id text not null references users(id),
  name text not null,
  use_case text not null,
  monthly_requests integer not null,
  avg_input_tokens integer not null default 500,
  avg_output_tokens integer not null default 300,
  tier text not null,
  preferred_provider text not null,
  budget_sensitivity text not null default 'medium',
  quality_preference text not null default 'balanced',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 11. ALERTS
-- ============================================================
create table if not exists alerts (
  id text primary key,
  user_id text not null references users(id),
  market_id text not null references markets(id),
  type text not null default 'price_cross',
  condition text not null,
  threshold numeric,
  triggered boolean not null default false,
  triggered_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 12. WATCHLIST
-- ============================================================
create table if not exists watchlist (
  id text primary key,
  user_id text not null references users(id),
  market_id text not null references markets(id),
  created_at timestamptz not null default now(),
  unique(user_id, market_id)
);

-- ============================================================
-- 13. AUDIT_LOGS
-- ============================================================
create table if not exists audit_logs (
  id text primary key,
  user_id text not null,
  action text not null,
  resource text not null,
  resource_id text not null,
  details text not null,
  created_at timestamptz not null default now()
);

create index idx_audit_user on audit_logs(user_id);
create index idx_audit_time on audit_logs(created_at);

-- ============================================================
-- 14. FEATURE_FLAGS
-- ============================================================
create table if not exists feature_flags (
  id text primary key,
  key text unique not null,
  enabled boolean not null default false,
  description text not null,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- SEED DATA: Providers
-- ============================================================
insert into providers (id, slug, name, color, website, pricing_url) values
  ('openai', 'openai', 'OpenAI', '#10a37f', 'https://openai.com', 'https://openai.com/api/pricing'),
  ('anthropic', 'anthropic', 'Anthropic', '#d97706', 'https://anthropic.com', 'https://www.anthropic.com/pricing'),
  ('google', 'google', 'Google DeepMind', '#4285f4', 'https://deepmind.google', 'https://ai.google.dev/pricing')
on conflict (id) do nothing;

-- ============================================================
-- SEED DATA: Pricing Snapshots
-- ============================================================
insert into pricing_snapshots (id, provider_id, model, tier, input_per_1m, output_per_1m, effective_date, source_url) values
  ('ps1', 'openai', 'GPT-4o', 'frontier', 2.5, 10.0, '2025-03-01', 'https://openai.com/api/pricing'),
  ('ps2', 'openai', 'GPT-4o-mini', 'mid', 0.15, 0.6, '2025-03-01', 'https://openai.com/api/pricing'),
  ('ps3', 'anthropic', 'Claude Sonnet 4', 'frontier', 3.0, 15.0, '2025-03-01', 'https://www.anthropic.com/pricing'),
  ('ps4', 'anthropic', 'Claude Haiku 3.5', 'mid', 0.8, 4.0, '2025-03-01', 'https://www.anthropic.com/pricing'),
  ('ps5', 'google', 'Gemini 2.0 Pro', 'frontier', 1.25, 5.0, '2025-03-01', 'https://ai.google.dev/pricing'),
  ('ps6', 'google', 'Gemini 2.0 Flash', 'mid', 0.1, 0.4, '2025-03-01', 'https://ai.google.dev/pricing')
on conflict (id) do nothing;

-- ============================================================
-- SEED DATA: Benchmark Tiers
-- ============================================================
insert into benchmark_tiers (id, name, description, criteria, models) values
  ('frontier', 'Frontier', 'Top-tier models scoring in the 85th+ percentile on major benchmarks', 'MMLU >= 85th pct, HumanEval >= 85th pct, GPQA >= 85th pct', ARRAY['GPT-4o', 'Claude Sonnet 4', 'Gemini 2.0 Pro']),
  ('mid', 'Mid-tier', 'Capable models scoring 60-84th percentile on major benchmarks', 'MMLU 60-84th pct, HumanEval 60-84th pct', ARRAY['GPT-4o-mini', 'Claude Haiku 3.5', 'Gemini 2.0 Flash'])
on conflict (id) do nothing;

-- ============================================================
-- SEED DATA: Feature Flags
-- ============================================================
insert into feature_flags (id, key, enabled, description) values
  ('ff1', 'trading_enabled', true, 'Enable simulated trading'),
  ('ff2', 'builder_enabled', true, 'Enable builder dashboard'),
  ('ff3', 'alerts_enabled', true, 'Enable price alerts'),
  ('ff4', 'openrouter_enabled', false, 'Enable OpenRouter AI features'),
  ('ff5', 'stripe_enabled', false, 'Enable Stripe billing')
on conflict (id) do nothing;

-- ============================================================
-- DONE — Markets and price history are seeded from the app
-- on first load via the seed.ts file, which now writes to
-- Supabase instead of JSON.
-- ============================================================
