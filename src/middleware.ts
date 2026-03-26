/**
 * Next.js Middleware
 * 
 * Runs on every request before it reaches your pages/API routes.
 * Its only job: refresh the Supabase auth session cookie.
 * 
 * Without this, the access token (1-hour TTL) would expire and
 * the user would appear logged out even with a valid refresh token.
 */

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Skip Supabase session refresh if env vars aren't configured yet
  // This prevents the app from crashing during initial deployment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

/**
 * Match all routes EXCEPT static files and images.
 * This ensures the session is refreshed on every page navigation and API call.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
