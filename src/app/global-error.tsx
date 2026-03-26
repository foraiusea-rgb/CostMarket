"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#0a0e17", color: "#f1f5f9", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", fontWeight: 700, fontFamily: "monospace", color: "#64748b", marginBottom: "1rem" }}>500</div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Something Went Wrong</h1>
            <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: "1.5rem" }}>
              An unexpected error occurred. Our team has been notified.
            </p>
            <button
              onClick={reset}
              style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
