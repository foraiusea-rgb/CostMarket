import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seed } from "@/lib/db/seed";
import { probYes } from "@/lib/engine/lmsr";
import type { Market } from "@/types";


export async function GET(request: NextRequest) {
  await seed();
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const provider = searchParams.get("provider");
    const status = searchParams.get("status") || "open";
    const sort = searchParams.get("sort") || "volume";
    const id = searchParams.get("id");

    // Single market detail
    if (id) {
      const market = db.markets.getById(id);
      if (!market) {
        return NextResponse.json({ ok: false, error: "Market not found" }, { status: 404 });
      }
      const priceHistory = db.pricePoints.getByMarket(id);
      const prob = probYes({ qYes: market.qYes, qNo: market.qNo, b: market.b });
      return NextResponse.json({
        ok: true,
        data: { market, priceHistory, probability: prob },
      });
    }

    // List markets
    let markets = db.markets.getAll();

    if (type && type !== "all") {
      markets = markets.filter(m => m.type === type);
    }
    if (provider && provider !== "all") {
      markets = markets.filter(m => m.provider === provider || m.providers?.includes(provider));
    }
    if (status && status !== "all") {
      markets = markets.filter(m => m.status === status);
    }

    // Enrich with probability
    const enriched = markets.map(m => ({
      ...m,
      probability: probYes({ qYes: m.qYes, qNo: m.qNo, b: m.b }),
    }));

    // Sort
    if (sort === "volume") enriched.sort((a, b) => b.volume - a.volume);
    else if (sort === "probability") enriched.sort((a, b) => b.probability - a.probability);
    else if (sort === "closing") enriched.sort((a, b) => new Date(a.resolutionDate).getTime() - new Date(b.resolutionDate).getTime());
    else if (sort === "newest") enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50") || 50));
    const total = enriched.length;
    const paginated = enriched.slice((page - 1) * limit, page * limit);

    return NextResponse.json({ ok: true, data: paginated, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: unknown) {
    return NextResponse.json({ ok: false, error: "Failed to fetch markets" }, { status: 500 });
  }
}
