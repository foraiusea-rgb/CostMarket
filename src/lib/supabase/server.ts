/**
 * Supabase Server Client
 * 
 * Used in server components, API routes, and server actions for:
 * - Verifying the current user's session (getUser)
 * - Reading data with Row Level Security applied
 * - Any server-side operation that should respect the user's permissions
 * 
 * This client reads/writes cookies to maintain the session.
 * Must be called fresh per request (not cached globally).
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from Server Components where cookies can't be set.
            // This is safe to ignore — the middleware handles cookie refresh.
          }
        },
      },
    }
  );
}
