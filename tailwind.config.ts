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
          dark: "#0B0F0E",
          navy: "#0A0E0C",
          panel: "rgba(18, 25, 22, 0.65)",
          emerald: "#10B981",
          green: "#10B981",
          red: "#EF4444",
          coral: "#F87171",
          amber: "#F59E0B",
          yellow: "#84CC16",
          muted: "#6B7280",
          body: "#D1D5DB",
          heading: "#F9FAFB",
        },
        severity: {
          exploited: "#EF4444",
          critical: "#F97316",
          high: "#F59E0B",
          medium: "#84CC16",
          low: "#10B981",
          unknown: "#6B7280",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        scan: "scan 8s linear infinite",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-emerald": "pulse-emerald 2.5s ease-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.85", filter: "brightness(1.3)" },
        },
        "pulse-emerald": {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
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
      backgroundImage: {
        "anarisk-gradient":
          "linear-gradient(135deg, #0B0F0E 0%, #0A0E0C 50%, #0B0F0E 100%)",
        "anarisk-glow":
          "radial-gradient(ellipse at 60% 50%, rgba(16,185,129,0.08), transparent 70%)",
      },
    },
  },
  plugins: [],
};
export default config;
