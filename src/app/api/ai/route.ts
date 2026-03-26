/**
 * AI API Route
 * 
 * Single endpoint for all AI-powered features.
 * Actions: analyze, chat, digest, advise, propose
 * 
 * All actions inject live market data into the prompt so the AI
 * is always grounded in current platform state.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seed } from "@/lib/db/seed";
import { probYes } from "@/lib/engine/lmsr";
import { detectAllInsights } from "@/lib/engine/arbitrage";
import { getSession } from "@/lib/auth";
import { chatCompletion, chatCompletionStream, type ChatMessage } from "@/lib/ai/openrouter";
import {
  marketAnalysisPrompt,
  chatSystemPrompt,
  newsDigestPrompt,
  builderAdvisorPrompt,
  marketProposalPrompt,
} from "@/lib/ai/prompts";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

// Extend serverless function timeout for AI requests (free Vercel plan: max 60s)
export const maxDuration = 60;


/** Build enriched market context for prompts */
function getMarketContext() {
  const markets = db.markets.getAll().map(m => ({
    ...m,
    probability: probYes({ qYes: m.qYes, qNo: m.qNo, b: m.b }),
  }));
  const insights = detectAllInsights(db.markets.getAll());
  return { markets, insights };
}

export async function POST(request: NextRequest) {
  await seed();
  // Rate limit: 20 AI requests per minute per IP
  const ip = getClientIp(request);
  const rl = checkRateLimit(`ai:${ip}`, { limit: 20, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "AI rate limit reached. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;
    const ctx = getMarketContext();

    // ── Market Analysis ──────────────────────────────────────
    if (action === "analyze") {
      const { marketId } = body;
      if (!marketId) return NextResponse.json({ ok: false, error: "Market ID required" }, { status: 400 });

      const market = ctx.markets.find(m => m.id === marketId);
      if (!market) return NextResponse.json({ ok: false, error: "Market not found" }, { status: 404 });

      const relatedInsights = ctx.insights.filter(i => i.linkedMarketIds.includes(marketId));
      const prompt = marketAnalysisPrompt(market, relatedInsights, ctx);

      const analysis = await chatCompletion([
        { role: "system", content: prompt },
        { role: "user", content: `Analyze the market: "${market.title}"` },
      ], { temperature: 0.5, maxTokens: 800 });

      return NextResponse.json({ ok: true, data: { analysis } });
    }

    // ── Chat ─────────────────────────────────────────────────
    if (action === "chat") {
      const { messages } = body as { messages: ChatMessage[] };
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({ ok: false, error: "Messages array required" }, { status: 400 });
      }

      const systemPrompt = chatSystemPrompt(ctx);
      const fullMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...messages.slice(-20), // Keep last 20 messages to stay within context window
      ];

      // Try streaming, fall back to non-streaming for free models
      try {
        const stream = await chatCompletionStream(fullMessages, { temperature: 0.7, maxTokens: 1024 });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Transfer-Encoding": "chunked",
          },
        });
      } catch {
        // Streaming failed — fall back to non-streaming
        const text = await chatCompletion(fullMessages, { temperature: 0.7, maxTokens: 1024 });
        // Return as a plain text response so the client reader still works
        return new Response(text, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }

    // ── News Digest ──────────────────────────────────────────
    if (action === "digest") {
      const prompt = newsDigestPrompt(ctx);
      const messages = [
        { role: "system" as const, content: prompt },
        { role: "user" as const, content: "Generate today's AI pricing market digest." },
      ];

      // Try streaming first, fall back to non-streaming
      try {
        const stream = await chatCompletionStream(messages, { temperature: 0.6, maxTokens: 1200 });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      } catch {
        // Streaming failed (common with free models) — fall back to non-streaming
        const text = await chatCompletion(messages, { temperature: 0.6, maxTokens: 1200 });
        return NextResponse.json({ ok: true, data: { digest: text } });
      }
    }

    // ── Builder Advisor ──────────────────────────────────────
    if (action === "advise") {
      const { builderResult, formInputs } = body;
      if (!builderResult || !formInputs) {
        return NextResponse.json({ ok: false, error: "Builder result and form inputs required" }, { status: 400 });
      }

      const prompt = builderAdvisorPrompt(builderResult, formInputs, ctx);

      const advice = await chatCompletion([
        { role: "system", content: prompt },
        { role: "user", content: "Advise me on my AI infrastructure cost strategy." },
      ], { temperature: 0.5, maxTokens: 800 });

      return NextResponse.json({ ok: true, data: { advice } });
    }

    // ── Market Proposals (AI-generated) ──────────────────────
    if (action === "propose") {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
      }

      const prompt = marketProposalPrompt(ctx);
      const response = await chatCompletion([
        { role: "system", content: prompt },
        { role: "user", content: "Suggest 5 new prediction markets." },
      ], { temperature: 0.8, maxTokens: 2000 });

      // Parse the JSON response
      try {
        // Strip any markdown code fences the model might add
        const cleaned = response.replace(/```json\n?|```\n?/g, "").trim();
        const proposals = JSON.parse(cleaned);
        return NextResponse.json({ ok: true, data: { proposals } });
      } catch {
        // If JSON parsing fails, return the raw text
        return NextResponse.json({ ok: true, data: { proposals: [], raw: response } });
      }
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI request failed";
    console.error("[ai]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
