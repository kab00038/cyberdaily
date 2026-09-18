// app/api/hackernews/route.ts
import { NextResponse } from "next/server";
import { fetchHackerNewsStories } from "@/lib/hn";
import type { SourceStatus } from "@/lib/sources";

export const runtime = "edge";

// `fetchHackerNewsStories("latest", …)` hits Algolia's `/api/v1/search`
// endpoint (relevance-ranked) with a `created_at_i` lower bound — not
// `/api/v1/search_by_date` (chronological). Bounding by date does not make
// the result chronological: Algolia still returns its top `hitsPerPage`
// (20) hits by relevance within that window, which is why the live site's
// order (3d, 4d, 1d, 2d, 3d, 1d, 4d, 5d, 6d, 1d) tracks neither recency nor
// points. This route now imposes an explicit order itself rather than
// trusting upstream ordering (see below).
//
// The narrow 7-day window is also why the surfaced points are weak (1-9):
// with only 20 hits returned per request regardless of window size, a
// 7-day pool of "cybersecurity"-tagged submissions is small and mostly
// low-traffic blog posts that happen to match the query text. Widening the
// window to 14 days gives Algolia's relevance ranking (and this route's own
// "Top" ordering) a larger pool to draw from without adding a second
// upstream request or changing the cache cadence below. Going wider still,
// or raising `hitsPerPage`, would likely help further, but `hitsPerPage` is
// a constant inside lib/hn.ts (not owned by this task) — flagged as a
// follow-up rather than changed silently.
const HN_WINDOW_DAYS = 14;

export async function GET() {
  try {
    const generatedAt = new Date().toISOString();
    const stories = await fetchHackerNewsStories("latest", {
      days: HN_WINDOW_DAYS,
    });
    const items = stories
      .map((story) => ({
        title: story.title,
        url: story.url,
        points: story.points,
        comments: story.comments,
        publishedAt: story.publishedAt,
        hnUrl: story.hnUrl,
      }))
      // Explicit default order: newest first. An item with no parseable
      // date sinks to the bottom instead of sorting as "now" — it never
      // displaces genuinely dated stories. The client's "Top" toggle
      // re-sorts this same payload by points; this default only governs
      // what "Recent" (and any non-JS consumer of this API) sees.
      .sort((a, b) => {
        const aTs = a.publishedAt ? Date.parse(a.publishedAt) : NaN;
        const bTs = b.publishedAt ? Date.parse(b.publishedAt) : NaN;
        const aValid = Number.isFinite(aTs);
        const bValid = Number.isFinite(bTs);
        if (aValid && !bValid) return -1;
        if (!aValid && bValid) return 1;
        if (!aValid && !bValid) return 0;
        return bTs - aTs;
      });
    const sourceMeta: SourceStatus[] = [
      {
        id: "hacker-news",
        label: "Hacker News (Algolia)",
        category: "community",
        status: items.length > 0 ? "ok" : "error",
        lastSuccessfulFetchAt: items.length > 0 ? generatedAt : null,
        upstreamUpdatedAt: items[0]?.publishedAt ?? null,
        count: items.length,
        message: items.length > 0 ? undefined : "No stories returned",
      },
    ];
    return NextResponse.json(
      { items, generatedAt, sourceMeta },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=450",
        },
      }
    );
  } catch (error) {
    console.error("HN API error:", error);
    return NextResponse.json({ error: "Failed to fetch HN stories" }, { status: 500 });
  }
}
