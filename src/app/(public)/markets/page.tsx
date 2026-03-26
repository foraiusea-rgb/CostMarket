import { db } from "@/lib/db";
import { seed } from "@/lib/db/seed";
import { probYes } from "@/lib/engine/lmsr";
import { detectAllInsights } from "@/lib/engine/arbitrage";
import MarketsClient from "./MarketsClient";

export const dynamic = "force-dynamic";

export default async function MarketsPage() {
  await seed();
  
  const markets = db.markets.getAll().map(m => ({
    ...m,
    probability: probYes({ qYes: m.qYes, qNo: m.qNo, b: m.b }),
    recentHistory: db.pricePoints.getByMarket(m.id).slice(-30).map(p => ({
      timestamp: p.timestamp,
      price: p.price,
    })),
  }));

  const insights = detectAllInsights(db.markets.getAll());

  return <MarketsClient markets={markets} insights={insights} />;
}
