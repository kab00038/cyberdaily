// app/api/osint/route.ts
import { NextResponse } from "next/server";
import { fetchOsintFeed } from "@/lib/osint";
import type { SourceStatus } from "@/lib/sources";

export const runtime = "edge";

export async function GET() {
  try {
    const generatedAt = new Date().toISOString();
    const posts = await fetchOsintFeed(30);
    const items = posts.map((post) => ({
      title: post.title,
      url: post.url,
      source: post.source,
      score: post.score,
      comments: post.comments,
      publishedAt: post.publishedAt,
      subreddit: post.subreddit,
      flair: post.flair,
    }));
    const sourceMeta: SourceStatus[] = [
      {
        id: "reddit-osint",
        label: "Reddit (subreddits)",
        category: "community",
        status: items.length > 0 ? "ok" : "error",
        lastSuccessfulFetchAt: items.length > 0 ? generatedAt : null,
        upstreamUpdatedAt: items[0]?.publishedAt ?? null,
        count: items.length,
        message: items.length > 0 ? undefined : "No posts returned",
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
    console.error("OSINT API error:", error);
    return NextResponse.json({ error: "Failed to fetch OSINT feed" }, { status: 500 });
  }
}
