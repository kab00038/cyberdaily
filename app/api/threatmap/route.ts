// app/api/threatmap/route.ts
import { NextResponse } from "next/server";
import { fetchThreatMapData } from "@/lib/abuse-ch";
import type { SourceStatus } from "@/lib/sources";

export const runtime = "edge";

export async function GET() {
  try {
    const generatedAt = new Date().toISOString();
    const threats = await fetchThreatMapData();
    const sourceMeta: SourceStatus[] = [
      {
        id: "blocklist-de",
        label: "blocklist.de",
        category: "threatmap",
        status: threats.length > 0 ? "ok" : "error",
        lastSuccessfulFetchAt:
          threats.length > 0 ? generatedAt : null,
        upstreamUpdatedAt: threats[0]?.observedAt ?? null,
        count: threats.length,
        message:
          threats.length > 0 ? undefined : "No sampled records returned",
      },
    ];
    return NextResponse.json(
      { items: threats, generatedAt, sourceMeta },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=150",
        },
      }
    );
  } catch (error) {
    console.error("Threat map API error:", error);
    return NextResponse.json({ error: "Failed to fetch threat map data" }, { status: 500 });
  }
}
