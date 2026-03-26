import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seed } from "@/lib/db/seed";
import { requireAdmin } from "@/lib/auth";
import { detectAllInsights } from "@/lib/engine/arbitrage";
import type { AuditLog } from "@/types";

seed();

function uid(): string {
  return `adm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function auditLog(userId: string, action: string, resource: string, resourceId: string, details: string) {
  const log: AuditLog = {
    id: uid(),
    userId,
    action,
    resource,
    resourceId,
    details,
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.insert(log);
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { action } = body;

    // --- Resolve market ---
    if (action === "resolve_market") {
      const { marketId, outcome, value, notes } = body;
      const VALID_OUTCOMES = ["yes", "no", "void"];
      if (!VALID_OUTCOMES.includes(outcome)) {
        return NextResponse.json({ ok: false, error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(", ")}` }, { status: 400 });
      }
      if (!marketId || typeof marketId !== "string") {
        return NextResponse.json({ ok: false, error: "Market ID is required" }, { status: 400 });
      }
      const market = db.markets.getById(marketId);
      if (!market) return NextResponse.json({ ok: false, error: "Market not found" }, { status: 404 });
      if (market.status === "resolved") {
        return NextResponse.json({ ok: false, error: "Market is already resolved" }, { status: 400 });
      }

      db.markets.update(marketId, {
        status: "resolved",
        resolutionStatus: "resolved",
        resolvedOutcome: outcome,
        resolutionValue: value,
        reviewerId: admin.id,
        resolvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Settle positions
      const allPositions = db.positions.getAll().filter(p => p.marketId === marketId);
      for (const pos of allPositions) {
        const won = (outcome === "yes" && pos.direction === "yes") || (outcome === "no" && pos.direction === "no");
        const payout = won ? pos.shares : 0;
        const pnl = payout - pos.avgPrice * pos.shares;

        db.positions.update(pos.id, { realizedPnl: pnl, updatedAt: new Date().toISOString() });

        if (payout > 0) {
          const user = db.users.getById(pos.userId);
          if (user) {
            db.users.update(user.id, {
              balance: user.balance + payout,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      auditLog(admin.id, "resolve_market", "market", marketId, `Resolved as ${outcome}. Value: ${value}. Notes: ${notes || "none"}`);

      // Recompute insights
      const allMarkets = db.markets.getAll();
      db.insights.replaceAll(detectAllInsights(allMarkets));

      return NextResponse.json({ ok: true });
    }

    // --- Update market status ---
    if (action === "update_market_status") {
      const { marketId, status } = body;
      const VALID_STATUSES = ["open", "closed", "resolved", "disputed"];
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ ok: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
      }
      if (!marketId || !db.markets.getById(marketId)) {
        return NextResponse.json({ ok: false, error: "Market not found" }, { status: 404 });
      }
      db.markets.update(marketId, { status, updatedAt: new Date().toISOString() });
      auditLog(admin.id, "update_status", "market", marketId, `Status → ${status}`);
      return NextResponse.json({ ok: true });
    }

    // --- Update feature flag ---
    if (action === "update_flag") {
      const { key, enabled } = body;
      if (typeof key !== "string" || typeof enabled !== "boolean") {
        return NextResponse.json({ ok: false, error: "Invalid flag parameters" }, { status: 400 });
      }
      const flag = db.featureFlags.getByKey(key);
      if (!flag) {
        return NextResponse.json({ ok: false, error: "Flag not found" }, { status: 404 });
      }
      db.featureFlags.update(flag.id, { enabled, updatedAt: new Date().toISOString() });
      auditLog(admin.id, "update_flag", "feature_flag", flag.id, `${key} → ${enabled}`);
      return NextResponse.json({ ok: true });
    }

    // --- Update user role ---
    if (action === "update_user_role") {
      const { userId, role } = body;
      const VALID_ROLES = ["free", "pro", "admin"];
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json({ ok: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
      }
      if (!userId || !db.users.getById(userId)) {
        return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
      }
      db.users.update(userId, { role, updatedAt: new Date().toISOString() });
      auditLog(admin.id, "update_role", "user", userId, `Role → ${role}`);
      return NextResponse.json({ ok: true });
    }

    // --- Reset database ---
    if (action === "reset") {
      // Preserve admin identity before wiping — db.reset() destroys user records
      const adminId = admin.id;
      const adminEmail = admin.email;
      db.reset();
      seed();
      auditLog(adminId, "reset_database", "system", "all", `Full database reset by ${adminEmail}`);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Admin error";
    const status = message.includes("Forbidden") || message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get("resource");

    if (resource === "users") {
      const users = db.users.getAll().map(u => ({
        id: u.id, email: u.email, name: u.name, role: u.role, plan: u.plan,
        balance: u.balance, createdAt: u.createdAt,
      }));
      return NextResponse.json({ ok: true, data: users });
    }

    if (resource === "markets") {
      const markets = db.markets.getAll();
      return NextResponse.json({ ok: true, data: markets });
    }

    if (resource === "resolutions") {
      const markets = db.markets.getAll().filter(m => m.status === "open" || m.resolutionStatus === "under_review");
      return NextResponse.json({ ok: true, data: markets });
    }

    if (resource === "flags") {
      const flags = db.featureFlags.getAll();
      return NextResponse.json({ ok: true, data: flags });
    }

    if (resource === "audit") {
      const logs = db.auditLogs.getAll();
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return NextResponse.json({ ok: true, data: logs.slice(0, 100) });
    }

    if (resource === "sources") {
      const snapshots = db.pricingSnapshots.getAll();
      const providers = db.providers.getAll();
      return NextResponse.json({ ok: true, data: { snapshots, providers } });
    }

    if (resource === "overview") {
      return NextResponse.json({
        ok: true,
        data: {
          totalMarkets: db.markets.getAll().length,
          openMarkets: db.markets.getAll().filter(m => m.status === "open").length,
          totalUsers: db.users.getAll().length,
          totalTrades: db.trades.getAll().length,
          totalVolume: db.markets.getAll().reduce((s, m) => s + m.volume, 0),
          activeInsights: db.insights.getAll().filter(i => i.status === "active").length,
        },
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid resource" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Admin error";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
}
