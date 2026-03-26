import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/markets" className="flex items-center gap-2 justify-center mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 text-sm font-bold text-white font-mono">$</div>
          <span className="font-display font-bold text-lg tracking-tight">AI Cost Markets</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
