import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Cost Markets — AI Pricing Intelligence",
  description: "Prediction markets for AI model pricing. Trade on future API and subscription costs. Built for founders, PMs, and infrastructure teams.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%230a0e17'/><text x='50%25' y='55%25' font-size='60' text-anchor='middle' dominant-baseline='middle' fill='%2310b981' font-family='monospace' font-weight='bold'>$</text></svg>",
  },
  openGraph: {
    title: "AI Cost Markets",
    description: "Prediction markets for AI model pricing. Trade on future API and subscription costs.",
    type: "website",
  },
  other: {
    "theme-color": "#0a0e17",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,400&display=swap"
        />
      </head>
      <body className="min-h-screen bg-bg-0 text-slate-100 font-body antialiased">
        {children}
      </body>
    </html>
  );
}
