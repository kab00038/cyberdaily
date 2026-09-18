# CyberDaily — Frontend Design Review & Implementation Plan

**Date:** 2026-09-17
**Reviewed build:** https://cyberdaily.pages.dev (live, all six routes)
**Method:** Visual review at 1440px / 1248px / 375px, plus a programmatic pass over contrast ratios, tap-target sizes, heading order, landmarks, accessible names, line measure, and computed styles.
**Scope:** targeted fixes → information-design rework → **migration to WebTUI**, in that order.

---

## 1. Honest verdict

**This is a good frontend.** Better than most self-built dashboards, and noticeably better than the design it started from (the `HANDOFF.md` spec called for `#00ff88` neon-on-black with JetBrains Mono as the body face — what actually shipped is far more disciplined). Someone made real decisions here and mostly stuck to them.

What's genuinely strong:

- **The palette passes.** A full sweep of every visible text node against its effective background produced **zero WCAG AA contrast failures**. That is rare and it did not happen by accident — the muted tone (`#96aa9e`) was clearly picked to clear 4.5:1 on the surface colors rather than eyeballed.
- **The type system is coherent.** Three faces with clear jobs (Space Grotesk for display, DM Sans for prose, JetBrains Mono for data and metadata), a real type scale in `globals.css`, `font-variant-numeric: tabular-nums` on every number.
- **Accessibility fundamentals are in place.** One `h1` per page, clean `h1 → h2 → h3` order with no skips, a working skip link, `:focus-visible` with `outline-offset`, 44px minimum control heights, a `prefers-reduced-motion` block that actually kills animations, `<caption class="sr-only">` on the data table, `aria-sort` on sortable headers, `aria-pressed` on toggles.
- **The Sources page is the best thing on the site.** Per-feed status, cadence, item counts, last-fetch times, upstream age, and honest error strings. Most products hide this. Showing it builds more trust than any amount of styling.
- **Epistemic honesty throughout.** "Sampled records — not a count of worldwide attacks," "partial NVD result set," "Counts reflect text mentions, not confirmed affected products."

Where it falls down is **not** styling. It is **information design**: several panels spend a lot of expensive screen space displaying almost no information. That is the through-line of nearly every finding below.

The single worst offender: **five KEV entries on the home page, each showing two lines of the same identical CISA boilerplate sentence.** Verified programmatically — all five long strings share a byte-identical 80-character prefix. That's roughly 40% of the home page's vertical space spent repeating one sentence, while `vulnerabilityName` and `shortDescription` — which are unique per entry and already being fetched — go unused.

---

## 2. Do not break these

Constraints for every agent working from this plan. **These survive the WebTUI migration** — see §7 for how.

1. **Do not change the color tokens** in `:root` in `app/globals.css` without re-running the contrast sweep. They pass AA.
2. **Keep the honesty copy.** Partial-data warnings and sampling disclaimers stay. Some get consolidated (F7) — none get deleted.
3. **Preserve the a11y work**: single `h1`, heading order, `aria-sort`, `aria-pressed`, `sr-only` captions, focus styles, 44px targets, reduced-motion block.
4. **`app/globals.css` is a shared file.** Parallel agents editing it will conflict. All CSS changes are consolidated into single-owner tasks — respect the ownership column.
5. Waves 1–5 fix what exists; **the new visual direction starts at Wave 7**. Wave 6 settled the type question (option B — terminal chrome, sans prose), so ASCII borders and WebTUI components are in scope from Wave 7 onward, but **monospace-everywhere and theme swaps are not** — see Wave 6.

---

## 3. Findings

Severity: **P0** = visibly broken or actively misleading · **P1** = significant quality loss · **P2** = polish.

### P0

**F1 — KEV previews show five copies of the same sentence.** `components/sections/DashboardSection.tsx:286-291`
Each of the five rows renders `item.requiredAction`, which for nearly every CISA KEV entry is the identical string *"Apply mitigations in accordance with vendor instructions, ensuring compliance with CISA's BOD 26-04…"*. Verified: all five share an identical 80-char prefix. `line-clamp-2` means the clamp point is identical too, so the rows are visually indistinguishable.
**The data to fix this is already fetched.** `lib/abuse-ch.ts:14-21` defines `KEVItem` with `vulnerabilityName` and `shortDescription`; `app/api/threats/route.ts` simply doesn't project them into `recentKev`, and `KEVPreviewItem` in `DashboardSection.tsx:30-36` doesn't declare them.

**F2 — The "14-day CVE trend" chart is misleading.** `components/TrendAnalytics.tsx`, home + `/analytics`
NVD returns 100 records, nearly all published in the first two days of the window. The chart plots a decay from 100 to zero and then eleven flat days at zero. It reads as "vulnerability disclosures collapsed to zero," which is false — it's an artifact of a capped, partial result set. A chart that produces a confident wrong reading is worse than no chart. This is a *data-shape* problem, not a styling one.

**F3 — Filter toolbar labels are misaligned on `/threats`.**
Measured label baselines: Search `y=392`, Severity `y=379`, Exploitation `y=393`. The Severity label sits **13px higher** than its siblings. Cause: the "High & Critical" button carries `.control` (`min-height: 44px`) and its `!min-h-0` override is losing, so a 44px button inflates a `flex items-center justify-between` row that should be label-height.

**F4 — Sort toggle gives no visual feedback.** `/threats`
"Priority" has `aria-pressed="true"`, "Newest first" `aria-pressed="false"` — but computed `background-color`, `border-color`, **and** `color` are byte-identical between them. Screen-reader users get the state; sighted users cannot tell which sort is active.

**F5 — Breadcrumb is wrong on CVE detail pages.** `components/AppHeader.tsx:32-39,49`
`TITLES[pathname] ?? "Today"` — `/cve/[id]` isn't in the map, so every CVE detail page reads **"Briefing / Today."** No nav item shows as current either.

### P1

**F6 — Line measure is ~116 characters.** Home panels, `/news`
Story deks measure 695px at 12px → ≈116ch. Comfortable reading is 45–75ch. `.page-subtitle` already has `max-width: 60ch` — the constraint just wasn't applied to the content that needs it. **This finding becomes more urgent under WebTUI**, not less — see §7.

**F7 — Warnings and disclaimers are repeated 2–3× per view.**
`/threats`: banner "Showing a partial NVD result set" + "Showing 100 loaded CVEs · partial" + "Showing 100 of 100 CVEs".
Home map: caption above the panel, plus two more disclaimers inside it. Repeating a disclaimer doesn't make it more credible; it makes the honest voice read as nervous.

**F8 — The CVE card view is very low density.** ~135px per CVE, about four per screen on a register of 100.

