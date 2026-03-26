/**
 * Auth API Route
 * 
 * With Supabase, signup/login/logout are handled client-side via the
 * Supabase browser SDK. This route only provides:
 * 
 * GET /api/auth — returns the current user's public profile (or null)
 * 
 * Used by the Nav component and other client components that need
 * to know who's logged in.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { seed } from "@/lib/db/seed";

seed();

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ ok: true, data: user });
  } catch {
    return NextResponse.json({ ok: true, data: null });
  }
}
