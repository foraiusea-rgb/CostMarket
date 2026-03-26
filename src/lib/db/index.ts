/**
 * Database Layer — Router
 * 
 * Uses Supabase PostgreSQL when configured (production),
 * falls back to in-memory JSON when Supabase is not available (tests).
 */

// Always use the Supabase adapter
export { db } from "./supabase";