**F9 — The table/card breakpoint sits mid-laptop.** `globals.css:196` — `@container (min-width: 61rem)`. Verified: 1440px viewport → table. 1248px → cards. Two very different layouts across a band covering a lot of real laptops.

**F10 — Analytics uses three different bar-chart treatments on one page.** Severity → semantic colors, no axis. Attack vector → all green, no axis. Vendor mentions → grey bars **with** an axis.

**F11 — "Top weakness types (CWE)" is eight big cards holding one number each**, with bare IDs and no names.

**F12 — Community feed has no visible ordering.** Items run 3d, 4d, 1d, 2d, 3d, 1d… Not recency, not points. No sort control.

**F13 — CVE detail page puts the longest text in the narrowest column.** "Required action" wraps to ~11 lines in a ~200px column while two date columns sit nearly empty.

### P2

**F14 — Pluralization bugs.** `HackerNewsFeed.tsx:109-110` ("1 points", "1 comments"); `ThreatMap.tsx:243` ("1 sampled records").
**F15 — Map markers are 9–18px**, below the 24px WCAG 2.2 target minimum, and they're the map's only interaction.
**F16 — No favicon, no Open Graph tags, no theme-color.** Links render bare in Slack, Discord, iMessage.
**F17 — 17 SVGs have no accessible name and no `aria-hidden`.**
**F18 — No `<footer>` landmark.** No attribution, no data-source credit.
**F19 — Google Fonts loaded via CSS `@import`** (`globals.css:1`). Render-blocking, no preconnect, `next/font` unused. **Blocks Wave 7** — WebTUI is font-dependent.
**F20 — Error state is quieter than the healthy state on `/sources`.** Filled green "OK" pills swamp muted "Error" pills.
**F21 — Redundant expand affordances** on CVE cards (chevron *and* "Details").
**F22 — `framer-motion` is a dependency** with zero active animations measured.

---

## 4. Implementation plan — Part A: fix what exists (Waves 1–5)

**Waves run in order; tasks within a wave run in parallel** except where ownership rules say otherwise.

### Critical coordination rules

> **`app/globals.css` has exactly one owner per wave.** Tasks needing CSS in a wave where they don't own it must hand their CSS to the owning task in their report rather than editing the file. Owners are marked **[CSS OWNER]**.
>
> **Every agent must run `npm run lint && npm run test && npm run build` before reporting done.**
>
> **No agent commits.** Kyle reviews and commits per wave.

Standard prompt preamble for every subagent:

```
Repo: /home/kyle/Projects/cyberdaily (Next.js 15, React 19, Tailwind 3, TypeScript)
Read docs/superpowers/plans/2026-09-17-frontend-design-improvements.md first —
sections 2 (Do not break these) and 3 (Findings) are binding constraints.

Do NOT: change :root color tokens in app/globals.css without re-running a
contrast check; delete partial-data or sampling disclaimers; remove aria-sort /
aria-pressed / sr-only captions / focus styles / the prefers-reduced-motion
block. Do NOT introduce WebTUI or any new visual direction — that is Wave 6+.

Edit only the files listed in your task. If you need a CSS change and you are
not the CSS owner for your wave, put the exact proposed CSS in your final
report instead of editing app/globals.css.

Before reporting done, run: npm run lint && npm run test && npm run build

Your task:
```

---

### Wave 1 — Correctness (P0) — ✅ COMPLETE (2026-09-17)

Verified by measurement against a production build with mocked upstream data
(the API routes call external services, so fixtures must match the real
`RiskScoredCVE` and `KEVItem` shapes — a mismatched fixture crashes the route
and looks exactly like a regression).

| Finding | Result |
| --- | --- |
| F1 KEV boilerplate | 5 rows, **5 distinct**, **0** containing the CISA boilerplate |
| F3 Toolbar misalignment | Search / Severity / Exploitation share one baseline (was 13px off) |
| F4 Sort toggle state | Active `rgb(23,51,41)` bg + accent border + inset ring; all three properties differ from inactive; **passes grayscale** |
| F5 CVE breadcrumb | Reads `Vulnerabilities / CVE-2026-85046`; Vulnerabilities current in sidebar and drawer |
| F14 Pluralization | No `1 points` / `1 comments` / `1 sampled records` anywhere |

Lint clean, **102 tests passing (up from 74)**, build green, bundle unchanged
(103 kB shared First Load JS). Mobile chips return to 44px; no horizontal scroll.

New modules: `lib/breadcrumb.ts`, `lib/nav-active.ts`, plus `plural()` and the
KEV formatters in `lib/format.ts`. New tests: `tests/breadcrumb.test.ts`,
`tests/navigation.test.ts`, and additions to `tests/format.test.ts`.

**Process note for later waves.** These five agents shared one working tree and
collided: one ran a `git reset` that wiped another's in-flight work, another hit
a duplicate `plural()` declaration, and concurrent `next build` runs raced on
`.next`. All recovered, but **give each agent its own git worktree from Wave 2
on**, and verify final state independently rather than trusting agent reports.
One agent also introduced a 132-line `package-lock.json` diff with no
`package.json` change, which was reverted before delivery — check the lockfile.

Original task table follows.

Five agents, fully parallel. No file overlap.

| # | Task | Files | Fixes |
|---|---|---|---|
| 1.1 | **Surface real KEV content.** Add `vulnerabilityName` and `shortDescription` to the `recentKev` projection; add both to `KEVPreviewItem`; render `vulnerabilityName` as the primary line, `vendorProject — product` as metadata, `shortDescription` (clamped) as the dek. **Drop `requiredAction` from the preview** — it belongs on the detail page, where it already is. | `app/api/threats/route.ts`, `components/sections/DashboardSection.tsx` | F1 |
| 1.2 | **Fix the toolbar alignment.** Make the quick-filter button's height override actually win (prefer a dedicated `.control-chip` class over fighting `.control` with `!important`). Verify the three column labels share a baseline at 1440px. **[CSS OWNER]** — also apply 1.3's CSS from its report. | toolbar component on `/threats`, `app/globals.css` | F3 |
| 1.3 | **Give the sort toggle a visible active state.** Drive styling off `aria-pressed` so state and appearance can't drift. Match the existing `.nav-link[aria-current]` treatment. Must survive a grayscale check. Hand CSS to 1.2. | sort control on `/threats` | F4 |
| 1.4 | **Fix the CVE detail breadcrumb and nav state.** Replace the `TITLES` lookup with a resolver handling dynamic routes: `/cve/[id]` → "Vulnerabilities / CVE-XXXX-XXXX". Make the Vulnerabilities nav item show `aria-current` on `/cve/*`. | `components/AppHeader.tsx`, `components/navigation.tsx` or `Sidebar.tsx` | F5 |
| 1.5 | **Fix pluralization.** Add a `plural()` helper in `lib/`; use it for points, comments, sampled records. Unit tests for 0/1/2. | `components/HackerNewsFeed.tsx`, `components/ThreatMap.tsx`, `lib/`, `tests/` | F14 |

