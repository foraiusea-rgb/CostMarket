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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    fetch("/api/auth").then(r => r.json()).then(d => { if (d.ok && d.data) setUser(d.data); }).catch(() => {});
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
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
  ];

  const authLinks = user ? [
    { href: "/portfolio", label: "Portfolio" },
    { href: "/watchlist", label: "Watchlist" },
    ...(user.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ] : [];

  const allLinks = [...links, ...authLinks];
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0e17]/90 backdrop-blur-xl" aria-label="Main navigation">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/markets" className="flex items-center gap-2.5 group" aria-label="AI Cost Markets home">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-blue-500 text-xs font-bold text-white font-mono" aria-hidden="true">$</div>
          <span className="font-display font-bold text-[15px] tracking-tight hidden sm:inline">AI Cost Markets</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {user && (
            <div className="mr-2 flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-bg-2 px-2.5 py-1 text-[11px] font-mono text-slate-400">
              <span className={user.balance >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                ${user.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {allLinks.map(l => (
            <Link key={l.href} href={l.href}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                isActive(l.href)
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}>
              {l.label}
            </Link>
          ))}

          {user ? (
            <button onClick={handleLogout} className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">
              Logout
            </button>
          ) : (
            <Link href="/login" className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/15 transition-colors">
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile: balance + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {user && (
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
              ${user.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-bg-0/95 backdrop-blur-xl animate-in">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-0.5">
            {allLinks.map(l => (
              <Link key={l.href} href={l.href}
                className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(l.href)
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}>
                {l.label}
              </Link>
            ))}
            <div className="border-t border-white/[0.06] mt-1 pt-1">
              {user ? (
                <button onClick={handleLogout} className="w-full text-left rounded-md px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]">
                  Logout
                </button>
              ) : (
                <Link href="/login" className="block rounded-md px-3 py-2.5 text-sm font-medium text-blue-400 hover:bg-blue-500/10">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
