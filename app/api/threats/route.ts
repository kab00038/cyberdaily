// app/api/threats/route.ts
import { NextResponse } from "next/server";
import { fetchCVELatest } from "@/lib/nvd";
import { fetchKEVData } from "@/lib/abuse-ch";

export const runtime = "edge";

export async function GET() {
  try {
    const [cves, kev] = await Promise.allSettled([
      fetchCVELatest(),
      fetchKEVData(),
    ]);

    return NextResponse.json(
      {
        cves: cves.status === "fulfilled" ? cves.value : [],
        kev: kev.status === "fulfilled" ? kev.value : [],
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error("Threats API error:", error);
    return NextResponse.json({ error: "Failed to fetch threats" }, { status: 500 });
  }
}
