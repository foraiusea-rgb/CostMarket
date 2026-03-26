"use client";

import { useState, useEffect } from "react";
import { Card, SectionHeader, Button } from "@/components/ui";
import type { UserPublic } from "@/types";

export default function SettingsPage() {
  const [user, setUser] = useState<UserPublic | null>(null);

  useEffect(() => {
    fetch("/api/auth").then(r => r.json()).then(d => { if (d.ok && d.data) setUser(d.data); }).catch(() => {});
  }, []);

  if (!user) return <div className="text-center py-12 text-sm text-slate-500">Sign in to access settings.</div>;

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-bold tracking-tight mb-6">Settings</h1>

      <Card className="p-5 mb-4">
        <SectionHeader>Account</SectionHeader>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Name</span><span>{user.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-mono text-xs">{user.email}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Role</span><span className="capitalize">{user.role}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Plan</span><span className="capitalize">{user.plan}</span></div>
        </div>
      </Card>

      <Card className="p-5 mb-4">
        <SectionHeader>Simulated Balance</SectionHeader>
        <div className="text-2xl font-bold font-mono text-emerald-400 mb-2">
          ${user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
        <p className="text-[10px] text-slate-500">This is simulated currency for prediction market trading. No real money is involved.</p>
      </Card>

      <Card className="p-5">
        <SectionHeader>Notifications</SectionHeader>
        <p className="text-xs text-slate-500">Email notifications for price alerts and market resolutions coming soon.</p>
      </Card>
    </div>
  );
}
