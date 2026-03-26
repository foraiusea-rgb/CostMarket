"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserPublic } from "@/types";

export default function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserPublic | null>(null);

  useEffect(() => {
    fetch("/api/auth").then(r => r.json()).then(d => { if (d.ok && d.data) setUser(d.data); }).catch(() => {});
  }, []);

  const links = [
    { href: "/markets", label: "Markets" },
    { href: "/builder", label: "Builder" },
    { href: "/methodology", label: "How It Works" },
  ];

  const authLinks = user ? [
    { href: "/portfolio", label: "Portfolio" },
    { href: "/watchlist", label: "Watchlist" },
    ...(user.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ] : [];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0e17]/85 backdrop-blur-xl" aria-label="Main navigation">
      <div className="mx-auto flex h-13 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/markets" className="flex items-center gap-2.5 group" aria-label="AI Cost Markets home">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-blue-500 text-xs font-bold text-white font-mono" aria-hidden="true">$</div>
          <span className="font-display font-bold text-[15px] tracking-tight">AI Cost Markets</span>
        </Link>

        <div className="flex items-center gap-1">
          {user && (
            <div className="mr-3 hidden sm:flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-bg-2 px-2.5 py-1 text-[11px] font-mono text-slate-400">
              <span className={user.balance >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                ${user.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {[...links, ...authLinks].map(l => (
            <Link key={l.href} href={l.href}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                isActive(l.href)
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}>
              {l.label}
            </Link>
          ))}

          {user ? (
            <button onClick={async () => {
              await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
              setUser(null);
              window.location.href = "/markets";
            }} className="rounded-full px-3 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors">
              Logout
            </button>
          ) : (
            <Link href="/login" className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-medium text-blue-400 hover:bg-blue-500/15 transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
