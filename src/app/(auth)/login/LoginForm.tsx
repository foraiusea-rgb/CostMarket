"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/**
 * Login Form Component
 * 
 * Supports:
 * 1. Email/password sign-in
 * 2. Magic link (passwordless email)
 * 
 * Separated from page.tsx so it can be wrapped in <Suspense>
 * (required by Next.js 14 because this component uses useSearchParams).
 */
export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") ? "Sign-in failed. Please try again." : "");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError("Invalid email or password.");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Please check your email and confirm your account first.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      router.push("/markets");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Please enter your email."); return; }
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      setMagicLinkSent(true);
      setLoading(false);
    } catch {
      setError("Failed to send magic link. Please try again.");
      setLoading(false);
    }
  };

  // Magic link sent confirmation
  if (magicLinkSent) {
    return (
      <Card className="p-6 text-center">
        <div className="text-2xl mb-3">✉️</div>
        <h1 className="font-display text-xl font-bold mb-2">Check Your Email</h1>
        <p className="text-sm text-slate-400 mb-4">
          We sent a sign-in link to <span className="text-slate-200 font-medium">{email}</span>
        </p>
        <p className="text-xs text-slate-500 mb-4">Click the link in the email to sign in. It expires in 1 hour.</p>
        <button onClick={() => setMagicLinkSent(false)} className="text-xs text-blue-400 hover:underline">
          Try a different method
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h1 className="font-display text-xl font-bold mb-1 text-center">Sign In</h1>
      <p className="text-xs text-slate-500 text-center mb-5">Access your portfolio and start trading</p>

      {error && (
        <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400" role="alert">
          {error}
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-1 mb-4 p-0.5 rounded-md bg-white/[0.03] border border-white/[0.06]">
        <button
          onClick={() => setMode("password")}
          className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${
            mode === "password" ? "bg-white/[0.08] text-slate-200" : "text-slate-500"
          }`}
        >
          Password
        </button>
        <button
          onClick={() => setMode("magic")}
          className={`flex-1 rounded py-1.5 text-xs font-medium transition-colors ${
            mode === "magic" ? "bg-white/[0.08] text-slate-200" : "text-slate-500"
          }`}
        >
          Magic Link
        </button>
      </div>

      {mode === "password" ? (
        <form onSubmit={handlePasswordLogin} className="space-y-3">
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
          <Button onClick={handlePasswordLogin} disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign In"}
          </Button>
          <div className="text-center">
            <Link href="/reset-password" className="text-[10px] text-slate-500 hover:text-blue-400 transition-colors">
              Forgot password?
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-3">
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" />
          <Button onClick={handleMagicLink} disabled={loading} className="w-full">
            {loading ? "Sending…" : "Send Magic Link"}
          </Button>
          <p className="text-[10px] text-slate-500 text-center">No password needed — we'll email you a sign-in link.</p>
        </form>
      )}

      <div className="mt-5 text-center text-xs text-slate-500">
        No account? <Link href="/signup" className="text-blue-400 hover:underline">Sign up</Link>
      </div>
    </Card>
  );
}
