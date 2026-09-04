// app/api/threats/route.ts
import { NextResponse } from "next/server";
import { fetchCVELatest } from "@/lib/nvd";
import { fetchKEVData } from "@/lib/abuse-ch";
import { fetchEPSSScores } from "@/lib/epss";
import { calculateRiskScore } from "@/lib/risk-scoring";

export const runtime = "edge";

export async function GET() {
  try {
    const [cves, kev] = await Promise.allSettled([
      fetchCVELatest(),
      fetchKEVData(),
    ]);

    const cveList = cves.status === "fulfilled" ? cves.value : [];
    const kevList = kev.status === "fulfilled" ? kev.value : [];

    // Fetch EPSS scores for all CVE IDs
    const cveIds = cveList.map((c) => c.id);
    const epssScores = await fetchEPSSScores(cveIds);

    // Build KEV lookup map
    const kevMap = new Map(kevList.map((k) => [k.cveID, k]));

    // Calculate composite risk scores
    const scoredCVEs = cveList
      .map((cve) => {
        const epss = epssScores.get(cve.id);
        const kev = kevMap.get(cve.id);
        return calculateRiskScore(cve, epss, kev);
      })
      .sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json(
      {
        cves: scoredCVEs,
        kev: kevList,
        epssCount: epssScores.size,
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
