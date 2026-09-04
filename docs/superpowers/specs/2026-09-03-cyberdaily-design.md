# CyberDaily — Cybersecurity News Dashboard Design Spec

## Overview

CyberDaily is a daily-use cybersecurity news dashboard that aggregates real-time threat intelligence, news, and visualizations from free, production-safe sources. Deployed on Cloudflare Pages.

## Architecture

```
Next.js 14 (App Router)
├── /app
│   ├── layout.tsx            # Root layout with dark theme
│   ├── page.tsx              # Main dashboard
│   ├── /api
│   │   ├── /news/route.ts    # RSS feed aggregator
│   │   ├── /threats/route.ts # CISA KEV + NVD CVE data
│   │   ├── /threatmap/route.ts # abuse.ch + GeoIP for map arcs
│   │   └── /hackernews/route.ts # HN cybersecurity stories
├── /components
│   ├── ThreatMap.tsx         # World map with animated arcs
│   ├── NewsFeed.tsx          # Scrollable news cards
│   ├── ThreatForecast.tsx    # CVE/KEV trending threats
│   ├── HackerNewsFeed.tsx    # HN stories
│   ├── StatsBar.tsx          # Threat statistics
│   └── Header.tsx            # Logo + nav + last updated
├── /lib
│   ├── rss.ts                # RSS parser (rss-parser)
│   ├── abuse-ch.ts           # abuse.ch API client
│   ├── nvd.ts                # NVD CVE API client
│   ├── hn.ts                 # Hacker News API client
│   └── geoip.ts              # IP to coordinates lookup
```

## Data Sources

### News (RSS Feeds)
| Source | Feed URL | Update Frequency |
|--------|----------|------------------|
| BleepingComputer | `https://www.bleepingcomputer.com/feed/` | 15 min |
| The Hacker News | `https://feeds.feedburner.com/TheHackersNews` | 15 min |
| Krebs on Security | `https://krebsonsecurity.com/feed/` | 15 min |
| Dark Reading | `https://www.darkreading.com/rss.xml` | 15 min |
| SecurityWeek | `https://www.securityweek.com/feed/` | 15 min |
| The Record | `https://therecord.media/feed` | 15 min |

### Threat Intelligence
| Source | Endpoint | Auth | Rate Limit |
|--------|----------|------|------------|
| CISA KEV | `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` | None | None |
| NVD CVE API 2.0 | `https://services.nvd.nist.gov/rest/json/cves/2.0` | Free key (recommended) | 5 req/30s (50 with key) |
| abuse.ch URLhaus | `https://urlhaus.abuse.ch/api/` | Free auth key | Every 5 min |
| abuse.ch ThreatFox | `https://threatfox.abuse.ch/` | Free auth key | Every 5 min |

### Community
| Source | Endpoint | Auth |
|--------|----------|------|
| Hacker News Algolia | `https://hn.algolia.com/api/v1/search?query=cybersecurity&tags=story` | None |
| Hacker News Firebase | `https://hacker-news.firebaseio.com/v0/topstories.json` | None |

## Components

### ThreatMap
- World map using `react-simple-maps` with `d3-geo` projection
- Animated SVG arcs showing attack source → destination
- Data from abuse.ch URLhaus with GeoIP lookups
- Polls `/api/threatmap` every 5 minutes
- Color coding: red for active attacks, orange for recent, gray for historical

### NewsFeed
- Scrollable card layout with source badges
- Each card: title, snippet, source icon, time ago, link to original
- Infinite scroll or "Load more" button
- Sorted by recency, deduplicated across sources

### ThreatForecast
- Top 5 CISA KEV additions (actively exploited vulnerabilities)
- Trending CVEs from NVD (highest CVSS scores)
- Expandable cards with vulnerability details

### HackerNewsFeed
- Top cybersecurity stories from HN Algolia API
- Shows: title, points, comment count, time ago
- Links to HN discussion

### StatsBar
- Attacks tracked today (from abuse.ch data)
- New CVEs published (from NVD)
- CISA KEV additions this week
- Sources monitored count

## Styling

- **Theme:** Dark mode (cybersecurity aesthetic)
- **Colors:** 
  - Background: `#0a0a0a` (near black)
  - Cards: `#1a1a2e` (dark navy)
  - Accent: `#00ff88` (cyber green)
  - Warning: `#ff6b6b` (threat red)
  - Text: `#e0e0e0` (light gray)
- **Font:** JetBrains Mono (monospace for tech feel)
- **Framework:** Tailwind CSS

## API Routes

### GET /api/news
Returns aggregated RSS feed items, cached for 15 minutes.

### GET /api/threats
Returns CISA KEV + trending CVEs, cached for 1 hour.

### GET /api/threatmap
Returns abuse.ch data with GeoIP coordinates, cached for 5 minutes.

### GET /api/hackernews
Returns top cybersecurity HN stories, cached for 15 minutes.

## Deployment

- **Platform:** Cloudflare Pages
- **Adapter:** `@cloudflare/next-on-pages`
- **Build:** `npx @cloudflare/next-on-pages`
- **Output:** `.vercel/output/static`

## Environment Variables

```
NVD_API_KEY=          # Optional, increases rate limit
ABUSE_CH_AUTH_KEY=    # Required for abuse.ch
```

## Success Criteria

1. Dashboard loads in < 2 seconds
2. News updates every 15 minutes automatically
3. Threat map shows real attack data with animations
4. All data sources are free and production-safe
5. Deployed and accessible via Cloudflare Pages URL
