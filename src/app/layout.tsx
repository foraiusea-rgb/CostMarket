import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Cost Markets — AI Pricing Intelligence",
  description: "Prediction markets for AI model pricing. Trade on future API and subscription costs. Built for founders, PMs, and infrastructure teams.",
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
