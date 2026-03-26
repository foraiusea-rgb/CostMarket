import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seed } from "@/lib/db/seed";
import { getSession } from "@/lib/auth";
import type { Alert } from "@/types";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/ratelimit";

seed();

function uid(): string {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
    const alerts = db.alerts.getByUser(session.userId);
    return NextResponse.json({ ok: true, data: alerts });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      const { marketId, type, threshold } = body;
      if (!marketId || typeof marketId !== "string") {
        return NextResponse.json({ ok: false, error: "Market ID is required" }, { status: 400 });
      }
      const market = db.markets.getById(marketId);
      if (!market) {
        return NextResponse.json({ ok: false, error: "Market not found" }, { status: 404 });
      }
      if (threshold !== undefined && (typeof threshold !== "number" || !Number.isFinite(threshold))) {
        return NextResponse.json({ ok: false, error: "Invalid threshold" }, { status: 400 });
      }

      const alert: Alert = {
        id: uid(),
        userId: session.userId,
        marketId,
        type: type || "price_cross",
        condition: `Price crosses ${threshold ?? 50}%`,
        threshold: threshold ? threshold / 100 : undefined,
        triggered: false,
        createdAt: new Date().toISOString(),
      };
      db.alerts.insert(alert);
      return NextResponse.json({ ok: true, data: alert });
    }

    if (action === "delete") {
      const { alertId } = body;
      if (!alertId || typeof alertId !== "string") {
        return NextResponse.json({ ok: false, error: "Alert ID is required" }, { status: 400 });
      }
      // Verify the alert belongs to this user before deleting
      const userAlerts = db.alerts.getByUser(session.userId);
      const ownedAlert = userAlerts.find(a => a.id === alertId);
      if (!ownedAlert) {
        return NextResponse.json({ ok: false, error: "Alert not found" }, { status: 404 });
      }
      db.alerts.delete(alertId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "Alert error" }, { status: 500 });
  }
}
