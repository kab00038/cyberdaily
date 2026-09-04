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
          dark: "#0F0A08",
          navy: "#19120C",
          panel: "rgba(25, 18, 12, 0.75)",
          cyan: "#E8531E",
          amber: "#E87030",
          orange: "#E8531E",
          green: "#2EAA7A",
          red: "#E85030",
          purple: "#C87A40",
          yellow: "#D08040",
          muted: "#8A7A6A",
          body: "#C8B8AA",
          heading: "#F0E8E0",
        },
        warm: {
          bg: "#0F0A08",
          surface: "rgba(25, 18, 12, 0.75)",
          sidebar: "#120E0B",
          accent: "#E8531E",
          accent2: "#E87030",
          success: "#2EAA7A",
          critical: "#E85030",
          warning: "#D08040",
          body: "#C8B8AA",
          heading: "#F0E8E0",
          muted: "#8A7A6A",
          dim: "#6A5A4A",
          border: "rgba(200, 160, 120, 0.08)",
          borderActive: "rgba(232, 83, 30, 0.25)",
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
        "pulse-orange": "pulse-orange 2.5s ease-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.85", filter: "brightness(1.3)" },
        },
        "pulse-orange": {
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
      boxShadow: {
        "glow-green": "0 0 20px rgba(46, 170, 122, 0.3)",
        "glow-red": "0 0 20px rgba(232, 80, 48, 0.3)",
        "glow-cyan": "0 0 20px rgba(232, 83, 30, 0.25)",
        "glow-purple": "0 0 20px rgba(200, 122, 64, 0.25)",
        "glow-orange": "0 0 24px rgba(232, 83, 30, 0.25)",
        "panel": "0 4px 30px rgba(0, 0, 0, 0.3)",
        "panel-hover": "0 8px 40px rgba(0, 0, 0, 0.4)",
      },
      backgroundImage: {
        "cyber-gradient": "linear-gradient(135deg, #0F0A08 0%, #19120C 50%, #120E0B 100%)",
        "warm-glow": "radial-gradient(ellipse at 70% 50%, rgba(200, 80, 20, 0.12), transparent 70%)",
      },
    },
  },
  plugins: [],
};
export default config;
