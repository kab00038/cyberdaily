// app/api/osint/route.ts
import { NextResponse } from "next/server";
import { fetchOsintFeed } from "@/lib/osint";

export const runtime = "edge";

export async function GET() {
  try {
    const posts = await fetchOsintFeed();
    return NextResponse.json(posts, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=450",
      },
    });
  } catch (error) {
    console.error("OSINT API error:", error);
    return NextResponse.json({ error: "Failed to fetch OSINT feed" }, { status: 500 });
  }
}
