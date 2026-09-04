// app/api/hackernews/route.ts
import { NextResponse } from "next/server";
import { fetchHackerNewsStories } from "@/lib/hn";

export const runtime = "edge";

export async function GET() {
  try {
    const stories = await fetchHackerNewsStories();
    return NextResponse.json(stories, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=450",
      },
    });
  } catch (error) {
    console.error("HN API error:", error);
    return NextResponse.json({ error: "Failed to fetch HN stories" }, { status: 500 });
  }
}
