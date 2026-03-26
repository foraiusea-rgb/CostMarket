import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-6xl font-bold font-mono text-slate-700 mb-4">404</div>
        <h1 className="text-xl font-display font-bold mb-2">Page Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <Link href="/markets" className="inline-flex items-center rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/20 px-4 py-2 text-sm font-medium hover:bg-blue-500/25 transition-colors">
          Back to Markets
        </Link>
      </div>
    </div>
  );
}
