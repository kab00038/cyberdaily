// app/api/trends/route.ts
import { NextResponse } from "next/server";
import { fetchCVELatest } from "@/lib/nvd";
import { fetchEPSSScores } from "@/lib/epss";
import { fetchKEVData } from "@/lib/abuse-ch";

export const runtime = "edge";

export async function GET() {
  try {
    const [cves, kev] = await Promise.allSettled([
      fetchCVELatest(),
      fetchKEVData(),
    ]);

    const cveList = cves.status === "fulfilled" ? cves.value : [];
    const kevList = kev.status === "fulfilled" ? kev.value : [];
    const cveIds = cveList.map((c) => c.id);
    const epssScores = await fetchEPSSScores(cveIds);
    const kevSet = new Set(kevList.map((k) => k.cveID));

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

    // Risk level breakdown (using CVSS as proxy since we have it)
    const riskBreakdown = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const cve of cveList) {
      if (cve.cvssScore === null) continue;
      if (cve.cvssScore >= 9.0) riskBreakdown.CRITICAL++;
      else if (cve.cvssScore >= 7.0) riskBreakdown.HIGH++;
      else if (cve.cvssScore >= 4.0) riskBreakdown.MEDIUM++;
      else riskBreakdown.LOW++;
    }

    // Daily trend (group CVEs by published date, last 14 days)
    const now = new Date();
    const dailyTrend: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = cveList.filter((c) => c.published?.startsWith(dateStr)).length;
      dailyTrend.push({ date: dateStr, count });
    }

    // Top CWEs (extract from CVE descriptions — look for CWE patterns)
    const cweCounts: Record<string, number> = {};
    for (const cve of cveList) {
      const cweMatch = cve.description.match(/CWE-\d+/g);
      if (cweMatch) {
        for (const cwe of cweMatch) {
          cweCounts[cwe] = (cweCounts[cwe] || 0) + 1;
        }
      }
    }
    const topCWEs = Object.entries(cweCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([cwe, count]) => ({ cwe, count }));

    // Top vendors (extract from descriptions)
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
    const topVendors = Object.entries(vendorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([vendor, count]) => ({ vendor, count }));

    return NextResponse.json(
      {
        severityBreakdown,
        epssDistribution,
        riskBreakdown,
        dailyTrend,
        topCWEs,
        topVendors,
        totalCVEs: cveList.length,
        totalKEV: kevList.length,
        epssCoverage: epssScores.size,
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
