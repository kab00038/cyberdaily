// app/api/news/route.ts
import { NextResponse } from "next/server";
import { fetchRSSFeeds } from "@/lib/rss";
import { summarizeBatch, AISummary } from "@/lib/ai";

export const runtime = "edge";

export async function GET() {
  try {
    const news = await fetchRSSFeeds();

    // AI summarize top 15 articles (respects Groq free tier)
    const summaries = await summarizeBatch(
      news.slice(0, 15).map((n) => ({
        title: n.title,
        snippet: n.snippet,
        source: n.source,
      }))
    );

    // Merge summaries into news items
    const enrichedNews = news.map((item, i) => {
      const ai: AISummary | undefined = summaries.get(i);
      return {
        ...item,
        aiSummary: ai?.summary || null,
        category: ai?.category || "general",
        urgency: ai?.urgency || "medium",
      };
    });

    return NextResponse.json(enrichedNews, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=450",
      },
    });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
