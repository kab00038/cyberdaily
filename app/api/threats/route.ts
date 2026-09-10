// app/api/threats/route.ts
import { NextResponse } from "next/server";
import { fetchCVELatest } from "@/lib/nvd";
import { fetchKEVCatalog } from "@/lib/abuse-ch";
import { fetchEPSSScores } from "@/lib/epss";
import { calculateRiskScore } from "@/lib/risk-scoring";
import type { SourceStatus } from "@/lib/sources";

export const runtime = "edge";

export async function GET() {
  try {
    const generatedAt = new Date().toISOString();
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

    // Derive completeness from the NVDResult. An unreported total leaves
    // coverage unknown; a stated total we did not fully load is partial.
    const nvdError = cveResult?.error ?? null;
    let completeness: "complete" | "partial" | "unknown" = "unknown";
    if (nvdError !== null) {
      completeness = "unknown";
    } else if (cveResult?.totalResults === null) {
      completeness = "unknown";
    } else if (cveList.length < (cveResult?.totalResults ?? 0)) {
      completeness = "partial";
    } else {
      completeness = "complete";
    }

    const newestEpssDate = Array.from(epssScores.values()).reduce<string | null>(
      (latest, score) =>
        !score.date || (latest && score.date <= latest) ? latest : score.date,
      null
    );

    const sourceMeta: SourceStatus[] = [
      {
        id: "nvd-cve-2.0",
        label: "NVD CVE 2.0",
        category: "vulnerabilities",
        status: nvdError === null ? "ok" : "error",
        lastSuccessfulFetchAt:
          nvdError === null ? (cveResult?.fetchedAt ?? null) : null,
        upstreamUpdatedAt: cveResult?.windowEnd ?? null,
        count: cveList.length,
        message: nvdError ?? undefined,
      },
      {
        id: "cisa-kev",
        label: "CISA KEV",
        category: "vulnerabilities",
        status: fullCatalog.length > 0 ? "ok" : "error",
        lastSuccessfulFetchAt:
          fullCatalog.length > 0 ? generatedAt : null,
        upstreamUpdatedAt: fullCatalog[0]?.dateAdded ?? null,
        count: fullCatalog.length,
        message:
          fullCatalog.length > 0 ? undefined : "Catalog empty or fetch failed",
      },
      {
        id: "first-epss",
        label: "FIRST EPSS",
        category: "vulnerabilities",
        status: epssScores.size > 0 ? "ok" : "error",
        lastSuccessfulFetchAt: epssScores.size > 0 ? generatedAt : null,
        upstreamUpdatedAt: newestEpssDate,
        count: epssScores.size,
        message:
          epssScores.size > 0
            ? undefined
            : "No EPSS scores returned for loaded CVEs",
      },
    ];

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
        generatedAt,
        sourceMeta,
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
