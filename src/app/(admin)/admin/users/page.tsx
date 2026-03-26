"use client";

import { useState, useEffect } from "react";
import { Card, SectionHeader, Button, Loading } from "@/components/ui";
import type { AdminUser } from "@/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/admin?resource=users").then(r => r.json()).then(d => {
      if (d.ok) setUsers(d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(load, []);

  const updateRole = async (userId: string, role: string) => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_user_role", userId, role }),
    });
    load();
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight mb-6">Users ({users.length})</h1>

      <div className="space-y-1.5">
        {users.map((u: AdminUser) => (
          <Card key={u.id} className="px-4 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{u.name}</div>
              <div className="text-[10px] text-slate-500 font-mono">{u.email}</div>
            </div>
            <div className="text-xs text-slate-400 font-mono">${u.balance?.toFixed(2)}</div>
            <select value={u.role} onChange={e => updateRole(u.id, e.target.value)}
              className="rounded border border-white/[0.06] bg-bg-1 px-2 py-1 text-[10px] text-slate-300 outline-none">
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="admin">Admin</option>
            </select>
            <div className="text-[9px] text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
