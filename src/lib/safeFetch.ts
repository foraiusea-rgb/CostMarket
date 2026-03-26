/**
 * Safe fetch wrapper for client components.
 * Handles network errors, non-JSON responses, and API errors gracefully.
 * Returns { ok, data, error } — never throws.
 */

interface SafeResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

export async function safeFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<SafeResult<T>> {
  try {
    const res = await fetch(url, options);
    if (!res.ok && res.status === 429) {
      return { ok: false, data: null, error: "Rate limited. Please wait a moment." };
    }
    const json = await res.json();
    if (json.ok) {
      return { ok: true, data: json.data as T, error: null };
    }
    return { ok: false, data: null, error: json.error || `Request failed (${res.status})` };
  } catch {
    return { ok: false, data: null, error: "Network error. Please check your connection." };
  }
}

/** POST JSON shorthand */
export async function safePost<T = unknown>(
  url: string,
  body: Record<string, unknown>
): Promise<SafeResult<T>> {
  return safeFetch<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
