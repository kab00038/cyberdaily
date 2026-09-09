# CyberDaily

A daily cybersecurity briefing: news, vulnerabilities, community discussion,
and attack-surface analytics, with honest data attribution throughout. Every
count, banner, and chart names the dataset, period, and sample size it comes
from — nothing is presented as larger or fresher than it is.

The interface is a calm, dark, readable daily summary rather than an alarmist
command center.

The visual system follows an editorial briefing rhythm: Space Grotesk page
headings, DM Sans reading text, and JetBrains Mono measurements and provenance.
Emerald is reserved for navigation and chart marks; severity uses the shared
semantic ramp. Summary metrics form a quiet ledger, feeds use compact reading
rows, and named loading panels explain what is being fetched. All six pages
share the semantic `ui-*` tokens, visible keyboard focus, reduced-motion rules,
and mobile layouts; the vulnerability register switches from a table to cards.

## Pages

| Path | Page | Contents |
| --- | --- | --- |
| `/` | Today | Page header, three summary metric cards (CVEs, KEV, news), a 2:1 Latest stories / Recent KEV preview grid, a reported-IP sample map, and a 14-day CVE trend chart. The stories preview uses the same recency normalization as the News page so future-dated items cannot lead. |
| `/news` | News | Searchable feed with URL-backed filters (`q`, `source`, `period`, `sort`) that survive reload, back, and share. A "New stories available" banner refreshes in place without jarring reordering; failed refreshes keep the prior content with a stale timestamp. |
| `/threats` | Vulnerabilities | Sortable semantic table (card view on small screens), severity and exploitation filters, and expandable rows opening a full CveDetails read-out (CVSS, EPSS, attack vector, CWE, KEV, references). |
| `/cve/[id]` | CVE detail | Exact per-CVE lookup with a direct NVD fallback for CVEs outside the loaded snapshot, a copy-to-clipboard CVE ID, an explicit KEV-only fallback state, and a "last fetched" timestamp. |
| `/community` | Community | Hacker News and Reddit security discussions in one section, with uniform rows, per-row "Read article" / "View discussion" links, and "View more discussions" footers. |
| `/analytics` | Analytics | Completeness-aware trends: severity, attack vector, and EPSS distributions, vendor mentions, and CWE breakdowns (custom DistributionList bars). |
| `/sources` | Sources | Data provenance, cadence, scope, and live health status for every upstream source. |

## API routes

All API routes run on the Edge runtime.

| Route | Purpose | Upstream |
| --- | --- | --- |
| `/api/news` | RSS news + optional Groq AI summaries | Six security RSS feeds |
| `/api/threats` | CVE list with composite risk scoring | NVD CVE 2.0, CISA KEV, FIRST EPSS |
| `/api/trends` | Trend distributions | NVD + CISA KEV + FIRST EPSS |
| `/api/cve/[id]` | Per-CVE lookup | KEV catalog + NVD snapshot + direct NVD fallback + EPSS |
| `/api/threatmap` | Attack-source map sample | blocklist.de + ip-api.com geolocation |
| `/api/hackernews` | HN stories | Algolia (date-bounded) |
| `/api/osint` | Reddit posts | Reddit RSS |
| `/api/sources` | Aggregate source health (60s cache) | Live probes of every upstream |

## Data sources and cadences

| Source | Data | Cadence |
| --- | --- | --- |
| BleepingComputer, The Hacker News, Krebs on Security, Dark Reading, SecurityWeek, The Record | Cybersecurity news via RSS | Every 15 min |
| Groq (gpt-oss models) | AI summaries for top news items | Async per fetch (optional) |
| NVD CVE 2.0 | CVEs from the last 14 days | Hourly |
| CISA KEV | Full Known Exploited Vulnerabilities catalog | Hourly |
| FIRST EPSS | Exploit probability scores for loaded CVEs | Hourly |
| Hacker News (Algolia) | Cybersecurity discussions | Every 15 min |
| Reddit subreddits | Security community posts via RSS | Every 15 min |
| blocklist.de | Attack-source IP lists (9 categories), IP geolocation | Sampled every 5 min |

All sources are free with no production restrictions.

## Truthfulness guarantees

- Every count, banner, and chart names its dataset, period, and sample size.
- No fabricated zeros: partial NVD results label their completeness
  (`complete | partial | unknown`), and trend charts with missing data never
  auto-zero.
- No hardcoded percentage deltas, and no severity gauge derived from a fixed
  sample size.
- KEV membership uses the full CISA catalog, not a sliced top-10.
- Map markers are described as a sampled snapshot, never "worldwide attack
  volume".
- News and community items missing publication dates sink to the bottom of
  chronological lists and render "Date unavailable".
- Engagement counts (votes, comments) are nullable and render a placeholder
  when absent rather than treating zero as a real value.
- News filters live in the URL, so reload, back, and share restore the same
  view.
- Failed refreshes keep the previous content with a stale timestamp instead of
  blanking the page.
- The header health indicator is derived from real source probes, not a
  decorative "Operational" badge. The Sources page documents provenance,
  cadence, and live status for every upstream.

## Blueprint and implementation passes

The recent work followed the CyberDaily 10/10 blueprint
(`docs/superpowers/plans/2026-09-03-cyberdaily-implementation.md`) and was
applied in four passes:

1. **Pass 1 — defect removal.** Fixed visible defects from the latest review:
   invalid nested anchors in the Hacker News feed, unreadable filter labels,
   inconsistent headline sizes between community feeds, and heading-hierarchy
   issues.
2. **Pass 2 — visual-system consistency.** One content `h1` per page with a
   `.page-subtitle` in a shared `.page-header` / `.page-body` layout, and the
   Today preview normalized through the same recency filter as the News page
   so future-dated items cannot lead.
3. **Pass 3 — CVE detail experience.** Copy-to-clipboard CVE ID with
   confirmation (dialog fallback), a clearly labeled KEV-only state, prominent
   NVD links, a "last fetched" timestamp, and a KEV-only indicator on
   Vulnerabilities table rows.
4. **Pass 4 — documentation.** This README refresh.

## Architecture

- Next.js 15.5 App Router with route groups; all dynamic routes export
  `runtime = "edge"`.
- React 19, TypeScript 5, Tailwind CSS 3 with semantic `ui-*` color tokens.
- recharts for trend charts; DistributionList (custom component) for
  categorical distribution bars.
- react-simple-maps + d3-geo for the world map; fast-xml-parser for RSS.
- Native `<dialog>` for the mobile nav drawer (focus trap, Escape, scroll
  lock).
- Cloudflare Pages deployment via `@cloudflare/next-on-pages`.

## Development

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the lockfile |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Type-check the project |
| `npm run build` | Next.js production build |
| `npm run pages:build` | Cloudflare Pages build validation |
| `npm run dev` | Local development server |

Set `GROQ_API_KEY` in `.env.local` to enable AI news summaries. Without it,
the news endpoint serves RSS content immediately and enrichment is skipped.

## Known limitations

- AI enrichment is best-effort: summaries are fire-and-forget and may be
  missing when Groq is slow or unconfigured.
- Some feed items lack publication dates and render "Date unavailable".
- The blocklist.de map is a sampled snapshot of reported IPs, not a count of
  worldwide attacks.
- The NVD snapshot covers the last 14 days (100 results per page); CVEs
  outside it are resolved via direct lookup on the detail page or absent from
  the browser.
- Community engagement counts are extracted from RSS content and may be
  unavailable for some posts.