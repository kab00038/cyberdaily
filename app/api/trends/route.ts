// app/api/trends/route.ts
import { NextResponse } from "next/server";
import { fetchCVELatest } from "@/lib/nvd";
import { fetchEPSSScores } from "@/lib/epss";
import { fetchKEVCatalog } from "@/lib/abuse-ch";
import type { SourceStatus } from "@/lib/sources";

export const runtime = "edge";

/**
 * Build a contiguous range of day bins [start, end] (inclusive) from a
 * bucket map keyed by YYYY-MM-DD (UTC). Returns an empty array when the
 * window is missing/invalid.
 */
function buildDayBins(
  start: string | null,
  end: string | null,
  buckets: Record<string, number>
): { date: string; count: number }[] {
  if (!start || !end) return [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  if (
    Number.isNaN(cursor.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    cursor > endDate
  ) {
    return [];
  }
  const bins: { date: string; count: number }[] = [];
  while (cursor <= endDate) {
    const day = cursor.toISOString().slice(0, 10);
    bins.push({ date: day, count: buckets[day] ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return bins;
}

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
    const cveIds = cveList.map((c) => c.id);
    const epssScores = await fetchEPSSScores(cveIds);

    // Severity breakdown
    const severityBreakdown = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    for (const cve of cveList) {
      const sev = cve.severity?.toUpperCase() || "UNKNOWN";
      if (sev in severityBreakdown) {
        severityBreakdown[sev as keyof typeof severityBreakdown]++;
      } else {
        severityBreakdown.UNKNOWN++;
      }
    }

    // EPSS distribution (buckets: 0-10%, 10-25%, 25-50%, 50-75%, 75-100%)
    const epssDistribution = [
      { range: "0-10%", count: 0 },
      { range: "10-25%", count: 0 },
      { range: "25-50%", count: 0 },
      { range: "50-75%", count: 0 },
      { range: "75-100%", count: 0 },
    ];
    for (const [, epss] of epssScores) {
      const prob = parseFloat(epss.epss) * 100;
      if (prob < 10) epssDistribution[0].count++;
      else if (prob < 25) epssDistribution[1].count++;
      else if (prob < 50) epssDistribution[2].count++;
      else if (prob < 75) epssDistribution[3].count++;
      else epssDistribution[4].count++;
    }

    // Attack vector breakdown (from structured CVSS in NVD; null → UNKNOWN)
    const attackVectors = { NETWORK: 0, ADJACENT: 0, LOCAL: 0, PHYSICAL: 0, UNKNOWN: 0 };
    for (const cve of cveList) {
      const av = cve.attackVector || "UNKNOWN";
      if (av in attackVectors) {
        attackVectors[av as keyof typeof attackVectors]++;
      } else {
        attackVectors.UNKNOWN++;
      }
    }

    // Risk level breakdown (using CVSS as proxy since we have it)
    const riskBreakdown = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const cve of cveList) {
      if (cve.cvssScore === null) continue;
      if (cve.cvssScore >= 9.0) riskBreakdown.CRITICAL++;
      else if (cve.cvssScore >= 7.0) riskBreakdown.HIGH++;
      else if (cve.cvssScore >= 4.0) riskBreakdown.MEDIUM++;
      else riskBreakdown.LOW++;
    }

    // Daily trend — bucket items by UTC publication day, then lay a
    // contiguous bin range over the ACTUAL snapshot window (not "today").
    const windowStart = cveResult?.windowStart ?? null;
    const windowEnd = cveResult?.windowEnd ?? null;

    const buckets: Record<string, number> = {};
    for (const cve of cveList) {
      if (!cve.publishedAt) continue;
      const day = cve.publishedAt.slice(0, 10); // YYYY-MM-DD
      buckets[day] = (buckets[day] ?? 0) + 1;
    }

    let dailyTrend = buildDayBins(windowStart, windowEnd, buckets);
    let coverageNote: string | null = null;
    const hasRecordsInWindow =
      windowStart !== null && windowEnd !== null
        ? Object.keys(buckets).some(
            (day) => day >= windowStart && day <= windowEnd
          )
        : false;
    if (cveList.length === 0 || !hasRecordsInWindow) {
      dailyTrend = [];
      coverageNote = "No loaded records cover this period.";
    }

    // Top CWEs (from structured cweIds parsed from NVD)
    const cweCounts: Record<string, number> = {};
    for (const cve of cveList) {
      for (const cwe of cve.cweIds) {
        cweCounts[cwe] = (cweCounts[cwe] || 0) + 1;
      }
    }
    const topCWEs = Object.entries(cweCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([cwe, count]) => ({ cwe, count }));

    // Vendor mentions in descriptions (best-effort keyword matching)
    const vendorKeywords = [
      "Microsoft", "Google", "Apple", "Adobe", "Mozilla", "Linux", "Cisco",
      "VMware", "Oracle", "SAP", "Intel", "AMD", "NVIDIA", "Qualcomm",
      "Apache", "nginx", "WordPress", "Joomla", "Drupal", "Jenkins",
      "Docker", "Kubernetes", "Amazon", "AWS", "Azure",
    ];
    const vendorCounts: Record<string, number> = {};
    for (const cve of cveList) {
      for (const vendor of vendorKeywords) {
        if (cve.description.toLowerCase().includes(vendor.toLowerCase())) {
          vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
        }
      }
    }
    const vendorMentions = Object.entries(vendorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([vendor, count]) => ({ vendor, count }));

    // Coverage: derived from the NVDResult completeness, overridden to
    // "stale" when the snapshot predates the last 24 h, and "unknown" only
    // when the NVD fetch errored.
    const nvdError = cveResult?.error ?? null;
    let coverage: "complete" | "partial" | "unknown" | "stale" = "unknown";
    if (cveResult) {
      if (nvdError !== null) {
        coverage = "unknown";
      } else {
        coverage = cveResult.completeness;
        const fetchedMs = cveResult.fetchedAt
          ? Date.parse(cveResult.fetchedAt)
          : NaN;
        if (Number.isFinite(fetchedMs)) {
          const ageHours = (Date.now() - fetchedMs) / 3_600_000;
          if (ageHours > 24) coverage = "stale";
        }
      }
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
        severityBreakdown,
        epssDistribution,
        attackVectors,
        riskBreakdown,
        dailyTrend,
        coverageNote,
        topCWEs,
        vendorMentions,
        totalCVEs: cveList.length,
        totalResults: cveResult?.totalResults ?? null,
        totalKEV: fullCatalog.length,
        epssCoverage: epssScores.size,
        coverage,
        completeness: cveResult?.completeness ?? "unknown",
        nvdError,
        windowStart,
        windowEnd,
        dataFetchedAt: cveResult?.fetchedAt ?? null,
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
    console.error("Trends API error:", error);
    return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 });
  }
}