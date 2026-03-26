import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seed } from "@/lib/db/seed";
import { probYes } from "@/lib/engine/lmsr";
import { getSession } from "@/lib/auth";
import type { WatchlistItem } from "@/types";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/ratelimit";


function uid(): string {
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET() {
  await seed();
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });

    const items = db.watchlist.getByUser(session.userId);
    const enriched = items.map(item => {
      const market = db.markets.getById(item.marketId);
      return {
        ...item,
        market: market ? {
          ...market,
          probability: probYes({ qYes: market.qYes, qNo: market.qNo, b: market.b }),
        } : null,
      };
    }).filter(i => i.market);

    return NextResponse.json({ ok: true, data: enriched });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await seed();
  // Rate limit
  const ip = getClientIp(request);
  const rl = checkRateLimit(`api:${ip}`, RATE_LIMITS.api);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded. Please slow down." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });

    const { action, marketId } = await request.json();

    if (action === "add") {
      const market = db.markets.getById(marketId);
      if (!market) return NextResponse.json({ ok: false, error: "Market not found" }, { status: 404 });

      const existing = db.watchlist.getByUser(session.userId).find(w => w.marketId === marketId);
      if (existing) return NextResponse.json({ ok: true, data: existing });

      const item: WatchlistItem = {
        id: uid(),
        userId: session.userId,
        marketId,
        createdAt: new Date().toISOString(),
      };
      db.watchlist.insert(item);
      return NextResponse.json({ ok: true, data: item });
    }

    if (action === "remove") {
      const items = db.watchlist.getByUser(session.userId);
      const item = items.find(w => w.marketId === marketId);
      if (item) db.watchlist.delete(item.id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "Watchlist error" }, { status: 500 });
  }
}
