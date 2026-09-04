// lib/hn.ts
export interface HNStory {
  title: string;
  url: string;
  points: number;
  comments: number;
  timeAgo: string;
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

export async function fetchHackerNewsStories(): Promise<HNStory[]> {
  try {
    const response = await fetch(
      "https://hn.algolia.com/api/v1/search?query=cybersecurity&tags=story&hitsPerPage=20",
      { next: { revalidate: 900 } } // 15 min cache
    );

    if (!response.ok) throw new Error("HN API error");

    const data = await response.json();
    return data.hits.map((hit: HNHit) => ({
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      points: hit.points,
      comments: hit.num_comments,
      timeAgo: timeAgo(hit.created_at),
      hnUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    }));
  } catch (error) {
    console.error("Error fetching HN stories:", error);
    return [];
  }
}
