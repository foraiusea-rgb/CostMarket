/**
 * Market Creation API
 * 
 * POST actions:
 * - "propose" — User submits a market proposal (stored as status: "proposed")
 * - "approve" — Admin approves a proposal → becomes an open market
 * - "reject"  — Admin rejects a proposal
 * - "create"  — Admin creates a market directly (no approval needed)
 * - "ai_generate" — AI generates proposals, admin reviews
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seed } from "@/lib/db/seed";
import { getSession, requireAdmin } from "@/lib/auth";
import { createState, probYes } from "@/lib/engine/lmsr";
import { detectAllInsights } from "@/lib/engine/arbitrage";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import type { Market } from "@/types";

seed();

function uid(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createMarketFromInput(input: {
  title: string;
  description: string;
  type: string;
  provider: string;
  threshold?: number;
  metric?: string;
  resolutionDate: string;
  resolutionCriteria: string;
  resolutionSourceName?: string;
  resolutionSourceUrl?: string;
  normalizationNotes?: string;
  modelClass?: string;
  providers?: string[];
  initialProbability?: number;
  status?: string;
  proposedBy?: string;
}): Market {
  const initProb = input.initialProbability ?? 0.5;
  const state = createState(initProb);
  const now = new Date().toISOString();

  return {
    id: uid(),
    title: input.title,
    description: input.description,
    type: input.type as Market["type"],
    status: (input.status || "open") as Market["status"],
    provider: input.provider,
    providers: input.providers || [],
    modelClass: input.modelClass || "frontier",
    threshold: input.threshold,
    metric: input.metric,
    qYes: state.qYes,
    qNo: state.qNo,
    b: state.b,
    volume: 0,
    tradeCount: 0,
    resolutionDate: input.resolutionDate,
    resolutionCriteria: input.resolutionCriteria,
    resolutionSourceType: "official_pricing_page",
    resolutionSourceName: input.resolutionSourceName || "",
    resolutionSourceUrl: input.resolutionSourceUrl || "",
    normalizationMethod: "standard_on_demand",
    normalizationNotes: input.normalizationNotes || "",
    resolutionStatus: "pending",
    createdAt: now,
    updatedAt: now,
    // Store who proposed it in a custom field (using taskType as scratch)
    taskType: input.proposedBy || undefined,
  } as Market;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`market-create:${ip}`, { limit: 10, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    // ── User Proposal ─────────────────────────────────────
    if (action === "propose") {
      const session = await getSession();
      if (!session) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });

      const { title, description, type, provider, threshold, metric, resolutionDate, resolutionCriteria } = body;

      // Validate required fields
      if (!title?.trim() || !description?.trim() || !type || !provider || !resolutionDate || !resolutionCriteria?.trim()) {
        return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
      }
      if (title.length > 200) {
        return NextResponse.json({ ok: false, error: "Title too long (max 200 chars)" }, { status: 400 });
      }

      const VALID_TYPES = ["api_threshold", "subscription", "relative", "task_cost"];
      const VALID_PROVIDERS = ["openai", "anthropic", "google"];
      if (!VALID_TYPES.includes(type)) return NextResponse.json({ ok: false, error: "Invalid market type" }, { status: 400 });
      if (!VALID_PROVIDERS.includes(provider)) return NextResponse.json({ ok: false, error: "Invalid provider" }, { status: 400 });

      const market = createMarketFromInput({
        title: title.trim(),
        description: description.trim(),
        type,
        provider,
        threshold,
        metric,
        resolutionDate,
        resolutionCriteria: resolutionCriteria.trim(),
        status: "proposed",
        proposedBy: session.userId,
        initialProbability: 0.5,
      });

      db.markets.insert(market);
      return NextResponse.json({ ok: true, data: market });
    }

    // ── Admin: Approve Proposal ───────────────────────────
    if (action === "approve") {
      await requireAdmin();
      const { marketId, initialProbability } = body;
      if (!marketId) return NextResponse.json({ ok: false, error: "Market ID required" }, { status: 400 });

      const market = db.markets.getById(marketId);
      if (!market) return NextResponse.json({ ok: false, error: "Market not found" }, { status: 404 });

      // If admin wants to set a different initial probability
      if (initialProbability && initialProbability > 0 && initialProbability < 1) {
        const state = createState(initialProbability);
        db.markets.update(marketId, {
          status: "open",
          qYes: state.qYes,
          qNo: state.qNo,
          updatedAt: new Date().toISOString(),
        });
      } else {
        db.markets.update(marketId, { status: "open", updatedAt: new Date().toISOString() });
      }

      // Recompute insights with the new market
      db.insights.replaceAll(detectAllInsights(db.markets.getAll()));

      return NextResponse.json({ ok: true });
    }

    // ── Admin: Reject Proposal ────────────────────────────
    if (action === "reject") {
      await requireAdmin();
      const { marketId } = body;
      if (!marketId) return NextResponse.json({ ok: false, error: "Market ID required" }, { status: 400 });

      db.markets.update(marketId, { status: "disputed", updatedAt: new Date().toISOString() });
      return NextResponse.json({ ok: true });
    }

    // ── Admin: Direct Create ──────────────────────────────
    if (action === "create") {
      const admin = await requireAdmin();
      const market = createMarketFromInput({ ...body, status: "open", proposedBy: admin.id });
      db.markets.insert(market);

      // Recompute insights
      db.insights.replaceAll(detectAllInsights(db.markets.getAll()));

      return NextResponse.json({ ok: true, data: market });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create market";
    const status = message.includes("Forbidden") || message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

/** GET: Fetch proposed markets (for admin review) */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "proposed";

    const markets = db.markets.getAll()
      .filter(m => m.status === status)
      .map(m => ({
        ...m,
        probability: probYes({ qYes: m.qYes, qNo: m.qNo, b: m.b }),
      }));

    return NextResponse.json({ ok: true, data: markets });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch proposals" }, { status: 500 });
  }
}
