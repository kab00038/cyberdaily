# CyberDaily

A focused daily cybersecurity briefing: news, vulnerabilities, and threat
intelligence with honest data attribution.

The interface is a calm, dark, readable daily summary — not an alarmist
command center. Every count, badge, and chart is labeled with the source
it came from and the freshness of that data.

## Pages

- **Today (`/`)** — page header, three honest summary metrics, a 2:1
  briefing of latest news and recent KEV entries, the reported-IP sample
  map, and a single 14-day CVE trend chart
- **News (`/news`)** — searchable, filterable feed with source and date
  filters, an empty-results state, and a "Load more stories" action
- **Vulnerabilities (`/threats`)** — sortable CVE table with severity,
  EPSS probability, and CISA KEV membership as separate measures;
  expandable detail panel with CVSS, EPSS, attack vector, CWE, and
  references
- **Community (`/community`)** — Hacker News cybersecurity stories and
  Reddit subreddit discussions, with separate "Read article" /
  "View discussion" links on HN rows
- **Analytics (`/analytics`)** — completeness-aware CVE trend, severity
  distribution, attack vector distribution (structured CVSS), vendor
  mentions, and CWE breakdown

## Data sources

- RSS: BleepingComputer, The Hacker News, Krebs on Security, Dark
  Reading, SecurityWeek, The Record
- APIs: Hacker News (Algolia, date-bounded), CISA KEV JSON catalog,
  NVD CVE 2.0, blocklist.de (9 attack categories)
- Optional enrichment: Groq (gpt-oss-120b) — fire-and-forget, items
  render with `null` urgency/category when unavailable

All sources are free with no production restrictions.

## Truthfulness

- No hardcoded percentage deltas
- No "critical" gauge derived from a fixed sample size
- No map markers describing "worldwide attack volume"
- KEV membership uses the full CISA catalog (not a sliced top-10)
- NVD responses expose `completeness: complete | partial | unknown`
  and a non-null `nvdError`; the UI labels partial results explicitly
- News and community items with missing publication dates sink to the
  bottom of chronological lists and render "Date unavailable"
- Engagement counts (votes, comments) are nullable; "—" is shown when
  absent rather than treating zero as a real value

## Tech stack

- Next.js 15.5 (App Router) on the Edge runtime
- React 19
- TypeScript 5
- Tailwind CSS 3 with semantic `ui.*` color tokens
- recharts 3 for charts
- react-simple-maps + d3-geo for the world map
- Groq OpenAI-compatible API for optional AI summaries
- Cloudflare Pages deployment via `@cloudflare/next-on-pages`

## Development

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run build          # next build
npm run pages:build    # @cloudflare/next-on-pages validation
```

`npm run dev` starts the local Next dev server.

Set `GROQ_API_KEY` in `.env.local` to enable AI summaries; without it,
the news endpoint serves RSS content immediately and enrichment is
skipped.

## Routes

| Path | Type | Source |
| --- | --- | --- |
| `/` | static | DashboardSection (Today) |
| `/news` | static | NewsSection |
| `/threats` | static | ThreatsSection |
| `/community` | static | OsintSection |
| `/analytics` | static | AnalyticsSection |
| `/api/news` | edge | `lib/rss.ts` + optional `lib/ai.ts` |
| `/api/threats` | edge | `lib/nvd.ts` + `lib/abuse-ch.ts` + `lib/epss.ts` |
| `/api/trends` | edge | `lib/nvd.ts` + `lib/abuse-ch.ts` + `lib/epss.ts` |
| `/api/threatmap` | edge | `lib/abuse-ch.ts` (blocklist.de) |
| `/api/hackernews` | edge | `lib/hn.ts` (Algolia, date-bounded) |
| `/api/osint` | edge | `lib/osint.ts` (Reddit RSS) |
