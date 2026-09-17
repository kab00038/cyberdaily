# CyberDaily — Project Handoff

**Last updated:** 2026-09-17

Start here if you are picking this project up. For what the app *is* and what
every page, route, and data source does, read [`README.md`](README.md) — it is
the authoritative description and is kept current.

---

## Current state

CyberDaily is **built and deployed**, not in progress.

- **Live:** https://cyberdaily.pages.dev (Cloudflare Pages)
- **Repo:** https://github.com/kab00038/cyberdaily
- **Stack:** Next.js 15.5 App Router, React 19, TypeScript 5, Tailwind CSS 3
- **Routes:** six pages (`/`, `/news`, `/threats`, `/community`, `/analytics`,
  `/sources`) plus `/cve/[id]`, and eight Edge API routes
- **Tests:** 102 across 8 Vitest files, all passing
- **Build:** clean (`npm run lint && npm run test && npm run build`)

## Quick start

```bash
npm ci
npm run dev          # http://localhost:3000
npm test             # Vitest
npm run lint         # ESLint
npx tsc --noEmit     # type-check
npm run build        # production build
```

Optional: set `GROQ_API_KEY` in `.env.local` for AI news summaries. Without it
the news endpoint serves RSS immediately and enrichment is skipped. `NVD_API_KEY`
raises the NVD rate limit but is not required.

Deploy: `npm run pages:build && npm run pages:deploy`.

## Active work

Frontend design work is tracked in
[`docs/superpowers/plans/2026-09-17-frontend-design-improvements.md`](docs/superpowers/plans/2026-09-17-frontend-design-improvements.md).
That plan is the current source of truth for what is being changed and why. It
contains a design review (22 findings, F1–F22), binding constraints in section 2,
and a ten-wave implementation plan.

**Wave 1 (correctness) is complete.** Waves 2–5 fix information design, reading
density, and platform polish. Waves 6–10 migrate the visual system to
[WebTUI](https://webtui.ironclad.sh/) for a terminal-UI aesthetic.

Before changing anything in the frontend, read section 2 of that plan — several
properties of this codebase are deliberate and are easy to destroy by accident:

- The color palette passes WCAG AA with **zero failures**. Re-run a contrast
  sweep if you touch the `:root` tokens in `app/globals.css`.
- Partial-data and sampling disclaimers are load-bearing, not filler. The
  project's stated goal is that nothing reads as larger or fresher than it is.
- Accessibility work already in place: one `h1` per page, clean heading order,
  skip link, `:focus-visible`, 44px touch targets, `aria-sort`, `aria-pressed`,
  `sr-only` table caption, and a `prefers-reduced-motion` block.

## Working with agents

Waves are run by subagents, one wave at a time, with the site kept working after
each. Two rules learned the hard way:

1. **Give each agent its own git worktree.** Agents sharing one checkout will
   race each other's builds and, in at least one case, `git reset` away another
   agent's work.
2. **One owner for `app/globals.css` per wave.** Every other agent in that wave
   hands its CSS to the owner in its report instead of editing the file.

Verify agent work by measurement against a running build, not by reading the
agent's report. The API routes call external services, so local verification
needs mocked responses matching the real `RiskScoredCVE` and `KEVItem` shapes.

## Historical documents

These are point-in-time records from the original build. They describe an
earlier design and stack and are **superseded** — do not implement from them:

| File | Status |
| --- | --- |
| `docs/superpowers/specs/2026-09-03-cyberdaily-design.md` | Superseded — original design spec (Next.js 14, neon `#00ff88`, monospace body) |
| `docs/superpowers/plans/2026-09-03-cyberdaily-implementation.md` | Superseded — original 12-task build plan, completed |

The shipped design deliberately moved away from the neon-on-black direction in
the original spec toward the calmer editorial system described in the README.
