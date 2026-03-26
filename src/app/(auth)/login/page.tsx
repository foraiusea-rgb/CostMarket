"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email, password }),
    });
    const data = await res.json();

    if (data.ok) {
      router.push("/markets");
      router.refresh();
    } else {
      setError(data.error || "Login failed");
    }
    setLoading(false);
  };

  return (
    <Card className="p-6">
      <h1 className="font-display text-xl font-bold mb-1 text-center">Sign In</h1>
      <p className="text-xs text-slate-500 text-center mb-5">Access your portfolio and start trading</p>

      {error && <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" />
        <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      <div className="mt-4 text-center text-xs text-slate-500">
        No account? <Link href="/signup" className="text-blue-400 hover:underline">Sign up</Link>
      </div>
    </Card>
  );
}
