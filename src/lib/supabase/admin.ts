/**
 * Supabase Admin Client
 * 
 * Uses the service_role key which BYPASSES Row Level Security.
 * Only use this for:
 * - Admin operations (managing users, setting roles)
 * - Background jobs that need full database access
 * - Operations where the calling user doesn't have RLS permissions
 * 
 * NEVER expose this client or the service_role key to the browser.
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY — admin client requires service role key");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
