/**
 * Auth System
 * 
 * JWT-based authentication with bcrypt password hashing.
 * Production would use a proper auth library (next-auth, lucia, etc.)
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import type { User, UserPublic, Role } from "@/types";

// cookies() is only available inside Next.js request context.
// Dynamic import so the module can be loaded in tests without crashing.
async function getCookieStore() {
  const { cookies } = await import("next/headers");
  return await cookies();
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const COOKIE_NAME = process.env.COOKIE_NAME || "aicm_session";
const SALT_ROUNDS = 10;

// --- Password ---

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// --- JWT ---

interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// --- Session ---

export async function createSession(user: User): Promise<string> {
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const cookieStore = await getCookieStore();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return token;
}

/**
 * Get session from JWT cookie. 
 * IMPORTANT: Only returns userId for identification.
 * Always use getCurrentUser() or requireAuth() for role/permission checks
 * as the JWT may contain stale role data.
 */
export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await getCookieStore();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  
  // Revalidate that the user still exists in DB
  const user = db.users.getById(payload.userId);
  if (!user) return null;
  
  // Return fresh role from DB, not stale JWT
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}

export async function getCurrentUser(): Promise<UserPublic | null> {
  const session = await getSession();
  if (!session) return null;

  const user = db.users.getById(session.userId);
  if (!user) return null;

  return toPublicUser(user);
}

export async function requireAuth(): Promise<UserPublic> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(role: Role): Promise<UserPublic> {
  const user = await requireAuth();
  const roleHierarchy: Record<Role, number> = { free: 0, pro: 1, admin: 2 };
  if (roleHierarchy[user.role] < roleHierarchy[role]) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function requireAdmin(): Promise<UserPublic> {
  return requireRole("admin");
}

export async function destroySession(): Promise<void> {
  const cookieStore = await getCookieStore();
  cookieStore.delete(COOKIE_NAME);
}

// --- Validation ---

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

// --- User creation ---

export function generateId(): string {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  role: Role = "free"
): Promise<User> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!validateEmail(normalizedEmail)) throw new Error("Invalid email format");
  if (name.trim().length === 0) throw new Error("Name is required");
  if (name.trim().length > 100) throw new Error("Name too long");

  const existing = db.users.getByEmail(normalizedEmail);
  if (existing) throw new Error("Email already registered");

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  const user: User = {
    id: generateId(),
    email: email.toLowerCase().trim(),
    passwordHash,
    name: name.trim(),
    role,
    plan: role === "admin" ? "pro" : "free",
    balance: 10000, // Starting simulated balance
    createdAt: now,
    updatedAt: now,
  };

  return db.users.insert(user);
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<User> {
  const user = db.users.getByEmail(email.toLowerCase().trim());
  if (!user) throw new Error("Invalid email or password");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new Error("Invalid email or password");

  return user;
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
