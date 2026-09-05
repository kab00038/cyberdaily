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

// blocklist.de attack categories with human-readable labels
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

export async function fetchThreatMapData(): Promise<ThreatMapEntry[]> {
  try {
    // Fetch from multiple blocklist.de categories in parallel
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

    // Collect IPs with their attack categories
    const ipCategories = new Map<string, string>();
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { category, ips } = result.value;
      for (const ip of ips) {
        // First category wins if IP appears in multiple lists
        if (!ipCategories.has(ip)) {
          ipCategories.set(ip, category);
        }
      }
    }

    // Sample up to 50 unique IPs across categories
    const sampled = Array.from(ipCategories.entries()).slice(0, 50);

    // Resolve to coordinates via ip-api.com
    const geos = await Promise.all(
      sampled.map(([ip]) => lookupIP(ip))
    );

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
        firstSeen: new Date().toISOString(),
      });
    }

    return entries;
  } catch (error) {
    console.error("Error fetching threat map data:", error);
    return [];
  }
}
