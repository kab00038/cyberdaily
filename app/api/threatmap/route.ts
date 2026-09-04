// app/api/threatmap/route.ts
import { NextResponse } from "next/server";
import { fetchThreatMapData } from "@/lib/abuse-ch";

export const runtime = "edge";

export async function GET() {
  try {
    const threats = await fetchThreatMapData();
    return NextResponse.json(threats, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=150",
      },
    });
  } catch (error) {
    console.error("Threat map API error:", error);
    return NextResponse.json({ error: "Failed to fetch threat map data" }, { status: 500 });
  }
}
