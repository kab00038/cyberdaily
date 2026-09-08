// app/api/hackernews/route.ts
import { NextResponse } from "next/server";
import { fetchHackerNewsStories } from "@/lib/hn";
import type { SourceStatus } from "@/lib/sources";

export const runtime = "edge";

export async function GET() {
  try {
    const generatedAt = new Date().toISOString();
    const stories = await fetchHackerNewsStories("latest", { days: 7 });
    const items = stories.map((story) => ({
      title: story.title,
      url: story.url,
      points: story.points,
      comments: story.comments,
      publishedAt: story.publishedAt,
      hnUrl: story.hnUrl,
    }));
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
