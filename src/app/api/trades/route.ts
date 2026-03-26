import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seed } from "@/lib/db/seed";
import { executeTrade, costForShares, probYes, potentialPayout } from "@/lib/engine/lmsr";
import { detectAllInsights } from "@/lib/engine/arbitrage";
import { getSession } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/ratelimit";
import type { Trade, Position, PricePoint } from "@/types";

seed();

function uid(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: NextRequest) {
  // Rate limit — 30 trades per minute per IP
  const ip = getClientIp(request);
  const rl = checkRateLimit(`trade:${ip}`, RATE_LIMITS.trade);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded. Please slow down." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }

    const body = await request.json();
    const { action, marketId, direction, shares } = body;

    // --- Preview ---
    if (action === "preview") {
      if (!marketId || typeof shares !== "number" || !Number.isFinite(shares) || shares <= 0) {
        return NextResponse.json({ ok: false, error: "Invalid preview parameters" }, { status: 400 });
      }
      if (direction !== "yes" && direction !== "no") {
        return NextResponse.json({ ok: false, error: "Direction must be 'yes' or 'no'" }, { status: 400 });
      }
      const market = db.markets.getById(marketId);
      if (!market) return NextResponse.json({ ok: false, error: "Market not found" }, { status: 404 });
      if (market.status !== "open") return NextResponse.json({ ok: false, error: "Market is not open" }, { status: 400 });

      const state = { qYes: market.qYes, qNo: market.qNo, b: market.b };
      const cost = costForShares(state, direction, shares);
      const result = executeTrade(state, direction, shares);
      const payout = potentialPayout(state, direction, shares);

      return NextResponse.json({
        ok: true,
        data: {
          cost,
          newProbability: result.newProbYes,
          priceImpact: result.priceImpact,
          potentialPayout: payout,
          currentPrice: probYes(state),
        },
      });
    }

    // --- Execute Trade ---
    if (action === "execute") {
      if (!marketId || typeof marketId !== "string") {
        return NextResponse.json({ ok: false, error: "Invalid market ID" }, { status: 400 });
      }
      if (direction !== "yes" && direction !== "no") {
        return NextResponse.json({ ok: false, error: "Direction must be 'yes' or 'no'" }, { status: 400 });
      }
      if (typeof shares !== "number" || !Number.isFinite(shares) || !Number.isInteger(shares) || shares <= 0) {
        return NextResponse.json({ ok: false, error: "Shares must be a positive integer" }, { status: 400 });
      }
      if (shares > 1000) {
        return NextResponse.json({ ok: false, error: "Maximum 1000 shares per trade" }, { status: 400 });
      }

      const market = db.markets.getById(marketId);
      if (!market) return NextResponse.json({ ok: false, error: "Market not found" }, { status: 404 });
      if (market.status !== "open") return NextResponse.json({ ok: false, error: "Market is not open" }, { status: 400 });

      const user = db.users.getById(session.userId);
      if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

      const state = { qYes: market.qYes, qNo: market.qNo, b: market.b };
      const tradeCost = costForShares(state, direction, shares);

      if (tradeCost > user.balance) {
        return NextResponse.json({ ok: false, error: "Insufficient balance" }, { status: 400 });
      }

      // Execute LMSR trade
      const result = executeTrade(state, direction, shares);

      // Update market
      db.markets.update(marketId, {
        qYes: result.newState.qYes,
        qNo: result.newState.qNo,
        volume: market.volume + Math.round(Math.abs(tradeCost) * 100),
        tradeCount: market.tradeCount + 1,
        updatedAt: new Date().toISOString(),
      });

      // Deduct balance
      db.users.update(user.id, {
        balance: user.balance - tradeCost,
        updatedAt: new Date().toISOString(),
      });

      // Record trade
      const trade: Trade = {
        id: uid(),
        userId: user.id,
        marketId,
        direction,
        shares,
        cost: tradeCost,
        priceAtTrade: probYes(state),
        newProbability: result.newProbYes,
        createdAt: new Date().toISOString(),
      };
      db.trades.insert(trade);

      // Update or create position
      const existingPositions = db.positions.getByUserAndMarket(user.id, marketId);
      const existingPos = existingPositions.find(p => p.direction === direction);

      if (existingPos) {
        const newShares = existingPos.shares + shares;
        const totalCost = existingPos.avgPrice * existingPos.shares + tradeCost;
        const newAvgPrice = totalCost / newShares;
        db.positions.update(existingPos.id, {
          shares: newShares,
          avgPrice: newAvgPrice,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const pos: Position = {
          id: `p_${uid()}`,
          userId: user.id,
          marketId,
          direction,
          shares,
          avgPrice: tradeCost / shares,
          realizedPnl: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.positions.insert(pos);
      }

      // Add price point
      const pp: PricePoint = {
        id: `pp_${uid()}`,
        marketId,
        price: result.newProbYes,
        timestamp: new Date().toISOString(),
      };
      db.pricePoints.insert(pp);

      // Recompute insights
      const allMarkets = db.markets.getAll();
      const insights = detectAllInsights(allMarkets);
      db.insights.replaceAll(insights);

      return NextResponse.json({
        ok: true,
        data: {
          trade,
          newProbability: result.newProbYes,
          newBalance: user.balance - tradeCost,
          priceImpact: result.priceImpact,
        },
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Trade failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// GET: trade history
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get("marketId");

    let trades = db.trades.getByUser(session.userId);
    if (marketId) {
      trades = trades.filter(t => t.marketId === marketId);
    }

    trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50") || 50));
    const total = trades.length;
    const paginated = trades.slice((page - 1) * limit, page * limit);

    return NextResponse.json({ ok: true, data: paginated, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch trades" }, { status: 500 });
  }
}
