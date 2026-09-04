// lib/osint.ts
import { XMLParser } from "fast-xml-parser";

export interface OsintPost {
  title: string;
  url: string;
  source: string;
  score: number;
  comments: number;
  timeAgo: string;
  subreddit?: string;
  flair?: string;
}

const rssParser = new XMLParser({ ignoreAttributes: false });

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

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

async function fetchSubredditRSS(sub: string): Promise<OsintPost[]> {
  try {
    // RSS feeds are more reliable from serverless than JSON API
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
    const doc = rssParser.parse(xml);
    const entries = doc?.feed?.entry || [];
    const entriesArray = Array.isArray(entries) ? entries : [entries];

    return entriesArray.map((entry: any) => {
      const title = entry.title?.["#text"] || entry.title || "Untitled";
      const link = entry.link?.["@_href"] || entry.link || entry.id || "#";
      const published = entry.published || entry.updated || new Date().toISOString();
      const content = entry.content?.["#text"] || entry.content || entry.summary || "";
      
      // Extract score and comments from content if available
      const scoreMatch = content.match(/(\d+)\s*points?/i);
      const commentsMatch = content.match(/(\d+)\s*comments?/i);
      
      return {
        title: title,
        url: link,
        source: `r/${sub}`,
        score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
        comments: commentsMatch ? parseInt(commentsMatch[1]) : 0,
        timeAgo: timeAgo(published),
        subreddit: sub,
        flair: undefined,
      };
    });
  } catch (error) {
    console.error(`Error fetching r/${sub} RSS:`, error);
    return [];
  }
}

export async function fetchOsintFeed(): Promise<OsintPost[]> {
  const results = await Promise.allSettled(
    SUBREDDITS.map((sub) => fetchSubredditRSS(sub))
  );

  const allPosts = results
    .filter((r): r is PromiseFulfilledResult<OsintPost[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // Sort by score (most engaged first), deduplicate by URL
  const seen = new Set<string>();
  return allPosts
    .filter((post) => {
      if (seen.has(post.url)) return false;
      seen.add(post.url);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
}
