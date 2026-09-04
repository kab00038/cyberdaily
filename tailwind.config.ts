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
          dark: "#0a0a0a",
          navy: "#1a1a2e",
          red: "#ff6b6b",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
