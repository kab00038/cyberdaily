// app/api/news/route.ts
import { NextResponse } from "next/server";
import { fetchRSSFeeds } from "@/lib/rss";

export const runtime = "edge";

export async function GET() {
  try {
    const news = await fetchRSSFeeds();
    return NextResponse.json(news, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=450",
      },
    });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