---

### Wave 2 — Information design

**Task 2.1 runs first and alone** — it's a decision, and 2.2/2.3 depend on the answer.

### Wave 2 — ✅ COMPLETE (2026-09-17)

**2.1 decision: option (b) — replace with a question the data can answer.**

Root cause was worse than the review recorded. `buildDayBins()` in
`app/api/trends/route.ts` laid a contiguous 14-day range over bucketed CVEs and
filled every uncovered day with `count: 0`. There was a guard for *no* records in
window but none for **partial** coverage, which is the normal case — NVD returns
100 of ~8677 CVEs, clustered in ~2 days. Eleven of fourteen zeros were
"not sampled" rendered as "none published". This violated the README's own
Truthfulness guarantee that *"trend charts with missing data never auto-zero."*

`epssDistribution` and `riskBreakdown` were **already computed and returned** by
the route and never rendered — the same latent-data situation as F1.

| Finding | Result |
| --- | --- |
| F2 trend chart | Gone from `/` and `/analytics`; replaced by EPSS score distribution stating its own scope inline ("100 loaded CVEs, 100 EPSS scored"). `buildDayBins`/`dailyTrend`/`coverageNote` deleted; **zero dead references** remain |
| F10 chart grammar | All four distributions share one grammar — same bar height, track, label/value alignment, no axis anywhere. Severity keeps its semantic ramp; vendor mentions' axis-bearing recharts `BarChart` removed |
| F11 CWE section | Eight cards → ranked list with human-readable names (`lib/cwe-names.ts`, 20 IDs). Verified: `CWE-787 Out-of-bounds Write`, and `CWE-999999` falls back to the bare ID |
| F7 map disclaimers | 3 statements → **1**, inside the panel: "blocklist.de · category-balanced sample with IP geolocation, not a count of worldwide attacks." |
| F7 /threats warnings | 3 → 2 (static scope + live filter count). The word "Showing" appears **0** times. Distinct copy for all four states: complete / partial / unknown / nvdError |
| F12 community order | Recent (default) and Top toggles on both feeds, reusing Wave 1's `.control-chip` idiom. Verified: Recent sinks the undated item; Top ranks by points and sinks the null-score item below `0` |
| Heading order | `h1 → h3` skip on `/analytics` closed; all five chart headings now `h2` |
| Bonus | OSINT's lone "All" chip was derived from whatever subreddits the fetch returned; now sourced from the fixed monitored list — 9 real options |

Lint clean, **117 tests passing (up from 102)**, build green, no page errors, no
horizontal overflow at 375 / 1440 on any route.

**Diagnosed but deliberately not changed** (needs a decision, not a guess):
`lib/hn.ts` queries Algolia's relevance-ranked `/search` endpoint rather than
`/search_by_date`, and bounds by date without sorting by it — that is why the
live order tracked neither recency nor points. The route now sorts server-side,
but `hitsPerPage` is a constant of 20 inside `lib/hn.ts`, so weak 1–9 point items
still compete for those slots. The fetch window was widened 7 → 14 days as a
conservative improvement; this was a code-path judgement, **not measured**, since
the container has no egress to Algolia.

**Wave 9 input:** after this wave, `recharts` has no live consumer. Only
`components/ThreatSurface.tsx` still imports it, and that file is dead code —
not imported by any route. Task 9.2's "drop Recharts" option is now cheap.

**Process:** each agent ran in its own git worktree with zero file overlap. No
collisions, unlike Wave 1. Note that agent worktrees under `.claude/` pollute
ESLint's scope if not removed — lint reported 26,299 problems until they were
pruned, none of them from agent code.

---

**2.1 — Decide what the trend chart should be.** *(written recommendation + spike branch, no merge)*

Three candidates, evaluated against a real API response:

- **(a) Honest window.** Plot only days with actual coverage; label the axis with the true window. Cheapest.
- **(b) Change the question.** Replace "CVEs over time" — which the data can't answer — with one it can: severity mix, EPSS distribution, or KEV-listed share. Arguably strongest, **and the best fit for WebTUI later**, since all three render well as ASCII-style bars.
- **(c) Remove it**, promoting the Analytics severity breakdown to the home page.

**Kyle picks before Wave 2 continues.**

Then in parallel:

| # | Task | Files | Fixes |
|---|---|---|---|
| 2.2 | **Implement the 2.1 decision** on home and `/analytics`. If a chart survives, it states its true coverage inline, not in a separate warning box. | `components/TrendAnalytics.tsx`, `sections/DashboardSection.tsx`, `sections/AnalyticsSection.tsx` | F2 |
| 2.3 | **Unify chart grammar on `/analytics`.** One bar treatment across all three: same height, track, label/value alignment; axis on all or none. Severity keeps semantic colors; attack-vector and vendor share one neutral treatment. Reuse `.distribution-list`. **[CSS OWNER]** | `components/TrendAnalytics.tsx`, `app/globals.css` | F10 |
| 2.4 | **Rebuild the CWE section** as a compact ranked list using `.distribution-list` — ID (mono), **human-readable name**, count, proportion bar. Static `CWE_NAMES` map in `lib/`, falling back to the bare ID. | Analytics section, `lib/` | F11 |
| 2.5 | **Consolidate warnings.** One statement per fact per view. Do not weaken the honesty — state each caveat once, well. | `/threats` page + toolbar, `components/ThreatMap.tsx`, `sections/DashboardSection.tsx` | F7 |
| 2.6 | **Add ordering to the community feed.** Recency by default; Recent / Top toggle reusing 1.3's pattern. Consider a points floor or wider fetch window. | `components/HackerNewsFeed.tsx`, `OsintFeed.tsx`, maybe `app/api/hackernews/route.ts` | F12 |

---

### Wave 3 — ✅ COMPLETE (2026-09-17)

| Finding | Result |
| --- | --- |
| F6 measure | **70 actual characters per line** on all three prose surfaces (news dek, home dek, CVE required-action), down from 116 |
| F8 card density | A/B at identical 1024px width: **250px → 139px per card** (−44%), **3.6 → 6.5 cards** per 900px screen |
| F9 breakpoint | 61rem → **54rem**. Table now renders from ~1180px viewport (was ~1248px); no horizontal overflow at 375/768/1024/1180/1280/1366/1440/1512/1920 |
| F21 duplicate affordance | "Details" link removed — **0** remaining. Whole card is a click target via a delegated handler that bails on `closest("a, button")`, so **0** nested interactive elements and inner links keep native behaviour |
| F13 CVE detail | Required action moved out of a ~200px column to full width at **70 chars/line**; dates in a compact row. Copy button now reads "Copy ID" with `aria-label="Copy CVE ID to clipboard"` |

