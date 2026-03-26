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
  // If Supabase isn't configured yet, just pass the request through.
  // This lets the app load without Supabase during initial setup.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    await supabase.auth.getUser();
  } catch {
    // If Supabase call fails (network, misconfigured), don't block the request
  }

  return supabaseResponse;
}
