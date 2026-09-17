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
5. Until Wave 6, **no new visual direction** — no ASCII borders, no theme swaps, no monospace-everywhere. Waves 1–5 fix what exists.

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

### Wave 3 — Reading comfort & density

| # | Task | Files | Fixes |
|---|---|---|---|
| 3.1 | **Constrain measure and bump dek size.** Add `.prose-measure` (`max-width: 68ch`) on story deks, CVE summaries, KEV descriptions. Raise deks from 12px to 13–14px. Check every breakpoint. **[CSS OWNER]** | `app/globals.css`, `NewsFeed.tsx`, `news/NewsRow.tsx`, `sections/DashboardSection.tsx` | F6 |
| 3.2 | **Tighten CVE cards.** Collapse the gap before the metric row; EPSS / Exploitation / Published on one wrapping metadata line; whole card is the expand target and the **duplicate "Details" link goes**. Target ≥6 CVEs per 900px viewport at ≥13px. Hand CSS to 3.1. | `components/threats/CveTable.tsx` | F8, F21 |
| 3.3 | **Lower the table/card breakpoint** to ~52–54rem after confirming the table doesn't overflow with the existing `<colgroup>`. Verify at 1280/1366/1440/1512/1920. Hand CSS to 3.1. | `app/globals.css` (via 3.1), `CveTable.tsx` | F9 |
| 3.4 | **Rebalance the CVE detail layout.** Give "Required action" the wide column, dates the narrow one — the inverse of today. Clarify what "Copy" copies. | `app/(dashboard)/cve/[id]/CveDetailClient.tsx` | F13 |

---

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

**Recommendation: go hybrid.** Monospace for chrome, data, labels, IDs, metrics, status, table cells — everything that's already mono plus the new TUI furniture. **Keep DM Sans for prose** — deks, descriptions, summaries. This is what good TUI-*inspired* web design looks like, versus a literal terminal emulator. If you want to try full-mono, the spike (6.1) is where to find out, not production.

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

### Wave 6 — Spike and decide *(one agent, no merge to main)*

**6.1 — WebTUI proof-of-concept on `/sources`.** Branch only, not merged.

Deliverables:

1. Install `@webtui/css`, wire the `@layer base, utils, components` order, and **verify it composes with Tailwind 3.4's injection order.** Document what you find.
2. Rebuild `/sources` using WebTUI box utilities and components, with all WebTUI color variables mapped to the existing `--cd-*` tokens. **Do not adopt WebTUI's default palette.**
3. Produce **three variants of the `/news` feed** for a type decision: (a) full monospace at WebTUI defaults, (b) hybrid — mono chrome, DM Sans prose, (c) hybrid with measure capped at 68ch. Screenshot all three at 1440 and 375.
4. Run the contrast sweep on every variant. Report every pair that fails AA.
5. Report bundle-size delta and which component stylesheets are actually needed.
6. Flag anything in §2's constraints that WebTUI makes difficult.

**Kyle decides from the screenshots: type direction, theme, and whether to proceed.** Nothing merges from this wave.

---

### Wave 7 — Foundation *(sequential — one agent, single owner of `globals.css`)*

**7.1 — Land the WebTUI foundation.** No component migration yet; the site should look essentially unchanged when this ships.

- Add the dependency and layer declarations, in the order verified in 6.1.
- Import only the component stylesheets 6.1 identified as needed.
- **Map WebTUI variables to `--cd-*` tokens** in `:root`. This mapping is the contract every later wave depends on — comment it thoroughly.
- Set `--font-size`, `--font-family`, `--line-height` per the 6.1 type decision (note WebTUI defaults to 18px/monospace/1.3; your current base is 16px/DM Sans/1.6 — reconcile deliberately, don't inherit by accident).
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
| 2.1 — Chart decision | 1 | **Kyle picks a direction** |
| 2.2–2.6 — Info design | 5 | Kyle reviews + commits |
| 3 — Density (3.1 owns CSS) | 4 | Kyle reviews + commits |
| 4 — Polish (4.2 owns CSS) | 7 | Kyle reviews + commits |
| 5 — Verification | 1 | **Baseline locked** |
| 6.1 — WebTUI spike | 1 | **Kyle picks type direction + theme, or stops here** |
| 7 — Foundation | 1 | Zero visual change confirmed |
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
