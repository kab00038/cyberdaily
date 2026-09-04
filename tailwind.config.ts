import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          green: "#22c55e",
          cyan: "#06b6d4",
          amber: "#f59e0b",
          dark: "#0f0f23",
          navy: "#1a1a2e",
          red: "#ef4444",
          purple: "#8b5cf6",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        scan: "scan 8s linear infinite",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.85", filter: "brightness(1.3)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        "glow-green": "0 0 20px rgba(34, 197, 94, 0.3)",
        "glow-red": "0 0 20px rgba(239, 68, 68, 0.3)",
        "glow-cyan": "0 0 20px rgba(6, 182, 212, 0.25)",
        "glow-purple": "0 0 20px rgba(139, 92, 246, 0.25)",
      },
      backgroundImage: {
        "cyber-gradient": "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
