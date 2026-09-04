// lib/nvd.ts
import { asArray, asRecord, asString } from "./parse";

export interface CVEItem {
  id: string;
  description: string;
  cvssScore: number | null;
  severity: string | null;
  published: string;
  lastModified: string;
  references: string[];
}

export async function fetchCVELatest(): Promise<CVEItem[]> {
  try {
    const response = await fetch(
      "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20",
      { next: { revalidate: 3600 } } // 1 hour cache
    );

    if (!response.ok) throw new Error("NVD API error");

    const data: unknown = await response.json();
    return asArray(asRecord(data)?.vulnerabilities).map((entry) => {
      const cve = asRecord(asRecord(entry)?.cve) ?? {};
      const cvssData = asRecord(
        asRecord(asArray(asRecord(cve.metrics)?.cvssMetricV31)[0])?.cvssData
      );
      const description = asRecord(asArray(cve.descriptions)[0])?.value;
      return {
        id: asString(cve.id),
        description: asString(description, "No description"),
        cvssScore: typeof cvssData?.baseScore === "number" ? cvssData.baseScore : null,
        severity: asString(cvssData?.baseSeverity) || null,
        published: asString(cve.published),
        lastModified: asString(cve.lastModified),
        references: asArray(cve.references)
          .map((r) => asString(asRecord(r)?.url))
          .filter((url) => url !== ""),
      };
    });
  } catch (error) {
    console.error("Error fetching CVEs:", error);
    return [];
  }
}
