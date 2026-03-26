# AI Cost Markets

**AI pricing intelligence and prediction markets platform.**

Trade on future API and subscription pricing for OpenAI, Anthropic, and Google DeepMind. Discover mispricing. Make data-driven infrastructure decisions.

> All trading is simulated. This is not a financial product.

---

## What This Is

AI Cost Markets is a specialized forecasting product for AI infrastructure teams. It combines:

- **Prediction markets** — simulated Yes/No binary markets on AI pricing outcomes
- **LMSR automated market maker** — continuous liquidity via Hanson's logarithmic scoring rule
- **Arbitrage detection** — rule-based engine that flags logical inconsistencies across markets
- **Cost builder** — projections adjusted by live market probabilities to recommend stay/switch/monitor

It is built for founders, PMs, and infra engineers who need to make real decisions about AI provider pricing.

---

## Architecture

```
ai-cost-markets/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (public)/           # Markets, Builder, Methodology, Pricing
│   │   ├── (auth)/             # Login, Signup
│   │   ├── (dashboard)/        # Portfolio, Watchlist, Scenarios, Settings
│   │   ├── (admin)/            # Admin console (5 pages)
│   │   └── api/                # 10 API routes
│   ├── components/
│   │   ├── ui/                 # Reusable components (Badge, Card, Button, Input)
│   │   ├── charts/             # Canvas-based PriceChart, Sparkline
│   │   └── layout/             # Nav
│   ├── lib/
│   │   ├── engine/             # LMSR, Arbitrage, Builder (pure math, no I/O)
│   │   ├── db/                 # JSON file store + seed data
│   │   └── auth/               # JWT sessions, bcrypt passwords, RBAC
│   └── types/                  # 20+ TypeScript interfaces
├── __tests__/                  # 26 passing tests (LMSR + Arbitrage)
├── prisma/                     # Production PostgreSQL schema
└── data/                       # Runtime JSON database (gitignored)
```

### Key Design Decisions

- **Engine layer is pure** — LMSR math, arbitrage rules, and builder logic have zero I/O dependencies. Deterministic, testable, fast.
- **DB layer is swappable** — JSON file store in dev matches the Prisma schema exactly. Switch to PostgreSQL by changing one import.
- **Server components for data, client components for interaction** — Markets list fetches server-side; trading is client-side with API calls.
- **All state persists** — trades, positions, balances, price history, insights all survive restarts.

---

## Pages (17 total)

### Public
| Page | Path | Description |
|------|------|-------------|
| Markets | `/markets` | Filterable, sortable market list with stats + arbitrage insights |
| Market Detail | `/markets/[id]` | Chart, trade ticket, resolution rules, related markets |
| Builder | `/builder` | Cost projections across providers, save scenarios |
| Methodology | `/methodology` | LMSR explainer, resolution rules, disclosures |
| Pricing | `/pricing` | Free vs Pro plans |

### Authenticated
| Page | Path | Description |
|------|------|-------------|
| Login | `/login` | Email/password |
| Signup | `/signup` | Account creation ($10k simulated balance) |
| Portfolio | `/portfolio` | Positions, unrealized P&L, market value |
| Watchlist | `/watchlist` | Starred markets |
| Saved Scenarios | `/scenarios` | Builder scenarios |
| Settings | `/settings` | Account info |

### Admin
| Page | Path | Description |
|------|------|-------------|
| Overview | `/admin` | Stats + audit log |
| Markets | `/admin/markets` | Status management |
| Resolutions | `/admin/resolutions` | Resolve YES/NO/VOID with settlement |
| Sources | `/admin/sources` | Provider pricing snapshots |
| Users | `/admin/users` | Role management |
| Feature Flags | `/admin/flags` | Toggle features |

---

