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
          green: "#00ff88",
          cyan: "#00f0ff",
          amber: "#ffb800",
          dark: "#0a0a0a",
          navy: "#1a1a2e",
          red: "#ff4757",
          purple: "#7c3aed",
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
        "glow-green": "0 0 20px rgba(0, 255, 136, 0.3)",
        "glow-red": "0 0 20px rgba(255, 71, 87, 0.3)",
        "glow-cyan": "0 0 20px rgba(0, 240, 255, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
