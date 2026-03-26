import { db } from "@/lib/db";
import { seed } from "@/lib/db/seed";
import { probYes } from "@/lib/engine/lmsr";
import { detectAllInsights } from "@/lib/engine/arbitrage";
import { notFound } from "next/navigation";
import MarketDetailClient from "./MarketDetailClient";

export const dynamic = "force-dynamic";

export default function MarketDetailPage({ params }: { params: { id: string } }) {
  seed();

  const market = db.markets.getById(params.id);
  if (!market) notFound();

  const probability = probYes({ qYes: market.qYes, qNo: market.qNo, b: market.b });
  const priceHistory = db.pricePoints.getByMarket(params.id).map(p => ({
    timestamp: p.timestamp,
    price: p.price,
  }));

  const allMarkets = db.markets.getAll();
  const insights = detectAllInsights(allMarkets).filter(i => i.linkedMarketIds.includes(params.id));

  const related = allMarkets
    .filter(m => m.id !== params.id && (m.provider === market.provider || m.type === market.type))
    .slice(0, 4)
    .map(m => ({
      ...m,
      probability: probYes({ qYes: m.qYes, qNo: m.qNo, b: m.b }),
    }));

  return (
    <MarketDetailClient
      market={{ ...market, probability }}
      priceHistory={priceHistory}
      insights={insights}
      related={related}
    />
  );
}
