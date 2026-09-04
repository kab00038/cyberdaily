// lib/epss.ts
export interface EPSSScore {
  cve: string;
  epss: string;      // probability 0-1
  percentile: string; // 0-100
  date: string;
}

export async function fetchEPSSScores(cveIds: string[]): Promise<Map<string, EPSSScore>> {
  const scoreMap = new Map<string, EPSSScore>();

  if (cveIds.length === 0) return scoreMap;

  try {
    // EPSS API accepts comma-separated CVE IDs
    const response = await fetch(
      `https://api.first.org/data/v1/epss?cve=${cveIds.join(",")}`,
      { next: { revalidate: 3600 } } // 1 hour cache
    );

    if (!response.ok) throw new Error("EPSS API error");

    const data = await response.json();

    for (const score of data.data || []) {
      scoreMap.set(score.cve, {
        cve: score.cve,
        epss: score.epss,
        percentile: score.percentile,
        date: score.date,
      });
    }

    return scoreMap;
  } catch (error) {
    console.error("Error fetching EPSS scores:", error);
    return scoreMap;
  }
}
