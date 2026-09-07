// app/api/threats/route.ts
import { NextResponse } from "next/server";
import { fetchCVELatest } from "@/lib/nvd";
import { fetchKEVCatalog } from "@/lib/abuse-ch";
import { fetchEPSSScores } from "@/lib/epss";
import { calculateRiskScore } from "@/lib/risk-scoring";

export const runtime = "edge";

export async function GET() {
  try {
    const [cves, kev] = await Promise.allSettled([
      fetchCVELatest(),
      fetchKEVCatalog(),
    ]);

    const cveResult = cves.status === "fulfilled" ? cves.value : null;
    const cveList = cveResult?.items ?? [];
    const fullCatalog = kev.status === "fulfilled" ? kev.value : [];

    // Fetch EPSS scores for all CVE IDs
    const cveIds = cveList.map((c) => c.id);
    const epssScores = await fetchEPSSScores(cveIds);

    // Build KEV lookup map from the FULL catalog for membership checks
    const kevMap = new Map(fullCatalog.map((entry) => [entry.cveID, entry]));
    // Top 10 most recently added KEV entries (catalog is sorted by dateAdded desc)
    const recentKev = fullCatalog.slice(0, 10);

    // Calculate composite risk scores
    const scoredCVEs = cveList
      .map((cve) => {
        const epss = epssScores.get(cve.id);
        const kev = kevMap.get(cve.id); // may be undefined
        return calculateRiskScore(cve, epss, kev);
      })
      .sort((a, b) => b.riskScore - a.riskScore);

    // Derive completeness from the NVDResult.
    const nvdError = cveResult?.error ?? null;
    let completeness: "complete" | "partial" | "unknown" = "unknown";
    if (nvdError !== null) {
      completeness = "unknown";
    } else if (
      cveResult?.totalResults === null ||
      cveList.length < (cveResult?.totalResults ?? 0)
    ) {
      completeness = "partial";
    } else {
      completeness = "complete";
    }

    return NextResponse.json(
      {
        cves: scoredCVEs,
        kev: recentKev,
        kevMembership: scoredCVEs.map((c) =>
          kevMap.has(c.id) ? "listed" : "not-listed"
        ),
        kevCatalogSize: fullCatalog.length,
        epssCount: epssScores.size,
        completeness,
        nvdError,
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