Keyboard verified in a real browser: the expand control is a `<button>`, Tab
reaches it, Enter and Space both toggle, `aria-expanded` flips. Lint clean, 117
tests passing, build green, no page errors, no mobile overflow on any route.

**The `ch` unit trap — read before touching `.prose-measure`.** The two agents
in this wave independently chose **68ch** and **45ch** for the same job, and
neither was right. CSS `ch` is the width of the "0" glyph, which in DM Sans
measures 0.637em, while an average character in running English text measures
0.499em. A `ch` cap therefore renders **~1.27x more characters than its number
suggests**: `68ch` was measured at **87** characters per line, well past the
45–75 band. The settled value is **55ch ≈ 70 characters**, applied through one
shared utility so every prose surface matches. Re-measure before changing it;
do not "correct" it back upward.

**Process lessons.**
1. **Commit before spawning worktree agents.** Worktrees branch from the last
   *commit*, not the working tree. Wave 3B was briefed that the CSS had landed,
   but its worktree predated the merge, so it never saw `.prose-measure` or the
   new breakpoint and had to work around both. It flagged this clearly, which is
   the only reason it was caught cheaply.
2. **Compare like with like.** Card height was first read as "139px vs a 135px
   baseline" — no improvement — because the 135px figure came from a different
   viewport in the original review. Rebuilding `origin/master` and measuring
   both at 1024px showed the real result: 250px → 139px. A density claim is
   meaningless without a same-width A/B.

Original task table follows.

### Wave 3 — Reading comfort & density

| # | Task | Files | Fixes |
|---|---|---|---|
| 3.1 | **Constrain measure and bump dek size.** Add `.prose-measure` (`max-width: 68ch`) on story deks, CVE summaries, KEV descriptions. Raise deks from 12px to 13–14px. Check every breakpoint. **[CSS OWNER]** | `app/globals.css`, `NewsFeed.tsx`, `news/NewsRow.tsx`, `sections/DashboardSection.tsx` | F6 |
| 3.2 | **Tighten CVE cards.** Collapse the gap before the metric row; EPSS / Exploitation / Published on one wrapping metadata line; whole card is the expand target and the **duplicate "Details" link goes**. Target ≥6 CVEs per 900px viewport at ≥13px. Hand CSS to 3.1. | `components/threats/CveTable.tsx` | F8, F21 |
| 3.3 | **Lower the table/card breakpoint** to ~52–54rem after confirming the table doesn't overflow with the existing `<colgroup>`. Verify at 1280/1366/1440/1512/1920. Hand CSS to 3.1. | `app/globals.css` (via 3.1), `CveTable.tsx` | F9 |
| 3.4 | **Rebalance the CVE detail layout.** Give "Required action" the wide column, dates the narrow one — the inverse of today. Clarify what "Copy" copies. | `app/(dashboard)/cve/[id]/CveDetailClient.tsx` | F13 |

---

### Wave 4 — ✅ COMPLETE (2026-09-18)

| Finding | Result |
| --- | --- |
| F19 next/font | `@import` replaced with self-hosted `next/font/google`, `display: swap`, latin subset. Weights cut 12 → 8 files (dropped 700 everywhere, and 400 for Space Grotesk). Every font-family selector verified resolving in a browser: DM Sans, JetBrains Mono, Space Grotesk — none fell back to system-ui |
| F16 favicon / OG | `link[rel*=icon]` **2**, `meta[property^="og:"]` **11**, `meta[name^="twitter:"]` **8**, `theme-color` **1**. `/icon` serves SVG, `/apple-icon` and `/opengraph-image` serve PNG, all 200 with `immutable, max-age=31536000` |
| F18 footer | Exactly **1** `<footer>` on every route, with data attribution and a link to `/sources`. No shell geometry regression |
| F15 map targets | Hit circles ≥24px behind each marker; visible radii unchanged |
| F20 source status | Error filled / OK quiet / Partial outlined. Contrast 8.67 : 10.44 : 7.01, distinguishable in grayscale |
| F17 decorative SVGs | 10 icons marked `aria-hidden` + `focusable="false"` |
| F22 framer-motion | Removed — zero imports, three packages dropped |

`npm run pages:build` passes, which is the one that matters for Cloudflare.

**Cloudflare needs icon/OG routes, not static files.** Next's static
`app/icon.svg` convention compiles to an internal Route Handler, and
`@cloudflare/next-on-pages` rejects any route that does not declare
`runtime = "edge"` — which a static file cannot. They are therefore small edge
routes serving pre-baked bytes from `app/_brand/og-assets.ts`, with no
per-request rendering.

**Tailwind opacity modifiers do not work on `ui-*` tokens.** Those colours are
plain `var(--cd-*)` values with no alpha channel, so Tailwind 3 cannot build the
variants: `bg-ui-accent` compiles, `bg-ui-accent/10` produces **nothing**.
Verified by grepping the compiled bundle. Six usages were inert and now use the
solid tokens that express the same intent (`--cd-accent-soft` is exactly
"accent at low opacity over canvas"). **The systemic fix — redefining tokens as
`rgb(var(--cd-*-rgb) / <alpha-value>)` — is deferred to Wave 7**, where the
token layer is reworked for WebTUI anyway.

**Correction to Wave 3's measure figure.** Wave 3 recorded 70 characters per
line. That measurement was taken while this sandbox had Google Fonts blocked,
so it measured a *fallback* face, not DM Sans. With the real webfont loaded,
`55ch` renders **81** characters — outside the comfortable band the whole task
was about. The cap is now **48ch**, measured against the real font at **71**
characters. Any future measure work must load the real webfont first; this is
the second time a `ch` value has been wrong for a non-obvious reason.

**Latent bug fixed in passing:** `DashboardSection.tsx` guarded `threats?.kev?.length`
on one line but `threats?.kev.slice(...)` on another, so a payload without `kev`
crashed the home page. Found because a test fixture omitted the field.

Original task table follows.

### Wave 4 — Polish & platform

