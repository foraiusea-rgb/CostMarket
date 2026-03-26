import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: { 0: "#0a0e17", 1: "#0f1521", 2: "#131b2e", 3: "#182038" },
        accent: { green: "#10b981", red: "#ef4444", blue: "#3b82f6", amber: "#f59e0b", purple: "#a855f7" },
        provider: { openai: "#10a37f", anthropic: "#d97706", google: "#4285f4" },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
