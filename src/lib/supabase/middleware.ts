/**
 * Supabase Middleware Client
 * 
 * Used exclusively in Next.js middleware to:
 * - Refresh expired Supabase auth tokens before they reach your app
 * - Keep the session alive across page navigations
 * 
 * Without this, users would get logged out when their JWT expires
 * (default 1 hour) even if they have a valid refresh token.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Start with a basic response that passes through the request
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update cookies on the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Update cookies on the response (sent back to the browser)
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This is the key call — it refreshes the session if the access token expired.
  // IMPORTANT: Do NOT use getSession() here. getUser() actually validates the token
  // with the Supabase auth server, while getSession() only reads the local JWT.
  await supabase.auth.getUser();

  return supabaseResponse;
}
