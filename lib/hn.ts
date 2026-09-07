// lib/hn.ts — Hacker News fetcher using the Algolia search API.
//
// Two modes are supported via `mode`:
//   - "latest": date-bounded relevance search (newest matches first)
//   - "top":    classic relevance search ordered by points (Top this week)
//
// The mode must be respected by both the upstream query and any client-side
// reordering — calling site of the latest mode should not sort by points.
import { parseTimestamp } from "./format";

export interface HNStory {
  title: string;
  url: string;
  points: number;
  comments: number;
  /**
   * RFC-3339 timestamp reported by Algolia. `null` if not parseable.
   * Use `formatPublishedAt()` in the UI; do not synthesize timestamps.
   */
  publishedAt: string | null;
  hnUrl: string;
}

interface HNHit {
  title: string;
  url?: string;
  points: number;
  num_comments: number;
  created_at: string;
  objectID: string;
}

export type HNMode = "latest" | "top";

const SECONDS_IN_DAY = 86_400;
const HN_HITS_PER_PAGE = 20;

function buildQueryUrl(query: string, mode: HNMode, days?: number): string {
  const params = new URLSearchParams({
    query,
    tags: "story",
    hitsPerPage: String(HN_HITS_PER_PAGE),
  });

  if (mode === "latest" && typeof days === "number" && days > 0) {
    // numericFilters expects an array; Algolia supports created_at_i >=
    const sinceUnix = Math.floor(Date.now() / 1000) - days * SECONDS_IN_DAY;
    params.append("numericFilters", `created_at_i>=${sinceUnix}`);
  }

  return `https://hn.algolia.com/api/v1/search?${params.toString()}`;
}

export async function fetchHackerNewsStories(
  mode: HNMode = "latest",
  options: { days?: number; query?: string } = {}
): Promise<HNStory[]> {
  const query = options.query ?? "cybersecurity";
  const days = options.days ?? (mode === "latest" ? 7 : undefined);
  const url = buildQueryUrl(query, mode, days);

  try {
    const response = await fetch(url, {
      next: { revalidate: 900 }, // 15 min cache
    });

    if (!response.ok) throw new Error(`HN API error ${response.status}`);

    const data = (await response.json()) as { hits?: HNHit[] };
    const hits = Array.isArray(data.hits) ? data.hits : [];

    return hits.map((hit) => {
      const ts = parseTimestamp(hit.created_at);
      return {
        title: hit.title,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        points: hit.points,
        comments: hit.num_comments,
        publishedAt: ts === null ? null : new Date(ts).toISOString(),
        hnUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      };
    });
  } catch (error) {
    console.error("Error fetching HN stories:", error);
    return [];
  }
}
