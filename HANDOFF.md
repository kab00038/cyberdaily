# CyberDaily — Project Handoff Document

## What This Is

A cybersecurity daily news dashboard with:
- Recent cybersecurity news from RSS feeds
- Threat forecasts (CISA KEV, NVD CVE)
- World threat map with animated attack arcs
- Hacker News cybersecurity stories
- Dark theme, deployed on Cloudflare Pages

**GitHub Repo:** https://github.com/kab00038/cyberdaily

---

## What's Been Done

### 1. Cloudflare MCP Setup ✅
Added Cloudflare MCP servers to `~/.config/opencode/opencode.jsonc`:
- `cloudflare` — Main Cloudflare MCP
- `cloudflare-docs` — Documentation (public, no auth)
- `cloudflare-bindings` — Bindings
- `cloudflare-builds` — Builds/CI
- `cloudflare-observability` — Observability

**Next step:** Run `opencode mcp auth cloudflare` to authenticate.

### 2. GitHub CLI Installed ✅
- Installed `gh` CLI to `~/.local/bin/gh`
- Authenticated as `kab00038` via device flow

### 3. GitHub Repo Created ✅
- Repo: https://github.com/kab00038/cyberdaily
- Initialized with README.md
- Design spec pushed
- Implementation plan pushed

### 4. Design Spec Written ✅
**File:** `docs/superpowers/specs/2026-09-03-cyberdaily-design.md`

Key decisions:
- **Tech stack:** Next.js 14 (App Router)
- **Data sources:** RSS feeds + Hacker News API + CISA KEV + NVD CVE + abuse.ch (all free, production-safe)
- **Threat map:** World map with animated arcs using `react-simple-maps`
- **Styling:** Dark theme, cyber green (#00ff88) accent, JetBrains Mono font
- **Deployment:** Cloudflare Pages with `@cloudflare/next-on-pages`

### 5. Implementation Plan Written ✅
**File:** `docs/superpowers/plans/2026-09-03-cyberdaily-implementation.md`

12 tasks covering:
1. Project Setup and Dependencies
2. RSS Feed Library
3. Hacker News API Client
4. Threat Intelligence Clients (NVD, CISA KEV, abuse.ch, GeoIP)
5. API Routes
6. Header and StatsBar Components
7. ThreatMap Component
8. NewsFeed Component
9. ThreatForecast and HackerNewsFeed Components
10. Main Dashboard Page
11. Build and Deploy Configuration
12. Final Testing and Push

### 6. Project Partially Initialized ⚠️
- `create-next-app` was run but may need cleanup
- Some npm dependencies installed (`react-simple-maps`, `framer-motion`, `rss-parser`, `recharts`)
- Still need: `d3-geo`, `@cloudflare/next-on-pages`, `@types/d3-geo`
- Tailwind config not yet customized for dark theme

---

## What's Left To Do

### Immediate Next Steps

1. **Finish npm install:**
   ```bash
   cd /home/kyle/Projects/cyberdaily
   npm install d3-geo @cloudflare/next-on-pages --legacy-peer-deps
   npm install -D @types/d3-geo
   ```

2. **Configure Tailwind for dark theme** — replace `tailwind.config.ts`:
   ```typescript
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
   ```

3. **Update `app/globals.css`:**
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

   body {
     background-color: #0a0a0a;
     color: #e0e0e0;
     font-family: 'JetBrains Mono', monospace;
   }

   ::-webkit-scrollbar {
     width: 8px;
   }

   ::-webkit-scrollbar-track {
     background: #1a1a2e;
   }

   ::-webkit-scrollbar-thumb {
     background: #00ff88;
     border-radius: 4px;
   }
   ```

4. **Update `app/layout.tsx`:**
   ```typescript
   import type { Metadata } from "next";
   import "./globals.css";

   export const metadata: Metadata = {
     title: "CyberDaily - Cybersecurity News Dashboard",
     description: "Daily cybersecurity news, threat forecasts, and real-time threat intelligence",
   };

   export default function RootLayout({
     children,
   }: Readonly<{
     children: React.ReactNode;
   }>) {
     return (
       <html lang="en">
         <body className="min-h-screen bg-cyber-dark">
           {children}
         </body>
       </html>
     );
   }
   ```

5. **Create `wrangler.toml`:**
   ```toml
   name = "cyberdaily"
   compatibility_date = "2024-01-01"
   compatibility_flags = ["nodejs_compat"]

   [site]
   bucket = ".vercel/output/static"
   ```

### Then Follow Implementation Plan

All remaining code is in `docs/superpowers/plans/2026-09-03-cyberdaily-implementation.md`:

- **Task 2:** `lib/rss.ts` — RSS feed parser
- **Task 3:** `lib/hn.ts` — Hacker News API client
- **Task 4:** `lib/nvd.ts`, `lib/abuse-ch.ts`, `lib/geoip.ts` — Threat intel clients
- **Task 5:** `app/api/*/route.ts` — API routes
- **Task 6:** `components/Header.tsx`, `components/StatsBar.tsx`
- **Task 7:** `components/ThreatMap.tsx` — World map with animated arcs
- **Task 8:** `components/NewsFeed.tsx`
- **Task 9:** `components/ThreatForecast.tsx`, `components/HackerNewsFeed.tsx`
- **Task 10:** `app/page.tsx` — Main dashboard
- **Task 11:** Build/deploy config, GitHub Actions
- **Task 12:** Test and push

---

## Data Sources (All Free, Production-Safe)

| Source | Endpoint | Auth | Cache |
|--------|----------|------|-------|
| BleepingComputer | RSS feed | None | 15 min |
| The Hacker News | RSS feed | None | 15 min |
| Krebs on Security | RSS feed | None | 15 min |
| Dark Reading | RSS feed | None | 15 min |
| SecurityWeek | RSS feed | None | 15 min |
| The Record | RSS feed | None | 15 min |
| Hacker News Algolia | `hn.algolia.com/api/v1/search` | None | 15 min |
| CISA KEV | JSON feed | None | 1 hour |
| NVD CVE API 2.0 | REST API | Free key (optional) | 1 hour |
| abuse.ch URLhaus | JSON feed | Free auth key | 5 min |

**Note:** NewsAPI.org is NOT for production use (dev-only, 24h delayed). Reddit is now restricted (2026). Use the sources above instead.

---

## Environment Variables Needed

```
NVD_API_KEY=          # Optional, increases rate limit from 5 to 50 req/30s
ABUSE_CH_AUTH_KEY=    # Get free key from https://auth.abuse.ch/
```

---

## Cloudflare Deployment

After building, deploy with:
```bash
npm run pages:build    # Builds with @cloudflare/next-on-pages
npm run pages:deploy   # Deploys to Cloudflare Pages
```

Or set up GitHub Actions (code in Task 11 of the plan) with these secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

---

## Key Files

| File | Purpose |
|------|---------|
| `docs/superpowers/specs/2026-09-03-cyberdaily-design.md` | Design spec |
| `docs/superpowers/plans/2026-09-03-cyberdaily-implementation.md` | Full implementation plan with all code |
| `~/.config/opencode/opencode.jsonc` | OpenCode config with Cloudflare MCP |

---

## Quick Start for Next Agent

1. `cd /home/kyle/Projects/cyberdaily`
2. Read `docs/superpowers/plans/2026-09-03-cyberdaily-implementation.md`
3. Start from Task 1 (finish setup) then follow the plan sequentially
4. All code for each task is in the plan — just copy it in
5. Test with `npm run dev` after each task
6. Deploy with `npm run pages:build && npm run pages:deploy`
