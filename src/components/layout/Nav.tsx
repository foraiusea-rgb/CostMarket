"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserPublic } from "@/types";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserPublic | null>(null);

  useEffect(() => {
    // Fetch current user from our API (which checks Supabase session + DB)
    fetch("/api/auth").then(r => r.json()).then(d => { if (d.ok && d.data) setUser(d.data); }).catch(() => {});

    // Listen for Supabase auth state changes (login/logout from other tabs)
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        // Re-fetch user from our API to get DB-backed profile
        fetch("/api/auth").then(r => r.json()).then(d => {
          setUser(d.ok ? d.data : null);
        }).catch(() => setUser(null));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push("/markets");
    router.refresh();
  };

  const links = [
    { href: "/markets", label: "Markets" },
    { href: "/builder", label: "Builder" },
    { href: "/ai", label: "AI" },
    { href: "/propose", label: "Propose" },
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
            <button onClick={handleLogout} className="rounded-full px-3 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors">
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
