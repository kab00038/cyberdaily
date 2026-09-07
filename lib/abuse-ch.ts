// lib/abuse-ch.ts — CISA KEV catalog + blocklist.de threat map data.
//
// Important: `fetchKEVCatalog()` returns the FULL normalized catalog so
// consumers can perform membership lookups against every known exploited
// vulnerability. Slicing to a "recent" subset must happen in the consumer.
//
// The blocklist.de fetcher samples up to N IPs per category and resolves
// geolocation via lib/geoip. The returned field is `observedAt` (the time
// this snapshot was assembled), NOT `firstSeen` — we have no first-seen
// data from the upstream feed.
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

/**
 * Returns the full KEV catalog, sorted by dateAdded descending.
 *
 * The endpoint is cached for one hour. Callers that only need a "recent"
 * subset should slice the result after building a lookup map.
 */
export async function fetchKEVCatalog(): Promise<KEVItem[]> {
  try {
    const response = await fetch(
      "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) throw new Error(`CISA KEV API error ${response.status}`);

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
      .filter((entry) => entry.cveID !== "")
      .sort(
        (a, b) =>
          (Date.parse(b.dateAdded) || 0) - (Date.parse(a.dateAdded) || 0)
      );
  } catch (error) {
    console.error("Error fetching KEV catalog:", error);
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
  /**
   * When this snapshot of the data was assembled. Renamed from
   * `firstSeen` to be truthful: the upstream feed does not provide
   * first-seen timestamps for blocklist.de entries.
   */
  observedAt: string;
}

const BLOCKLIST_CATEGORIES = [
  { list: "ssh", label: "SSH Brute-Force" },
  { list: "mail", label: "Email Spam/Abuse" },
  { list: "apache", label: "Web Attack (DDoS/SQLi)" },
  { list: "ftp", label: "FTP Brute-Force" },
  { list: "sip", label: "VoIP/SIP Attack" },
  { list: "bots", label: "Botnet Activity" },
  { list: "bruteforcelogin", label: "Login Brute-Force" },
  { list: "ircbot", label: "IRC Bot" },
  { list: "strongips", label: "Aggressive Scanner" },
];

export async function fetchThreatMapData(
  perCategory: number = 6
): Promise<ThreatMapEntry[]> {
  try {
    const results = await Promise.allSettled(
      BLOCKLIST_CATEGORIES.map(async (cat) => {
        const res = await fetch(
          `https://lists.blocklist.de/lists/${cat.list}.txt`,
          { next: { revalidate: 300 } }
        );
        if (!res.ok) return { category: cat.label, ips: [] as string[] };
        const text = await res.text();
        const ips = text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#") && line.includes("."));
        return { category: cat.label, ips };
      })
    );

    const categoryMap = new Map<string, string[]>();
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { category, ips } = result.value;
      if (ips.length > 0) {
        categoryMap.set(category, ips);
      }
    }

    const sampled: [string, string][] = [];
    for (const [category, ips] of categoryMap) {
      const shuffled = [...ips].sort(() => Math.random() - 0.5);
      for (const ip of shuffled.slice(0, perCategory)) {
        sampled.push([ip, category]);
      }
    }

    const geos = await Promise.all(sampled.map(([ip]) => lookupIP(ip)));
    const observedAt = new Date().toISOString();
    const entries: ThreatMapEntry[] = [];

    for (let i = 0; i < sampled.length; i++) {
      const geo = geos[i];
      if (!geo) continue;
      entries.push({
        sourceIP: sampled[i][0],
        sourceCountry: geo.country,
        sourceLat: geo.lat,
        sourceLng: geo.lng,
        destinationCountry: "Global",
        threatType: sampled[i][1],
        observedAt,
      });
    }

    return entries;
  } catch (error) {
    console.error("Error fetching threat map data:", error);
    return [];
  }
}
