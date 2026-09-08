// app/api/news/route.ts
import { NextResponse } from "next/server";
import { fetchRSSFeedsWithStatus } from "@/lib/rss";
import { summarizeBatch, AISummary } from "@/lib/ai";
import { newsSourceStatuses } from "@/lib/sources";

export const runtime = "edge";

export async function GET() {
  try {
    const generatedAt = new Date().toISOString();
    const { items: news, feeds } = await fetchRSSFeedsWithStatus();

    // Fire AI enrichment in parallel; do NOT block the response on the full batch.
    const summariesPromise = summarizeBatch(
      news.slice(0, 15).map((n) => ({
        title: n.title,
        snippet: n.snippet,
        source: n.source,
      }))
    );

    // Wait at most 8 seconds for the in-flight batch. If it isn't done, we
    // fall back to whatever has been enriched (null defaults for the rest).
    let summaries = new Map<number, AISummary>();
    await Promise.race([
      summariesPromise.then((map) => {
        summaries = map;
        return true;
      }),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 8000)),
    ]);

    // Merge summaries into news items. Missing AI values default to null.
    const enrichedNews = news.map((item, i) => {
      const ai: AISummary | undefined = summaries.get(i);
      return {
        ...item,
        aiSummary: ai?.summary ?? null,
        category: ai?.category ?? null,
        urgency: ai?.urgency ?? null,
      };
    });

    return NextResponse.json(
      {
        items: enrichedNews,
        generatedAt,
        sourceMeta: newsSourceStatuses(feeds),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=450",
        },
      }
    );
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
