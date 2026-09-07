// lib/osint.ts — Reddit cybersecurity subreddit OSINT feed.
//
// Engagement counts are extracted from RSS content heuristically and must
// be treated as best-effort hints, not ground truth. The previous version
// defaulted missing values to 0 and used them as a popularity sort key —
// that biased the feed toward earlier subreddits. This version sorts by
// real publication time first and surfaces engagement as nullable metadata.
import { XMLParser } from "fast-xml-parser";
import { parseTimestamp } from "./format";

export interface OsintPost {
  title: string;
  url: string;
  source: string;
  score: number | null;
  comments: number | null;
  /**
   * RFC-3339 timestamp reported by the Reddit feed, or `null` when not
   * parseable. Do not substitute a fetch-time placeholder.
   */
  publishedAt: string | null;
  subreddit: string;
  flair: string | null;
}

const rssParser = new XMLParser({ ignoreAttributes: false });

const SUBREDDITS = [
  "netsec",
  "cybersecurity",
  "Malware",
  "ReverseEngineering",
  "AskNetsec",
  "computerforensics",
  "infosec",
  "hacking",
];

function extractEngagement(content: string): { score: number | null; comments: number | null } {
  const scoreMatch = content.match(/(\d+)\s*points?/i);
  const commentsMatch = content.match(/(\d+)\s*comments?/i);
  return {
    score: scoreMatch ? parseInt(scoreMatch[1], 10) : null,
    comments: commentsMatch ? parseInt(commentsMatch[1], 10) : null,
  };
}

async function fetchSubredditRSS(sub: string): Promise<OsintPost[]> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/.rss?limit=15`, {
      headers: {
        "User-Agent": "CyberDaily/1.0 (Cybersecurity News Aggregator)",
      },
      next: { revalidate: 900 },
    });

    if (!res.ok) {
      console.error(`Reddit RSS r/${sub} returned ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const doc = rssParser.parse(xml) as { feed?: { entry?: unknown } };
    const entries = doc?.feed?.entry ?? [];
    const entriesArray = Array.isArray(entries) ? entries : [entries];

    return entriesArray.map((entry) => {
      const e = entry as Record<string, unknown>;
      const titleRaw = e.title as { "#text"?: string } | string | undefined;
      const title =
        (typeof titleRaw === "object" && titleRaw?.["#text"]) ||
        (typeof titleRaw === "string" ? titleRaw : "Untitled");

      const linkRaw = e.link as { "@_href"?: string } | string | undefined;
      const url =
        (typeof linkRaw === "object" && linkRaw?.["@_href"]) ||
        (typeof linkRaw === "string" ? linkRaw : (e.id as string) || "#");

      const publishedRaw = (e.published ?? e.updated) as string | undefined;
      const ts = parseTimestamp(publishedRaw);

      const contentRaw = e.content as { "#text"?: string } | string | undefined;
      const content =
        (typeof contentRaw === "object" && contentRaw?.["#text"]) ||
        (typeof contentRaw === "string" ? contentRaw : (e.summary as string) || "");
      const engagement = extractEngagement(content);

      return {
        title,
        url,
        source: `r/${sub}`,
        score: engagement.score,
        comments: engagement.comments,
        publishedAt: ts === null ? null : new Date(ts).toISOString(),
        subreddit: sub,
        flair: null,
      };
    });
  } catch (error) {
    console.error(`Error fetching r/${sub} RSS:`, error);
    return [];
  }
}

export async function fetchOsintFeed(limit = 30): Promise<OsintPost[]> {
  const results = await Promise.allSettled(
    SUBREDDITS.map((sub) => fetchSubredditRSS(sub))
  );

  const allPosts = results
    .filter((r): r is PromiseFulfilledResult<OsintPost[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // Deduplicate by URL.
  const seen = new Set<string>();
  const unique = allPosts.filter((post) => {
    if (seen.has(post.url)) return false;
    seen.add(post.url);
    return true;
  });

  // Sort by real publication time (newest first). Posts with no usable
  // timestamp sink to the bottom so they never displace dated content.
  unique.sort((a, b) => {
    const aTs = a.publishedAt ? Date.parse(a.publishedAt) : NaN;
    const bTs = b.publishedAt ? Date.parse(b.publishedAt) : NaN;
    const aValid = Number.isFinite(aTs);
    const bValid = Number.isFinite(bTs);
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    if (!aValid && !bValid) return 0;
    return (bTs as number) - (aTs as number);
  });

  return unique.slice(0, limit);
}
