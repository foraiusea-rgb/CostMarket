/**
 * Role System
 * 
 * Simple role model:
 * - "admin" — single admin, identified by ADMIN_EMAIL env var
 * - "pro" — paid users (future Stripe integration)
 * - "free" — default for all new signups
 * 
 * Admin is determined by email match, not a database flag.
 * This means the admin doesn't need special setup — just sign up
 * with the email in ADMIN_EMAIL and you're admin.
 */

export type Role = "admin" | "pro" | "free";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim() || "";

/**
 * Determine a user's role from their email.
 * Called when creating user records and when checking permissions.
 */
export function getRoleForEmail(email: string): Role {
  if (ADMIN_EMAIL && email.toLowerCase().trim() === ADMIN_EMAIL) {
    return "admin";
  }
  return "free";
}

/**
 * Check if an email belongs to the admin.
 */
export function isAdmin(email: string | undefined | null): boolean {
  if (!email || !ADMIN_EMAIL) return false;
  return email.toLowerCase().trim() === ADMIN_EMAIL;
}

/**
 * Check if a role has at least the given minimum role level.
 * admin > pro > free
 */
export function hasMinRole(userRole: Role, minRole: Role): boolean {
  const hierarchy: Record<Role, number> = { free: 0, pro: 1, admin: 2 };
  return hierarchy[userRole] >= hierarchy[minRole];
}
