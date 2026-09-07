// lib/nvd.ts
import { asArray, asRecord, asString } from "./parse";

export interface CVEItem {
  id: string;
  description: string;
  cvssScore: number | null;
  severity: string | null;
  publishedAt: string | null;
  lastModified: string;
  references: string[];
  attackVector: string | null;
  cweIds: string[];
}

export interface NVDResult {
  items: CVEItem[];
  totalResults: number | null;
  resultsPerPage: number;
  startIndex: number;
  completeness: "complete" | "partial" | "unknown";
  fetchedAt: string;
  error: string | null;
}

/**
 * Normalize an NVD attack vector value into the short form.
 * ADJACENT_NETWORK becomes ADJACENT; NETWORK/LOCAL/PHYSICAL/UNKNOWN are kept.
 * Unknown or missing values yield null.
 */
function normalizeAttackVector(value: string | null): string | null {
  if (!value) return null;
  switch (value) {
    case "NETWORK":
      return "NETWORK";
    case "ADJACENT_NETWORK":
      return "ADJACENT";
    case "LOCAL":
      return "LOCAL";
    case "PHYSICAL":
      return "PHYSICAL";
    case "UNKNOWN":
      return "UNKNOWN";
    default:
      return null;
  }
}

export async function fetchCVELatest(): Promise<NVDResult> {
  const fetchedAt = new Date().toISOString();
  try {
    // Fetch CVEs from the last 14 days for better trend analytics
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const startDate = twoWeeksAgo.toISOString().split(".")[0];
    const endDate = now.toISOString().split(".")[0];

    const response = await fetch(
      `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=100&pubStartDate=${startDate}&pubEndDate=${endDate}`,
      { next: { revalidate: 3600 } } // 1 hour cache
    );

    if (!response.ok) throw new Error("NVD API error");

    const data: unknown = await response.json();
    const record = asRecord(data) ?? {};

    const items = asArray(record.vulnerabilities).map((entry) => {
      const cve = asRecord(asRecord(entry)?.cve) ?? {};

      // Prefer cvssMetricV31; fall back to cvssMetricV40 when v3.1 is absent.
      const metrics = asRecord(cve.metrics) ?? {};
      const v31 = asRecord(asArray(metrics.cvssMetricV31)[0]);
      const v40 = asRecord(asArray(metrics.cvssMetricV40)[0]);
      const source = v31 ?? v40;
      const cvssData = asRecord(source?.cvssData);

      const description = asRecord(asArray(cve.descriptions)[0])?.value;

      const attackVector = normalizeAttackVector(
        asString(cvssData?.attackVector) || null
      );

      const cweIds = asArray(cve.weaknesses)
        .map((w) => {
          const desc = asRecord(asArray(asRecord(w)?.description)[0]);
          return asString(desc?.value);
        })
        .filter((id) => id !== "");

      return {
        id: asString(cve.id),
        description: asString(description, "No description"),
        cvssScore: typeof cvssData?.baseScore === "number" ? cvssData.baseScore : null,
        severity: asString(cvssData?.baseSeverity) || null,
        publishedAt: asString(cve.published) || null,
        lastModified: asString(cve.lastModified),
        references: asArray(cve.references)
          .map((r) => asString(asRecord(r)?.url))
          .filter((url) => url !== ""),
        attackVector,
        cweIds,
      };
    });

    const totalResults =
      typeof record.totalResults === "number" ? record.totalResults : null;
    const resultsPerPage =
      typeof record.resultsPerPage === "number" ? record.resultsPerPage : 100;
    const startIndex =
      typeof record.startIndex === "number" ? record.startIndex : 0;

    const completeness: "complete" | "partial" =
      totalResults === null || items.length >= totalResults
        ? "complete"
        : "partial";

    return {
      items,
      totalResults,
      resultsPerPage,
      startIndex,
      completeness,
      fetchedAt,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching CVEs:", error);
    const message = error instanceof Error ? error.message : String(error);
    return {
      items: [],
      totalResults: null,
      resultsPerPage: 100,
      startIndex: 0,
      completeness: "unknown",
      fetchedAt,
      error: message,
    };
  }
}