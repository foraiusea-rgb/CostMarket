/**
 * Supabase Browser Client
 * 
 * Used in client components ("use client") for:
 * - Auth state listeners (onAuthStateChange)
 * - OAuth sign-in redirects
 * - Client-side data fetches
 * 
 * This client runs in the browser and uses the anon key.
 * It automatically handles session cookies via @supabase/ssr.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
