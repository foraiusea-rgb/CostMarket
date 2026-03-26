"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/**
 * Reset Password Page
 * 
 * User enters their email, Supabase sends a password reset link.
 * The link redirects to /auth/callback?next=/update-password
 * which exchanges the code for a session, then redirects to
 * the update-password page where they set a new password.
 */
export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Please enter your email."); return; }
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="p-6 text-center">
        <div className="text-2xl mb-3">🔑</div>
        <h1 className="font-display text-xl font-bold mb-2">Check Your Email</h1>
        <p className="text-sm text-slate-400 mb-4">
          We sent a password reset link to <span className="text-slate-200 font-medium">{email}</span>
        </p>
        <p className="text-xs text-slate-500 mb-4">Click the link in the email to set a new password. It expires in 1 hour.</p>
        <Link href="/login" className="text-xs text-blue-400 hover:underline">Back to Sign In</Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h1 className="font-display text-xl font-bold mb-1 text-center">Reset Password</h1>
      <p className="text-xs text-slate-500 text-center mb-5">Enter your email and we'll send a reset link</p>

      {error && (
        <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" />
        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Sending…" : "Send Reset Link"}
        </Button>
      </form>

      <div className="mt-4 text-center text-xs text-slate-500">
        Remember your password? <Link href="/login" className="text-blue-400 hover:underline">Sign in</Link>
      </div>
    </Card>
  );
}
