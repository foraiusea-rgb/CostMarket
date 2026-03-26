"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button, Input } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
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
      body: JSON.stringify({ action: "signup", name, email, password }),
    });
    const data = await res.json();

    if (data.ok) {
      router.push("/markets");
      router.refresh();
    } else {
      setError(data.error || "Signup failed");
    }
    setLoading(false);
  };

  return (
    <Card className="p-6">
      <h1 className="font-display text-xl font-bold mb-1 text-center">Create Account</h1>
      <p className="text-xs text-slate-500 text-center mb-5">Start with $10,000 simulated balance</p>

      {error && <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required autoComplete="name" />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" />
        <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required autoComplete="new-password" minLength={8} />
        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create Account"}
        </Button>
      </form>

      <div className="mt-4 text-center text-xs text-slate-500">
        Already have an account? <Link href="/login" className="text-blue-400 hover:underline">Sign in</Link>
      </div>
    </Card>
  );
}
