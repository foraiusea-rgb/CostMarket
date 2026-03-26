/**
 * Auth Callback Route
 * 
 * After a user signs in via OAuth (Google, Apple, GitHub) or clicks a
 * magic link / password reset link, Supabase redirects them here with
 * an authorization code in the URL.
 * 
 * This route exchanges that code for a session (access + refresh tokens)
 * and stores them in cookies, then redirects to the app.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // "next" param lets us redirect to a specific page after auth (e.g., /update-password)
  const next = searchParams.get("next") ?? "/markets";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful auth — redirect to the intended page
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
