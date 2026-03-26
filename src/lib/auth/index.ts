/**
 * Auth System — Supabase Edition
 * 
 * Replaces the old bcrypt/JWT/cookie auth with Supabase Auth.
 * 
 * IMPORTANT: This module maintains the same exported function signatures
 * (getSession, getCurrentUser, requireAuth, requireAdmin) so that all
 * API routes and layouts continue to work without changes.
 * 
 * Flow:
 * 1. User signs in via Supabase (email/password, OAuth, magic link)
 * 2. Supabase sets session cookies automatically via @supabase/ssr
 * 3. Server-side code calls getSession() → Supabase verifies the token
 * 4. We look up the user in our DB by Supabase UID
 * 5. Role is determined by email match (admin) or DB record (pro/free)
 */

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getRoleForEmail, isAdmin, type Role } from "./roles";
import type { User, UserPublic } from "@/types";

// Re-export Role type and helpers for backward compatibility
export { type Role, isAdmin, getRoleForEmail } from "./roles";

// --- Session types ---

interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
}

/**
 * Get the current authenticated user's session from Supabase.
 * 
 * This calls supabase.auth.getUser() which validates the token with
 * the Supabase auth server (not just local JWT decode).
 * 
 * Returns null if not authenticated.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const supabase = await createClient();
    // If Supabase isn't configured, no session is possible
    if (!supabase) return null;

    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

    if (error || !supabaseUser) return null;

    // Look up user in our DB by Supabase UID
    const dbUser = db.users.getById(supabaseUser.id);

    if (dbUser) {
      // User exists in our DB — return their info
      return {
        userId: dbUser.id,
        email: dbUser.email,
        role: dbUser.role as Role,
      };
    }

    // User authenticated with Supabase but doesn't have a DB record yet.
    // This happens on first login — create their record now.
    const email = supabaseUser.email || "";
    const name = supabaseUser.user_metadata?.full_name
      || supabaseUser.user_metadata?.name
      || email.split("@")[0]
      || "User";
    const role = getRoleForEmail(email);

    const newUser = ensureUserInDB(supabaseUser.id, email, name, role);
    return {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role as Role,
    };
  } catch {
    return null;
  }
}

/**
 * Get the full public user profile for the current session.
 */
export async function getCurrentUser(): Promise<UserPublic | null> {
  const session = await getSession();
  if (!session) return null;

  const user = db.users.getById(session.userId);
  if (!user) return null;

  return toPublicUser(user);
}

/**
 * Require authentication — throws "Unauthorized" if no valid session.
 */
export async function requireAuth(): Promise<UserPublic> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/**
 * Require a minimum role level — throws "Forbidden" if insufficient.
 */
export async function requireRole(role: Role): Promise<UserPublic> {
  const user = await requireAuth();
  const hierarchy: Record<Role, number> = { free: 0, pro: 1, admin: 2 };
  if (hierarchy[user.role as Role] < hierarchy[role]) {
    throw new Error("Forbidden");
  }
  return user;
}

/**
 * Require admin role — convenience wrapper.
 */
export async function requireAdmin(): Promise<UserPublic> {
  return requireRole("admin");
}

/**
 * Ensure a user record exists in our database.
 * Called on first sign-in when Supabase knows the user but our DB doesn't.
 * 
 * Uses the Supabase UID as the primary key so all our existing
 * foreign keys (trades, positions, etc.) link directly to it.
 */
function ensureUserInDB(
  supabaseUid: string,
  email: string,
  name: string,
  role: Role
): User {
  // Check if already exists (race condition guard)
  const existing = db.users.getById(supabaseUid);
  if (existing) return existing;

  const now = new Date().toISOString();
  const user: User = {
    id: supabaseUid, // Use Supabase UID as our user ID
    email: email.toLowerCase().trim(),
    passwordHash: "", // Not used — Supabase handles passwords
    name: name.trim(),
    role,
    plan: role === "admin" ? "pro" : "free",
    balance: 10000, // Starting simulated balance
    createdAt: now,
    updatedAt: now,
  };

  return db.users.insert(user);
}

// --- Validation (still useful for API input checking) ---

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

// --- Helpers ---

export function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.plan,
    balance: user.balance,
  };
}
