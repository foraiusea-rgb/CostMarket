import { Card } from "@/components/ui";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-xs text-slate-500 mb-8">Last updated: March 2026</p>

      <div className="space-y-6 text-sm text-slate-400 leading-relaxed">
        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-200 mb-3">1. Information We Collect</h2>
          <p className="mb-2"><strong className="text-slate-300">Account data:</strong> Name, email address, and hashed password when you create an account.</p>
          <p className="mb-2"><strong className="text-slate-300">Usage data:</strong> Trading activity, builder scenarios, watchlist selections, and market interactions within the platform.</p>
          <p><strong className="text-slate-300">Technical data:</strong> IP address, browser type, and device information for security and rate limiting purposes.</p>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-200 mb-3">2. How We Use Your Information</h2>
          <p>We use your data to: provide and maintain the service; process simulated trades; generate personalized builder recommendations; detect and prevent abuse; improve the platform; and communicate service updates.</p>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-200 mb-3">3. Data Security</h2>
          <p>Passwords are hashed using bcrypt and never stored in plaintext. Session tokens are HttpOnly cookies with strict same-site policy. API endpoints are rate-limited. We do not store payment information (all trading is simulated).</p>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-200 mb-3">4. Data Sharing</h2>
          <p>We do not sell your personal information. We may share anonymized, aggregated market data for research purposes. We may disclose data if required by law or to protect our rights.</p>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-200 mb-3">5. Your Rights</h2>
          <p className="mb-2">You have the right to: access your personal data; correct inaccurate data; request deletion of your account and associated data; export your trading history and scenarios; and opt out of non-essential communications.</p>
          <p>To exercise these rights, contact <span className="text-blue-400">privacy@aicostmarkets.com</span>.</p>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-200 mb-3">6. Cookies</h2>
          <p>We use a single essential session cookie for authentication. We do not use tracking cookies, advertising pixels, or third-party analytics that track individual users. The session cookie is HttpOnly and not accessible to client-side scripts.</p>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-200 mb-3">7. Data Retention</h2>
          <p>Account data is retained while your account is active. Trading history and builder scenarios are retained for the lifetime of the associated markets. You may request account deletion at any time, which will remove all personal data within 30 days.</p>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-bold text-slate-200 mb-3">8. Changes to This Policy</h2>
          <p>We may update this policy periodically. Material changes will be communicated via the platform. Continued use after changes constitutes acceptance.</p>
        </Card>

        <div className="text-xs text-slate-500 pt-4">
          Questions? Contact <span className="text-blue-400">privacy@aicostmarkets.com</span> · <Link href="/terms" className="text-blue-400 hover:underline">Terms of Service</Link> · <Link href="/methodology" className="text-blue-400 hover:underline">How It Works</Link>
        </div>
      </div>
    </div>
  );
}
