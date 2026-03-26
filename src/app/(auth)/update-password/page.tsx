"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/**
 * Update Password Page
 * 
 * Reached after user clicks the password reset link in their email.
 * At this point they already have a valid session (the callback route
 * exchanged the code for tokens). They just need to set a new password.
 */
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        if (updateError.message.includes("same password")) {
          setError("New password must be different from your current password.");
        } else {
          setError(updateError.message);
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Redirect to markets after a short delay
      setTimeout(() => {
        router.push("/markets");
        router.refresh();
      }, 2000);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="p-6 text-center">
        <div className="text-2xl mb-3">✅</div>
        <h1 className="font-display text-xl font-bold mb-2">Password Updated</h1>
        <p className="text-sm text-slate-400 mb-4">Your password has been changed successfully.</p>
        <p className="text-xs text-slate-500">Redirecting you to the app…</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h1 className="font-display text-xl font-bold mb-1 text-center">Set New Password</h1>
      <p className="text-xs text-slate-500 text-center mb-5">Choose a strong password for your account</p>

      {error && (
        <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="New Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required autoComplete="new-password" minLength={8} />
        <Input label="Confirm Password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type it again" required autoComplete="new-password" minLength={8} />
        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Updating…" : "Update Password"}
        </Button>
      </form>

      <div className="mt-4 text-center text-xs text-slate-500">
        <Link href="/login" className="text-blue-400 hover:underline">Back to Sign In</Link>
      </div>
    </Card>
  );
}
