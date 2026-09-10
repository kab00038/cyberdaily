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
  /**
   * The actual pubStartDate/pubEndDate sent to NVD, day-precision ISO
   * (YYYY-MM-DD) in UTC. Null when the request failed before the window
   * could be recorded.
   */
  windowStart: string | null;
  windowEnd: string | null;
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

/**
 * Normalize a single NVD API vulnerability entry (`{ cve: {...} }`) into the
 * app's CVEItem shape. Returns null when the entry carries no CVE ID.
 */
export function normalizeCVEItem(entry: unknown): CVEItem | null {
  const cve = asRecord(asRecord(entry)?.cve) ?? {};
  const id = asString(cve.id);
  if (id === "") return null;

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
    id,
    description: asString(description, "No description"),
    cvssScore:
      typeof cvssData?.baseScore === "number" ? cvssData.baseScore : null,
    severity: asString(cvssData?.baseSeverity) || null,
    publishedAt: asString(cve.published) || null,
    lastModified: asString(cve.lastModified),
    references: asArray(cve.references)
      .map((r) => asString(asRecord(r)?.url))
      .filter((url) => url !== ""),
    attackVector,
    cweIds,
  };
}

/**
 * Direct NVD lookup for a single CVE ID. Used when a CVE is absent from the
 * locally loaded snapshot. Returns null when NVD has no such record.
 */
export async function fetchCVEDirect(id: string): Promise<CVEItem | null> {
  try {
    const response = await fetch(
      `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${id}`,
      { next: { revalidate: 3600 } } // 1 hour cache
    );
    if (!response.ok) return null;

    const data: unknown = await response.json();
    const record = asRecord(data) ?? {};
    const entry = asArray(record.vulnerabilities)[0];
    return entry ? normalizeCVEItem(entry) : null;
  } catch (error) {
    console.error(`Error in direct NVD lookup for ${id}:`, error);
    return null;
  }
}

export async function fetchCVELatest(): Promise<NVDResult> {
  const fetchedAt = new Date().toISOString();
  try {
    // Fetch CVEs from the last 14 days for better trend analytics
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    // Day-precision UTC window — the chart bins must match these boundaries.
    const windowStart = twoWeeksAgo.toISOString().slice(0, 10);
    const windowEnd = now.toISOString().slice(0, 10);
    const startDate = twoWeeksAgo.toISOString().split(".")[0];
    const endDate = now.toISOString().split(".")[0];

    const response = await fetch(
      `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=100&pubStartDate=${startDate}&pubEndDate=${endDate}`,
      { next: { revalidate: 3600 } } // 1 hour cache
    );

    if (!response.ok) throw new Error("NVD API error");

    const data: unknown = await response.json();
    const record = asRecord(data) ?? {};

    const items = asArray(record.vulnerabilities)
      .map((entry) => normalizeCVEItem(entry))
      .filter((item): item is CVEItem => item !== null);

    const totalResults =
      typeof record.totalResults === "number" ? record.totalResults : null;
    const resultsPerPage =
      typeof record.resultsPerPage === "number" ? record.resultsPerPage : 100;
    const startIndex =
      typeof record.startIndex === "number" ? record.startIndex : 0;

    // Completeness is only "complete" when the provider stated a total and we
    // loaded all of it. An unreported total cannot establish coverage, so it
    // stays "unknown" — never inferred to be complete (or partial).
    const completeness: "complete" | "partial" | "unknown" =
      totalResults === null
        ? "unknown"
        : items.length >= totalResults
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
      windowStart,
      windowEnd,
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
      windowStart: null,
      windowEnd: null,
    };
  }
}