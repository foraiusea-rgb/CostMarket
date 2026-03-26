"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/**
 * Signup Page
 * 
 * Creates a new account via Supabase Auth.
 * After signup, Supabase sends a confirmation email.
 */
export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!name.trim()) { setError("Name is required."); return; }
    if (name.trim().length > 100) { setError("Name is too long."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Store the user's name in Supabase user metadata
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("This email is already registered. Try signing in instead.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation required — show confirmation message
        setConfirmSent(true);
      } else if (data.session) {
        // No confirmation required (or auto-confirmed) — go to app
        router.push("/markets");
        router.refresh();
      }

      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // Email confirmation sent
  if (confirmSent) {
    return (
      <Card className="p-6 text-center">
        <div className="text-2xl mb-3">📧</div>
        <h1 className="font-display text-xl font-bold mb-2">Confirm Your Email</h1>
        <p className="text-sm text-slate-400 mb-4">
          We sent a confirmation link to <span className="text-slate-200 font-medium">{email}</span>
        </p>
        <p className="text-xs text-slate-500 mb-4">Click the link in the email to activate your account. Then come back and sign in.</p>
        <Link href="/login" className="text-xs text-blue-400 hover:underline">Go to Sign In</Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h1 className="font-display text-xl font-bold mb-1 text-center">Create Account</h1>
      <p className="text-xs text-slate-500 text-center mb-5">Start with $10,000 simulated balance</p>

      {error && (
        <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-3">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required autoComplete="name" />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" />
        <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required autoComplete="new-password" minLength={8} />
        <Button onClick={handleSignup} disabled={loading} className="w-full">
          {loading ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <div className="mt-5 text-center text-xs text-slate-500">
        Already have an account? <Link href="/login" className="text-blue-400 hover:underline">Sign in</Link>
      </div>

      <div className="mt-3 text-center text-[9px] text-slate-600">
        By signing up, you agree to our <Link href="/terms" className="text-slate-500 hover:underline">Terms</Link> and <Link href="/privacy" className="text-slate-500 hover:underline">Privacy Policy</Link>
      </div>
    </Card>
  );
}
