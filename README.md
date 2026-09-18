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
| `/` | Today | Page header, three summary metric cards (CVEs, KEV, news), a 2:1 Latest stories / Recent KEV preview grid, a reported-IP sample map, and a 14-day CVE trend chart. The stories preview uses the same recency normalization as the News page so future-dated items cannot lead. KEV previews lead with the vulnerability name and short description rather than the required-action text, which CISA repeats verbatim across entries; the required action is shown on the CVE detail page, where it is specific to the record being read. |
| `/news` | News | Searchable feed with URL-backed filters (`q`, `cve`, `source`, `period`, `sort`) that survive reload, back, and share. Stories that name a CVE explicitly carry a reference link to that record. A "New stories available" banner refreshes in place without jarring reordering; failed refreshes keep the prior content with a stale timestamp. |
| `/threats` | Vulnerabilities | Sortable semantic table (card view on small screens), severity and exploitation filters, and expandable rows opening a full CveDetails read-out (CVSS, EPSS, attack vector, CWE, KEV, references). |
| `/cve/[id]` | CVE detail | Exact per-CVE lookup with a direct NVD fallback for CVEs outside the loaded snapshot, a copy-to-clipboard CVE ID, an explicit KEV-only fallback state, a "last fetched" timestamp, and a browser-local review panel (save, review status, private note, export/import/reset). |
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

## Frontend design review (2026-09-17)

A review of the deployed site across all six routes at desktop, laptop, and
mobile widths, with a programmatic pass over contrast, tap targets, heading
order, landmarks, accessible names, and line measure. It found no WCAG AA
contrast failures and a clean heading hierarchy, and recorded 22 findings
(F1–F22) that are mostly information density rather than styling.

The review and its ten-wave implementation plan live in
`docs/superpowers/plans/2026-09-17-frontend-design-improvements.md`. Section 2
of that document lists constraints that must survive every wave.

**Wave 1 — correctness (complete).**

- KEV previews on the Today page rendered five visually identical rows, because
  each showed `requiredAction`, which CISA repeats verbatim across entries. They
  now lead with `vulnerabilityName` and `shortDescription`, which are distinct
  per record and were already being fetched.
- The Vulnerabilities filter toolbar had a 13px baseline misalignment caused by
  a quick-filter button inheriting a 44px `min-height`. A dedicated
  `.control-chip` class replaces the override, and returns to a 44px minimum at
  mobile widths for touch.
- Sort and quick-filter toggles had identical computed background, border, and
  text color in both states, so the active option was invisible to sighted
  users. State is now driven off `aria-pressed` in CSS, with an inset ring as a
  non-color cue so it survives a grayscale check.
- CVE detail pages read "Briefing / Today" and left no nav item current, because
  the header used an exact-pathname title map. A resolver in `lib/breadcrumb.ts`
  now handles dynamic routes, and `lib/nav-active.ts` marks Vulnerabilities
  current on `/cve/*` for both the sidebar and the mobile drawer.
- Counts rendered as "1 points", "1 comments", and "1 sampled records". A
  `plural()` helper in `lib/format.ts` is applied at every count call site.

**Wave 2 — information design (complete).**

- The "14-day CVE trend" chart fabricated zeros. NVD returns roughly 100 of 8677
  CVEs in the window, clustered in about two days, and the chart laid a
  contiguous 14-day range over them and filled every uncovered day with zero —
  so eleven of fourteen zeros meant "not sampled" but read as "none published".
  That contradicted the no-fabricated-zeros guarantee above. It is replaced on
  both the Today and Analytics pages by the EPSS score distribution, which was
  already computed server-side and never rendered, and which describes the
  loaded snapshot rather than implying a population trend.
- Analytics used three different bar treatments on one page. All distributions
  now share one grammar; severity keeps its semantic colour ramp because that
  colour carries meaning.
- Top weakness types is a ranked list with human-readable CWE names
  (`lib/cwe-names.ts`) instead of eight cards holding one number each. Unmapped
  IDs fall back to the bare identifier rather than an invented name.
- The sampling caveat around the reported-IP map was stated three times and is
  now stated once, inside the panel. The Vulnerabilities page stated its partial
  coverage three times and now separates one static scope line from live filter
  feedback, with distinct copy for the complete, partial, unknown, and error
  states.
- Community feeds had no visible order: `lib/hn.ts` queries Algolia's
  relevance-ranked endpoint and bounds by date without sorting by it. The route
  now sorts explicitly, both feeds gained Recent and Top toggles, undated items
  sink rather than sorting as "now", and a null engagement count sorts below a
  real zero.

Waves 3–5 cover reading density and platform polish. Waves 6–10 migrate the
visual system to WebTUI for a terminal-UI aesthetic, keeping the reading
typeface, the validated palette, and the severity ramp.

## Feature milestone: connected evidence and local review

The first feature milestone connects the News and Vulnerabilities views and
gives the reader somewhere to record a decision. It deliberately takes the
cheap, defensible half of that work and defers story grouping.

- **Text normalization** (`lib/entities.ts`). Feeds emit escaped entities
  (`M&#038;A`) and syndication furniture ("The post … appeared first on …").
  Titles and snippets are decoded and de-boilerplated before display, so
  matching never runs against markup. Unrecognized entities are kept verbatim
  rather than dropped.
- **Explicit CVE references.** A story that names a CVE in its title or
  snippet gets a `cveIds` list and a reference link to `/cve/[id]`. This is a
  *reference*, not an assessment: it records that the source wrote the
  identifier. It implies no severity, no exploitation, and nothing about
  whether the reader is affected.
- **Exact-match CVE filter.** The News page accepts a `cve` URL param. A value
  that is not a CVE identifier is reported as invalid instead of rendering an
  empty list, so "no stories" can never stand in for "that is not a CVE ID".
  An empty result states that no story in the *loaded snapshot* names the
  identifier, and says so explicitly.
- **Browser-local review state** (`lib/reader-state.ts`). Save, review status
  (Needs review / Investigating / Addressed / Not relevant), and a private
  note, stored in this browser only, with export, import, and reset. A
  decision is stamped with the record revision it was made against; when the
  record is later revised, the earlier decision is shown as outdated rather
  than silently inherited. "Addressed" records the reader's own decision — it
  is not a CyberDaily verification that remediation happened.
- **Coverage honesty.** NVD completeness no longer treats an unreported total
  result count as `complete`. An unestablished total stays `unknown` and is
  surfaced as such on the Vulnerabilities page and in `/api/threats`.

Deferred on purpose: conservative story grouping and evidence lineage
(needs a labeled evaluation set), the followable product/topic catalog, and
revision history with change events. Those are designed to compose on top of
the entity and normalization primitives added here.

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
| `npm test` | Run the Vitest suite |
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
- CVE references are extracted only when a source writes the identifier in its
  title or snippet. A story that discusses a vulnerability without naming it
  carries no reference, and the absence of a reference is not evidence of
  anything about that story.
- The CVE filter matches within the loaded snapshot only. The 14-day NVD
  window is a sampling limit, so an empty result means "not in the loaded
  feed", never "not affected".
- Review state (saves, statuses, notes) lives in one browser's local storage.
  Clearing site data removes it, it does not follow the reader across devices,
  and export is the only way to keep a copy.
- There is no revision history yet. A decision records the revision it was
  made against and can be shown as outdated, but no change timeline exists.