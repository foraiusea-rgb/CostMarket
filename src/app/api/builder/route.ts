import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seed } from "@/lib/db/seed";
import { generateRecommendation, type BuilderInput } from "@/lib/engine/builder";
import { getSession } from "@/lib/auth";
import type { BuilderScenario } from "@/types";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/ratelimit";


function uid(): string {
  return `bs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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
    const body = await request.json();
    const { action } = body;

    if (action === "recommend") {
      const input: BuilderInput = {
        useCase: body.useCase || "chatbot",
        monthlyRequests: body.monthlyRequests || 100000,
        avgInputTokens: body.avgInputTokens,
        avgOutputTokens: body.avgOutputTokens,
        tier: body.tier || "frontier",
        preferredProvider: body.preferredProvider || "openai",
        budgetSensitivity: body.budgetSensitivity,
        qualityPreference: body.qualityPreference,
      };

      const markets = db.markets.getAll();
      const recommendation = generateRecommendation(input, markets);

      return NextResponse.json({ ok: true, data: recommendation });
    }

    if (action === "save") {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ ok: false, error: "Login required to save scenarios" }, { status: 401 });
      }

      const scenario: BuilderScenario = {
        id: uid(),
        userId: session.userId,
        name: body.name || "Untitled Scenario",
        useCase: body.useCase || "chatbot",
        monthlyRequests: body.monthlyRequests || 100000,
        avgInputTokens: body.avgInputTokens || 500,
        avgOutputTokens: body.avgOutputTokens || 300,
        tier: body.tier || "frontier",
        preferredProvider: body.preferredProvider || "openai",
        budgetSensitivity: body.budgetSensitivity || "medium",
        qualityPreference: body.qualityPreference || "balanced",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.builderScenarios.insert(scenario);
      return NextResponse.json({ ok: true, data: scenario });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Builder error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  await seed();
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: true, data: [] });
    }
    const scenarios = db.builderScenarios.getByUser(session.userId);
    return NextResponse.json({ ok: true, data: scenarios });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch scenarios" }, { status: 500 });
  }
}