## API Routes (10)

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth` | GET, POST | Login, signup, logout, session check |
| `/api/markets` | GET | List markets (filtered/sorted) or single market detail |
| `/api/trades` | GET, POST | Execute trades, preview, trade history |
| `/api/portfolio` | GET | Positions, P&L, balance |
| `/api/insights` | GET | Current arbitrage insights |
| `/api/builder` | GET, POST | Generate recommendations, save scenarios |
| `/api/watchlist` | GET, POST | Add/remove watched markets |
| `/api/alerts` | GET, POST | Create/delete price alerts |
| `/api/admin` | GET, POST | Market management, resolution, users, flags, audit |
| `/api/health` | GET | Health check |

---

## Core Algorithms

### LMSR (src/lib/engine/lmsr.ts)
- `cost(state)` — Cost function C(q) with numerically stable log-sum-exp
- `price(state, outcome)` — Implied probability
- `costForShares(state, outcome, shares)` — Trade cost preview
- `executeTrade(state, outcome, shares)` — Full trade execution with price impact
- `potentialPayout()`, `unrealizedPnl()`, `realizedPnl()` — P&L calculations
- `createState(probability)` — Initialize from target probability
- `validateState()` — Numerical safety checks

### Arbitrage (src/lib/engine/arbitrage.ts)
5 rule classes, each producing typed Insight objects:
1. **Time inconsistency** — later deadline + easier threshold must be ≥ earlier probability
2. **Threshold monotonicity** — easier threshold must have ≥ probability than harder
3. **Cross-provider** — relative pricing markets must align with individual thresholds
4. **Task-to-token** — task cost markets must be consistent with underlying token costs
5. **Subscription-API divergence** — consumer and API pricing moves should correlate

### Builder (src/lib/engine/builder.ts)
- Per-provider cost projection with configurable task profiles
- Decline rates adjusted by **live market probabilities** (markets predicting price drops boost the decline rate)
- Deterministic stay/switch/monitor recommendation with budget sensitivity and quality preference overrides

---

## Data Models (20 types)

User, Market, Trade, Position, PricePoint, Insight, Provider, ProviderPricingSnapshot, SubscriptionSnapshot, BenchmarkTier, BuilderScenario, BuilderProjection, BuilderRecommendation, Alert, WatchlistItem, AuditLog, FeatureFlag, ApiResponse, TradeRequest, TradePreview

Full Prisma schema at `prisma/schema.prisma`.

---

## Seed Data

10 markets across all 4 types:
- **API Threshold** (5): GPT-4 ≤$2, Claude ≤$1, GPT-4 ≤$5, Gemini ≤$1
- **Subscription** (2): ChatGPT Plus ≤$10, Claude Pro free tier
- **Relative** (2): Anthropic vs OpenAI frontier, Google vs all mid-tier
- **Task Cost** (2): Chatbot ≤$0.50/1k, Agent ≤$3/hr

Seed data intentionally creates detectable arbitrage inconsistencies.

---

## Setup

```bash
# Clone / extract
tar xzf ai-cost-markets-v1.tar.gz
cd ai-cost-markets

# Install
npm install

# Environment
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET to something random

# Run tests
npm test
# → 26 passed, 0 failed

# Build
npm run build

# Start
npm start
# → http://localhost:3000

# Development
npm run dev
```

### First Use
1. Go to `/signup` and create an account
2. Browse markets at `/markets`
3. Click any market → trade Yes or No
4. Check your portfolio at `/portfolio`
5. Try the builder at `/builder`
6. To access admin: manually set your user role to "admin" in `data/db.json`, or use the seed script

### Reset
```bash
rm -rf data/db.json
# Restart the server — seed data auto-regenerates
```

---

## Tests

```
=== LMSR Engine Tests ===
  ✓ Prices sum to 1
  ✓ Equal shares → 50/50
  ✓ Buying Yes increases probability
  ✓ Buying No decreases Yes probability
  ✓ Cost is positive
  ✓ Larger trades cost more
  ✓ Price impact grows with shares
  ✓ Potential payout positive and < shares
  ✓ Realized PnL win/lose
  ✓ createState from probability
  ✓ Validate state rejects NaN, b=0, b<0
  ✓ Numerical stability at extremes
=== 20 passed ===

=== Arbitrage Detection Tests ===
  ✓ Time inconsistency detection
  ✓ No false positives
  ✓ Threshold inconsistency detection
  ✓ Cross-provider inconsistency
  ✓ Task-to-token inconsistency
  ✓ Severity ordering
=== 6 passed ===
```

---

## Production Migration Path

1. **Database**: Replace `src/lib/db/index.ts` with Prisma client using `prisma/schema.prisma`. Run `npx prisma migrate dev`.
2. **Auth**: Swap JWT for next-auth or lucia. Add OAuth providers.
3. **Billing**: Wire up Stripe using the env vars. Add webhook handler and entitlement middleware.
4. **OpenRouter**: Add AI summaries for market descriptions and builder explanations using the structured integration pattern in `src/lib/ai/`.
5. **Deploy**: Vercel (recommended) or any Node.js host. Set env vars. Point DATABASE_URL to PostgreSQL.

---

## Remaining Gaps

| Area | Status | Notes |
|------|--------|-------|
| Trading | ✅ Complete | LMSR, positions, P&L, validation |
| Markets | ✅ Complete | 4 types, filters, sorts, detail, resolution rules |
| Arbitrage | ✅ Complete | 5 rule classes, live recalculation |
| Builder | ✅ Complete | Market-adjusted projections, save scenarios |
| Auth | ✅ Complete | JWT sessions, bcrypt, RBAC |
| Portfolio | ✅ Complete | Positions, unrealized/realized P&L |
| Watchlist | ✅ Complete | Add/remove |
| Admin | ✅ Complete | 5 pages, resolution workflow, audit log |
| Methodology | ✅ Complete | LMSR explainer, disclosures |
| Tests | ✅ 26 passing | LMSR math + arbitrage rules |
| Password reset | 🔲 Stub | Needs email integration |
| Stripe billing | 🔲 Stub | Env vars ready, needs webhook |
| OpenRouter AI | 🔲 Stub | Integration pattern defined |
| Email alerts | 🔲 Stub | Alert model exists, needs delivery |
| Rate limiting | 🔲 Stub | Needs middleware |

---

## License

Proprietary. All rights reserved.
