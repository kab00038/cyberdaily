// app/api/sources/route.ts
import { NextResponse } from "next/server";
import { collectSourceStatuses } from "@/lib/sources";

export const runtime = "edge";

export async function GET() {
  try {
    const sources = await collectSourceStatuses();
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        sources,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("Sources API error:", error);
    return NextResponse.json(
      { error: "Failed to collect source health", sources: [] },
      { status: 500 }
    );
  }
}