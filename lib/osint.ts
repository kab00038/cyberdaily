// lib/osint.ts
export interface OsintPost {
  title: string;
  url: string;
  source: string; // "r/netsec", "r/cybersecurity", "Telegram: Krebs"
  score: number;
  comments: number;
  timeAgo: string;
  subreddit?: string;
  flair?: string;
}

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
];

async function fetchSubreddit(sub: string): Promise<OsintPost[]> {
  try {
    const res = await fetch(
      `https://old.reddit.com/r/${sub}/hot.json?limit=15`,
      {
        headers: {
          "User-Agent": "CyberDaily/1.0 (Cybersecurity News Aggregator)",
        },
        next: { revalidate: 900 }, // 15 min cache
      }
    );

    if (!res.ok) throw new Error(`Reddit ${res.status}`);
    const data = await res.json();

    return (data.data?.children || []).map((child: any) => {
      const post = child.data;
      return {
        title: post.title,
        url: post.url?.startsWith("http")
          ? post.url
          : `https://reddit.com${post.permalink}`,
        source: `r/${sub}`,
        score: post.score || 0,
        comments: post.num_comments || 0,
        timeAgo: timeAgo(new Date(post.created_utc * 1000).toISOString()),
        subreddit: sub,
        flair: post.link_flair_text || null,
      };
    });
  } catch (error) {
    console.error(`Error fetching r/${sub}:`, error);
    return [];
  }
}

export async function fetchOsintFeed(): Promise<OsintPost[]> {
  const results = await Promise.allSettled(
    SUBREDDITS.map((sub) => fetchSubreddit(sub))
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
