import { NextRequest, NextResponse } from "next/server";
import {
  createUser, authenticateUser, createSession,
  destroySession, getCurrentUser, toPublicUser,
} from "@/lib/auth";
import { seed } from "@/lib/db/seed";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/ratelimit";

// Ensure DB is seeded
seed();

export async function POST(request: NextRequest) {
  // Rate limit auth attempts — 5 per minute per IP
  const ip = getClientIp(request);
  const rl = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "signup") {
      const { email, password, name } = body;
      if (!email || !password || !name) {
        return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
      }
      if (password.length < 8) {
        return NextResponse.json({ ok: false, error: "Password must be at least 8 characters" }, { status: 400 });
      }
      const user = await createUser(email, password, name);
      await createSession(user);
      return NextResponse.json({ ok: true, data: toPublicUser(user) });
    }

    if (action === "login") {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
      }
      const user = await authenticateUser(email, password);
      await createSession(user);
      return NextResponse.json({ ok: true, data: toPublicUser(user) });
    }

    if (action === "logout") {
      await destroySession();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    const status = message.includes("Unauthorized") || message.includes("Invalid") ? 401 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function GET() {
  seed();
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: true, data: null });
    }
    return NextResponse.json({ ok: true, data: user });
  } catch {
    return NextResponse.json({ ok: true, data: null });
  }
}