| # | Task | Files | Fixes |
|---|---|---|---|
| 4.1 | **Favicon, OG tags, theme-color.** Favicon from the existing `.brand-mark` "cd" motif. Open Graph + Twitter card via the Next 15 Metadata API with a **static** OG image. Per-route titles. | `app/layout.tsx`, route `page.tsx` files, `app/icon.svg`, `app/opengraph-image.*` | F16 |
| 4.2 | **Adopt `next/font`.** Replace the `@import` at `globals.css:1` with `next/font/google`, `display: swap`, latin subset, self-hosted. Drop unused weights. Measure LCP before/after. **Prerequisite for Wave 7** — WebTUI is font-dependent, so this must land first. **[CSS OWNER]** | `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts` | F19 |
| 4.3 | **Enlarge map hit areas.** Keep visual marker size (it encodes magnitude); add a transparent ≥24px hit circle behind each. Keyboard navigation between markers. | `components/ThreatMap.tsx` | F15 |
| 4.4 | **Add a footer landmark** with data attribution (NVD, CISA KEV, FIRST EPSS, blocklist.de), a link to `/sources`, last-build time. Quiet — muted text, thin top border. Hand CSS to 4.2. | `app/(dashboard)/layout-client.tsx` | F18 |
| 4.5 | **Make errors louder than OK on `/sources`.** Invert emphasis using `--cd-critical`; group failing sources to the top. Not color alone — keep the text label. Hand CSS to 4.2. | `components/SourceHealthIndicator.tsx`, `app/(dashboard)/sources/page.tsx` | F20 |
| 4.6 | **Audit decorative SVGs.** `aria-hidden="true"` + `focusable="false"` on the 17 decorative icons; `<title>`/`aria-label` on informational ones. Check the header health dot has a name on mobile. | icon usages across `components/` | F17 |
| 4.7 | **Remove `framer-motion` if unused.** Confirm with a repo-wide search first. | `package.json`, `package-lock.json` | F22 |

---

### Wave 5 — ✅ COMPLETE (2026-09-18) — baseline locked

Three independent agents, none of which did any implementation work.

**All 22 findings re-measured: F1–F22 PASS.** Notable exact matches with zero
drift: contrast on the `/sources` pills at **8.67 / 10.44 / 7.01**, line measure
at **71** characters on all three prose surfaces, CVE cards at **139px**, map hit
targets at **26×26px**, sort-toggle states differing in four properties.

**Contrast sweep: zero WCAG AA failures across all seven routes.** This is the
project's best property and it survived four waves of change, including the new
coloured states (sort chips, filled error pills, chart bars, footer).

Regression sweep clean: 35 route × width cells with no horizontal overflow and
no page errors. Reduced motion genuinely takes effect — 383+ elements checked
per route, the map pulse collapses to 0.001ms. Skip link, expand control, and
drawer focus-restore all pass.

Bundle flat versus the pre-`next/font` baseline, correctly: Wave 2's recharts win
predates that commit, and Wave 4 changes how fonts load, not JS. The measurable
Wave 4 win is structural — the baseline's compiled CSS opens with a
render-blocking cross-origin `@import`; the current CSS has **8 same-origin
`@font-face` rules and zero external origins**. Fonts: 8 self-hosted woff2,
131 KiB, immutable. CLS 0.005 on `/` and 0.044 on `/news`, both well inside the
good band.

#### Verification found five defects. Four are fixed; one is outstanding.

The valuable part of this wave was not the green ticks — it was that probing
**malformed 200 responses** (rather than only error statuses) surfaced a whole
class of bug: code that assumes a fetch either succeeded in the expected shape
or threw, with no defence in between.

| # | Defect | Status |
| --- | --- | --- |
| 1 | `SourceHealthIndicator` had no `res.ok` check, so a 500 from `/api/sources` produced an empty list, no source read as "error", and the widget reported **"All sources operational"** during an outage of the health endpoint itself | **Fixed** |
| 2 | `ThreatForecast` likewise, plus `useState<Completeness>("complete")` as an optimistic initial value — so a failed first load asserted a **complete NVD result set** having loaded nothing. Initial state is now `"unknown"`, and a failed first load says so | **Fixed** |
| 3 | `TrendAnalytics` optional-chained `attackVectors` and `severityBreakdown` but not `epssDistribution`, `vendorMentions` or `topCWEs` — any 200 missing one took down the whole `/analytics` page. Four sites guarded (three `.map()`, one `.length` render guard) | **Fixed** |
| 4 | `CveDetailClient` gated on `data.cve !== null`, but the real failure mode is an **absent key**, and `undefined !== null` is true — so it took the found branch and passed `undefined` into `calculateRiskScore()` | **Fixed** |
| 5 | `MobileNavDrawer` forward focus wrap leaks one step: tabbing past the last nav link lands on `<body>` before self-correcting to the Close button on the next press. Reverse (Shift+Tab) wraps correctly. Repro: open the drawer at 375px, Tab 7 times from Close | **Outstanding** |

Defects 1 and 2 mattered most because they contradicted documented guarantees.
The README states the health indicator is *"derived from real source probes, not
a decorative 'Operational' badge"* — which was false in exactly the case that
matters. Both fixes were verified by reproducing the original failure and
confirming it no longer occurs, not by inspection.

**Environment limits, stated rather than papered over.** Google Fonts is
egress-blocked here, so builds use Next's documented `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`
hook with real font files from npm. A head-to-head LCP comparison against the
pre-`next/font` baseline would be meaningless — that tree's font fetch fails in
~250ms rather than costing real network time — so none was reported. The world
map's base geography (cdn.jsdelivr.net) also cannot load here; markers and the
country list render correctly regardless. `/sources` cannot show a live "OK"
state without egress, so its grayscale check covered Error and Partial only.

**Waves 1–5 are complete and the baseline is locked.** `recharts` remains in
`package.json` with one dead importer, `components/ThreatSurface.tsx` — a Wave 9
decision, unchanged.

Original checklist follows.

### Wave 5 — Verification

**One agent with fresh eyes** — not any agent that did implementation work.

1. **Regression sweep.** All six routes + a CVE detail page at 375/768/1280/1440/1920. Screenshot each. No horizontal scroll at any width.
2. **Re-run the contrast sweep.** Must still be zero AA failures.
3. **Grayscale check.** `/threats` and `/sources` desaturated — sort state and source status still distinguishable.
4. **Keyboard pass.** Skip link, visible focus, no traps, drawer traps and restores focus.
5. **Re-measure F1, F3, F5, F6, F8, F9.**
6. **Reduced motion** — nothing animates.
7. **Lighthouse** on home and `/threats`, before/after, reporting LCP and CLS deltas from 4.2.

Deliverable: a pass/fail table against F1–F22 with screenshots. **This is the baseline the WebTUI migration is measured against.**

---

## 5. WebTUI — assessment before committing

