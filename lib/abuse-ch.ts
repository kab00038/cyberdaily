// lib/abuse-ch.ts — CISA KEV + abuse.ch URLhaus threat map
import { lookupIP } from "./geoip";
import { asArray, asRecord, asString } from "./parse";

export interface KEVItem {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
}

export async function fetchKEVData(): Promise<KEVItem[]> {
  try {
    const response = await fetch(
      "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
      { next: { revalidate: 3600 } } // 1 hour cache
    );

    if (!response.ok) throw new Error("CISA KEV API error");

    const data: unknown = await response.json();
    return asArray(asRecord(data)?.vulnerabilities)
      .map((entry) => asRecord(entry) ?? {})
      .map((v) => ({
        cveID: asString(v.cveID),
        vendorProject: asString(v.vendorProject),
        product: asString(v.product),
        vulnerabilityName: asString(v.vulnerabilityName),
        dateAdded: asString(v.dateAdded),
        shortDescription: asString(v.shortDescription),
        requiredAction: asString(v.requiredAction),
        dueDate: asString(v.dueDate),
      }))
      .sort((a, b) => (Date.parse(b.dateAdded) || 0) - (Date.parse(a.dateAdded) || 0))
      .slice(0, 10);
  } catch (error) {
    console.error("Error fetching KEV data:", error);
    return [];
  }
}

export interface ThreatMapEntry {
  sourceIP: string;
  sourceCountry: string;
  sourceLat: number;
  sourceLng: number;
  destinationCountry: string;
  threatType: string;
  firstSeen: string;
}

export async function fetchThreatMapData(): Promise<ThreatMapEntry[]> {
  try {
    const response = await fetch(
      "https://urlhaus.abuse.ch/downloads/json_recent/",
      { next: { revalidate: 300 } } // 5 min cache
    );

    if (!response.ok) throw new Error(`abuse.ch API error: ${response.status}`);

    const data: unknown = await response.json();
    // Current URLhaus format: { "<id>": [ { url, threat, dateadded, ... }, ... ], ... }
    const raw = Object.values(asRecord(data) ?? {}).flatMap((v) => asArray(v));

    // Resolve hosts to coordinates via ip-api (batch of 40 stays under 45 req/min)
    const candidates: { host: string; threat: string; firstSeen: string }[] = [];
    for (const item of raw) {
      if (candidates.length >= 40) break;
      const rec = asRecord(item);
      const url = asString(rec?.url);
      if (!url) continue;
      let host: string;
      try {
        host = new URL(url).hostname;
      } catch {
        continue;
      }
      candidates.push({
        host,
        threat: asString(rec?.threat, "malware"),
        firstSeen: asString(rec?.dateadded, new Date().toISOString()),
      });
    }

    const geos = await Promise.all(candidates.map((c) => lookupIP(c.host)));
    const entries: ThreatMapEntry[] = [];
    for (let i = 0; i < candidates.length; i++) {
      const geo = geos[i];
      if (!geo) continue;
      entries.push({
        sourceIP: candidates[i].host,
        sourceCountry: geo.country,
        sourceLat: geo.lat,
        sourceLng: geo.lng,
        destinationCountry: "US",
        threatType: candidates[i].threat,
        firstSeen: candidates[i].firstSeen,
      });
    }

    return entries;
  } catch (error) {
    console.error("Error fetching threat map data:", error);
    return [];
  }
}
