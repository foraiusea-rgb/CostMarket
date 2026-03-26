import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seed } from "@/lib/db/seed";
import { probYes } from "@/lib/engine/lmsr";
import { getSession } from "@/lib/auth";

seed();

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    }

    const user = db.users.getById(session.userId);
    if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    const positions = db.positions.getByUser(session.userId);
    const trades = db.trades.getByUser(session.userId);

    // Enrich positions with market data and PnL
    const enrichedPositions = positions.map(pos => {
      const market = db.markets.getById(pos.marketId);
      if (!market) return { ...pos, marketTitle: "Unknown", currentPrice: 0, unrealizedPnl: 0, marketStatus: "unknown", marketValue: 0 };

      const state = { qYes: market.qYes, qNo: market.qNo, b: market.b };
      const currentPrice = probYes(state);
      const dirPrice = pos.direction === "yes" ? currentPrice : 1 - currentPrice;
      const uPnl = (dirPrice - pos.avgPrice) * pos.shares;

      return {
        ...pos,
        marketTitle: market.title,
        marketStatus: market.status,
        currentPrice: dirPrice,
        unrealizedPnl: uPnl,
        marketValue: dirPrice * pos.shares,
      };
    }).filter(p => p.shares > 0);

    const totalUnrealizedPnl = enrichedPositions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);
    const totalRealizedPnl = positions.reduce((sum, p) => sum + p.realizedPnl, 0);
    const totalMarketValue = enrichedPositions.reduce((sum, p) => sum + (p.marketValue || 0), 0);

    return NextResponse.json({
      ok: true,
      data: {
        balance: user.balance,
        positions: enrichedPositions,
        totalUnrealizedPnl,
        totalRealizedPnl,
        totalMarketValue,
        portfolioValue: user.balance + totalMarketValue,
        tradeCount: trades.length,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch portfolio" }, { status: 500 });
  }
}