[WebTUI](https://webtui.ironclad.sh/) is MIT-licensed, ~2.4k stars, v0.1.9 (June 2026), actively maintained, with official Catppuccin / Gruvbox / Nord / Everforest / Vitesse themes. It's a real project, not a toy, and the direction is a good fit for a security dashboard.

**Your instinct to fix first and restyle second is the right call** — it means the migration restyles *correct* content instead of porting bugs forward. Concretely: F1's KEV boilerplate would look exactly as bad in ASCII boxes, and F2's chart would be just as misleading rendered as a TUI sparkline.

### The good news: you're closer than you think

The current design already has TUI DNA. `.eyebrow` is letter-spaced uppercase JetBrains Mono. `.brand-mark` is drawn with `border-block`. Every number is `tabular-nums`. `.distribution-list` is already, structurally, an ASCII bar chart — label, track, value in a fixed grid. The metric ledger is a character-grid layout in everything but name. Adopting WebTUI is an evolution of this design, not a replacement of it.

### Four real risks — and what I'd do about each

**Risk 1 — Monospace prose. This is the big one.**
WebTUI defaults `--font-family: monospace` and `--line-height: 1.3`. CyberDaily is a *reading* site: 125 news stories with deks, CVE descriptions running full paragraphs. Monospace is ~15–20% wider per character and measurably slower for continuous prose, and 1.3 line-height is cramped for anything longer than a label. Stack that on the existing 116-character measure (F6) and reading the news feed becomes genuinely unpleasant.

**Recommendation: go hybrid — and this is now the settled decision, see Wave 6 below.** Monospace for chrome, data, labels, IDs, metrics, status, table cells. **Keep DM Sans for prose.** This is what good TUI-*inspired* web design looks like, versus a literal terminal emulator.

**A correction to the framing above.** This section originally described the middle option as "hybrid, letting prose fill its box like a terminal would," treating a measure cap as the *less* authentic choice. That is backwards. **A terminal is 80 columns.** The TUI aesthetic *is* a measure cap; unbounded line length is a web habit, not a terminal one. Measured, DM Sans uncapped in this layout runs **178 characters at 1440px and 215 at 1920px** — worse than the 116 that produced finding F6 in the first place.

**Risk 2 — Your contrast advantage.**
Zero AA failures is the best property this site has, and it's the easiest thing to lose here. WebTUI's default ramp is 4 backgrounds + 3 foregrounds of essentially grayscale; the community themes (Gruvbox, Nord, Catppuccin) are tuned for terminals at 14–18px, not for 11px metadata on a web page. Several of their muted foregrounds will fail at your small sizes.

**Recommendation: don't adopt WebTUI's color defaults.** Map its variables *onto your existing validated tokens* — `--background0: var(--cd-canvas)`, `--foreground2: var(--cd-muted)`, and so on. You get WebTUI's component styling with a palette that already passes. Themes become an opt-in experiment behind a contrast gate, not the foundation.

**Risk 3 — WebTUI has no concept of severity.**
There is no critical/high/medium/low in its variable set. Your `--cd-critical` … `--cd-low` ramp is doing real semantic work on every CVE row, badge, and chart. It stays, and it needs to sit comfortably next to WebTUI's ramp rather than clashing with it.

**Risk 4 — Charts and the map won't come along.**
WebTUI styles DOM components. Recharts SVG output and the `react-simple-maps` world map are untouched by it. A crisp ASCII-bordered shell wrapped around glossy anti-aliased charts looks worse than either choice made consistently — this is the most common way a TUI redesign goes wrong. Wave 9 exists specifically for this, and it's where option (b) in task 2.1 pays off: severity mix and EPSS distribution render beautifully as character-grid bars, where a smooth time-series line does not.

**Also worth verifying in the spike:** Tailwind 3.4 does not emit native `@layer` the way Tailwind 4 does, so WebTUI's required `@layer base, utils, components` ordering needs checking against Tailwind's injection order before you rely on it. There's no official Tailwind interop guidance in WebTUI's docs. This is very likely fine — but confirm it in a spike rather than discovering it mid-migration.

### Recommended approach

**Layer WebTUI over your token system; don't replace it.** Adopt the box/border utilities and component styling, map its variables to your validated palette, keep your severity ramp and your prose face. **Pilot on `/sources` first** — it's the most terminal-native content on the site (status readouts, monospace already, tabular), it's self-contained, and it's the lowest-risk place to prove the approach before touching the news feed.

---

## 6. Implementation plan — Part B: WebTUI migration (Waves 6–10)

**Gate: do not start Wave 6 until Wave 5 signs off.** Tasks 4.2 (`next/font`) and 2.1 (chart decision) are hard prerequisites.

---

### Wave 6 — ✅ DECIDED (2026-09-18) — no spike needed

The spike was cancelled. Its only purpose was to choose a type direction from
screenshots, and that choice was made from measurement instead, which is both
cheaper and more decisive than looking at three renders.

**Measured font metrics (real webfonts loaded, `/news` at 1440px):**

| | Value |
| --- | --- |
| DM Sans, average character | 6.39px at 14px |
| JetBrains Mono, advance | 8.41px at 14px · 9.61px at 16px · 10.81px at 18px |
| **Mono vs sans width ratio** | **1.315×** |
| Prose column, capped | 460px → **72 characters** |
| Prose column, uncapped | 1136px at 1440 → **178 characters**; 1376px at 1920 → **215** |

**The three options, and what the numbers said:**

- **A — Full terminal.** Mono everywhere at WebTUI's 18px / 1.3. In mono, CSS
  `ch` *is* the character width, so today's `48ch` becomes literally 48
  characters — choppy, down from 72. Re-deriving to ~70ch grows the prose column
  from 460px to **757px (+65%)**. That fits `/news` but **breaks the home page's
  right-hand KEV column** (~370px → 34 characters), forcing a re-layout of the
  briefing grid. Upside: font payload would fall from 3 families / 8 files /
  131 KiB to roughly 3 files and ~50 KiB.
- **B — Terminal chrome, sans prose. ← CHOSEN.** Mono for everything structural;
  DM Sans for deks and descriptions at the existing 72-character measure.
- **C — Split by surface.** `/threats`, `/analytics`, `/sources` full terminal;
  `/news` and `/community` hybrid. Most visually committed without wrecking the
  reading pages, but two type systems to maintain and a visible seam when
  navigating between them — the site would read as two designs.

**Why B.** Not only for safety. The thing that will actually make CyberDaily look
like a TUI is the box-drawing, the borders, the status chrome and character-grid
alignment — **not the body face**. Mono already does the data work here. And B is
not a type migration at all: the three-face split that Wave 4 locked in *is*
option B, so WebTUI adds a box/border/component layer on top of a type contract
that does not move. It is the only option where the 48ch cap, the 71-character
measure, the card density and the contrast record all need no re-derivation —
Waves 3–5 survive intact.

**Consequences for the waves below:**

1. **No type changes.** `--font-family`, `--font-size` and `--line-height` are
   NOT taken from WebTUI's defaults (18px / monospace / 1.3). The existing
   16px / DM Sans / 1.6 for prose stays, as does `.prose-measure` at 48ch.
   Wave 7 must set WebTUI's font variables to the existing faces, not inherit.
2. **`.prose-measure` is load-bearing and stays.** See its comment in
   `globals.css` — it has been wrong twice for non-obvious reasons.
3. **Wave 8 gains a layout option instead of a type one.** If B does not feel
   "terminal" enough once the boxes land, the next lever is *not* the body face —
   it is tightening panel widths to multiples of the mono advance so the layout
   sits on a real character grid. Cheap once the boxes are in; decide after
   seeing Wave 8.

**Still unverified and must be checked first in Wave 7:** Tailwind 3.4 does not
emit native `@layer` the way Tailwind 4 does, so WebTUI's required
`@layer base, utils, components` ordering needs checking against Tailwind's
injection order. WebTUI's docs carry no Tailwind interop guidance. Likely fine;
confirm before building on it.

**Also still true from the risk list above:** do not adopt WebTUI's colour
defaults (map them onto the validated `--cd-*` tokens), keep the severity ramp,
and expect the charts and map to need their own pass in Wave 9.

**Pilot on `/sources` first** — the most terminal-native content on the site,
self-contained, and the lowest-risk place to prove the approach before touching
the news feed.

---

### Wave 7 — ✅ COMPLETE (2026-09-18) — foundation landed, zero visual change

`@webtui/css@0.1.10` + `postcss-import` are in. Only `dist/base.css` and
`dist/utils/box.css` are imported; **none of the 20 component stylesheets** —
those land per surface in Wave 8.

**Pixel-verified identical.** Every route screenshotted before and after with the
clock frozen, plus a control screenshotting the *same* build twice to prove the
harness was deterministic:

| Route | control (same build ×2) | before vs after |
| --- | --- | --- |
| `/`, `/news`, `/threats`, `/analytics`, `/sources`, `/cve/[id]` | **0%** | **0%** |
| `/community` | 0.0001% | 0.0038% |

`/community`'s variance appears in the **control too**, which is what identifies
it: the footer's server-rendered build timestamp rolls a minute between two
server starts. The changed region was an 8×9px box — one digit glyph. Not CSS.

#### The one lesson worth carrying into Wave 8

`dist/base.css` contains six declarations that would each break something here.
Four resolved themselves for free, and **two did not** — and the difference
between those groups is the whole lesson:

| `base.css` declaration | Outcome |
| --- | --- |
| `--font-family: monospace` | Project won — unlayered `body{}` beats `@layer base` |
| `--line-height: 1.3` | Project won — same |
| `body,html{background-color:var(--background0)}` (→ #fff) | Project won — same |
| `*{outline:none}` | Project won — unlayered `:focus-visible` beats it. §2 constraint 3 intact |
| `body,html{word-break:break-all}` | **LEAKED** — neutralised explicitly |
| `body,html{font-variant-ligatures:common-ligatures}` | **LEAKED** — neutralised explicitly |

Tailwind 3.4 emits **unlayered** CSS, and unlayered declarations outrank every
named layer regardless of specificity. That is why four hazards died on contact.
But it only protects properties **the project already sets**. `word-break` and
`font-variant-ligatures` had no competing declaration, so WebTUI applied
unopposed. The ligature leak mattered more than it looks: JetBrains Mono ships
programming ligatures, so it silently rewrote how `->`, `!=` and `==` render in
every mono surface — CVE IDs, EPSS values, timestamps, source readouts.

**Wave 8 must not assume "unlayered Tailwind protects us."** Every WebTUI
component property this project does not already declare is a live landmine.
Diff computed styles before and after importing each component stylesheet.

#### Other findings Wave 8 needs

- **`postcss-import` is required, not optional.** Without it Next's css-loader
  resolves the `@import` as a separate webpack module, and Tailwind's plugin
  then errors on `base.css` in isolation with "`@layer base` is used but no
  matching `@tailwind base` directive is present". It must run **before**
  `tailwindcss` in `postcss.config.mjs`. Not documented by WebTUI.
- **Use the literal `dist/` path.** `@import "@webtui/css/base.css"` fails —
  postcss-import's resolver does not honour the package's `exports` map. Use
  `@webtui/css/dist/base.css`.
- **`box.css` draws its border on an absolutely-positioned `:before` at
  `z-index:-1`**, with `padding: 1lh 1ch` on the box. `1ch`/`1lh` resolve against
  the *box's own font*, so character-grid padding only aligns where the box's
  font context is mono. Under option B a box wrapping prose inherits DM Sans.
  Decide per surface in Wave 8.
- `--box-border-color` defaults to `var(--foreground0)` — remapped to
  `--cd-border`, or every box border would render in body-text colour.
- **Lockfile care:** `pages:build` rewrites `package-lock.json` as a side effect.
  Revert *that* churn, but do not blanket-revert the file or the real dependency
  additions go with it.

**Variable mapping (the contract):** `--background0..3` → `--cd-canvas`,
`--cd-sidebar`, `--cd-surface`, `--cd-raised`; `--foreground0..2` → `--cd-text`,
`--cd-secondary`, `--cd-muted`; `--box-border-color` → `--cd-border`;
`--font-family`/`--font-size`/`--line-height` → the project's DM Sans / 16px /
1.6, explicitly **not** WebTUI's monospace / 16px / 1.3. `data-webtui-theme="dark"`
is set on `<html>`. The `--cd-*` tokens themselves are untouched.

CSS bundle +2.9 KB (+8.8%). No JS added. 117 tests, lint, build and
`pages:build` all pass.

Original brief follows.

### Wave 7 — Foundation *(sequential — one agent, single owner of `globals.css`)*

**7.1 — Land the WebTUI foundation.** No component migration yet; the site should look essentially unchanged when this ships.

- Add the dependency and layer declarations. **Verify the `@layer base, utils, components` order composes with Tailwind 3.4's injection order before building on it** — this was going to be checked in the cancelled spike, so it is unverified and belongs here, first.
- Import only the component stylesheets actually needed — start from box/border utilities plus the components `/sources` requires, and add more only when a surface needs them.
- **Map WebTUI variables to `--cd-*` tokens** in `:root`. This mapping is the contract every later wave depends on — comment it thoroughly.
- **Set `--font-size`, `--font-family` and `--line-height` explicitly to the existing faces — do NOT inherit WebTUI's 18px / monospace / 1.3.** Option B keeps 16px / DM Sans / 1.6 for prose and the existing mono for data. Inheriting the defaults here is the single easiest way to accidentally ship option A.
- Wire `data-webtui-theme` on `<html>`, consistent with the existing `color-scheme: dark`.
- **Ship with zero visual change**, or document every intentional difference.

Acceptance: full contrast sweep still zero AA failures. Full Wave 5 regression sweep still passes.

---

### Wave 8 — Component migration *(parallel, strict file ownership)*

One agent per surface. **No agent touches `globals.css`** — shared CSS goes to 8.0.

| # | Surface | Files |
|---|---|---|
| 8.0 | **Shared CSS owner.** Collects proposed CSS from 8.1–8.5, resolves conflicts, lands it. Also converts `.panel` / `.panel-header` / `.panel-body` to WebTUI box utilities, since every surface depends on them. **[CSS OWNER]** | `app/globals.css` |
| 8.1 | **Shell** — sidebar, header, mobile drawer, footer. Nav items keep their `aria-current` treatment. | `Sidebar.tsx`, `AppHeader.tsx`, `MobileNavDrawer.tsx`, `navigation.tsx`, `layout-client.tsx` |
| 8.2 | **Sources page** — port the merged version of the 6.1 spike. | `app/(dashboard)/sources/page.tsx`, `SourceHealthIndicator.tsx` |
| 8.3 | **Vulnerabilities** — table and card views, toolbar, badges. **Preserve `aria-sort`, `aria-pressed`, the `sr-only` caption, the container query and its Wave 3 threshold, and the severity color ramp.** | `threats/CveTable.tsx`, `threats/CveDetails.tsx`, `ui/SeverityBadge.tsx`, `ThreatSurface.tsx` |
| 8.4 | **News & community feeds.** Apply the 6.1 type decision. **Keep the 68ch measure cap from 3.1.** | `NewsFeed.tsx`, `news/NewsRow.tsx`, `news/NewsToolbar.tsx`, `HackerNewsFeed.tsx`, `OsintFeed.tsx` |
| 8.5 | **Dashboard & CVE detail** — metric ledger, KEV previews, detail readout, copy button. | `sections/DashboardSection.tsx`, `cve/[id]/CveDetailClient.tsx`, `ui/CopyButton.tsx` |

Every agent reports: screenshots at 1440 + 375, and confirmation that no §2 constraint regressed.

---

### Wave 9 — Charts and map *(the hard part — do not skip)*

| # | Task | Files |
|---|---|---|
| 9.1 | **Convert distribution charts to character-grid bars.** `.distribution-list` is already 90% there — take it the rest of the way with block characters or WebTUI box borders. Covers severity breakdown, attack vector, CWE list, vendor mentions. **Severity keeps its semantic colors.** | `TrendAnalytics.tsx`, `ui/DistributionList.tsx`, CSS → 9.0 owner |
| 9.2 | **Decide Recharts' future.** Post-2.1, there may be little left that needs it. If the surviving charts render as character-grid bars, **drop Recharts entirely** — a meaningful bundle win and a consistency win. If something genuinely needs it, restyle it to match: square corners, no gradients, no anti-aliased curves, mono tick labels, palette from the mapped tokens. | `TrendAnalytics.tsx`, `package.json` |
| 9.3 | **Restyle the world map.** `react-simple-maps` output styled to sit beside TUI chrome: flat fills, square markers or block glyphs instead of circles, mono labels. **Keep the ≥24px hit areas from 4.3.** If it can't be made to sit comfortably, say so and propose a text-first alternative (the country distribution list already carries the same information). | `ThreatMap.tsx` |

---

### Wave 10 — Final verification *(fresh eyes, not a Wave 7–9 agent)*

Re-run **all seven Wave 5 checks** and additionally:

1. **Contrast sweep against the final theme** — every route, both the mapped tokens and any theme plugin in use. Zero AA failures is the bar, same as before.
2. **Prose readability check.** Measure ≤75ch everywhere; confirm the type decision holds up on a long CVE description and a full `/news` scroll.
3. **Visual consistency audit.** Screenshot every route side by side. Any surface that still reads as "pre-migration" gets named. **Specifically check that charts and map don't look pasted in.**
4. **Bundle-size delta** vs. the Wave 5 baseline: WebTUI CSS added, Recharts and framer-motion removed if dropped.
5. **Lighthouse** vs. the Wave 5 baseline. A TUI aesthetic should be *lighter* — if LCP or CLS regressed, that's a bug.
6. **Grayscale check**, again — ASCII borders can mask state changes that used to read through color.

Deliverable: before/after screenshots per route, a pass/fail table, and an explicit statement on whether the site is visually coherent end to end.

---

## 7. Sequencing

| Wave | Agents | Gate |
|---|---|---|
| ✅ 1 — Correctness | 5 | **Complete 2026-09-17** |
| ✅ 2.1 — Chart decision | 1 | **Complete — option (b) chosen** |
| ✅ 2.2–2.6 — Info design | 3 | **Complete 2026-09-17** |
| ✅ 3 — Density | 3 | **Complete 2026-09-17** |
| ✅ 4 — Polish | 4 + direct | **Complete 2026-09-18** |
| ✅ 5 — Verification | 3 | **Complete 2026-09-18 — baseline locked** |
| ✅ 6 — Type decision | 0 (decided from measurement) | **Complete — option B chosen** |
| ✅ 7 — Foundation | 1 | **Complete 2026-09-18 — pixel-identical** |
| 8 — Components (8.0 owns CSS) | 6 | Kyle reviews + commits |
| 9 — Charts & map | 3 | Kyle reviews + commits |
| 10 — Final verification | 1 | Ship |

Wave 1 alone closes every P0 and is worth shipping on its own. **Waves 1–5 stand on their own merits** — if the 6.1 spike comes back unconvincing, stopping there still leaves the site materially better.

---

## 8. Deferred

Not scoped here, listed so they aren't lost:

- Loading states are plain text (`state-panel`); skeletons matching final layout would reduce shift. **Worth revisiting after Wave 8** — TUI skeletons (block characters, blinking cursor) are a natural fit.
- `/news` renders all 125 stories at once — no pagination or virtualization.
- No `<time datetime>` on relative timestamps ("3h ago") — machine-unreadable.
- Home has no "as of" timestamp for the data itself; the header clock is page-load time, a subtly different thing.
- WebTUI's Nerd Font plugin could replace the current SVG icon set — evaluate after Wave 8, and only if it doesn't reintroduce F17's unlabeled-icon problem.

---

## 9. One-line summary

The design is good and the accessibility work is above average — what's holding the site back is that several panels spend premium screen space saying very little, and in two places (KEV boilerplate, the trend chart) they say something actively unhelpful. Fix that first, then WebTUI is a natural evolution of a design that already has TUI instincts — provided you keep your prose face, your contrast, and your severity colors.

---

**Sources:** [WebTUI docs](https://webtui.ironclad.sh/start/intro/) · [WebTUI on GitHub](https://github.com/webtui/webtui) · [@webtui/css on npm](https://www.npmjs.com/package/@webtui/css)
