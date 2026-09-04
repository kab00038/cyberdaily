// lib/rss.ts — edge-compatible (fetch + fast-xml-parser, no Node http modules)
import { XMLParser } from "fast-xml-parser";
import { asArray, asRecord, asString, asText } from "./parse";

export interface NewsItem {
  title: string;
  link: string;
  snippet: string;
  source: string;
  pubDate: string;
  thumbnail?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

const RSS_FEEDS = [
  { url: "https://www.bleepingcomputer.com/feed/", name: "BleepingComputer" },
  { url: "https://feeds.feedburner.com/TheHackersNews", name: "The Hacker News" },
  { url: "https://krebsonsecurity.com/feed/", name: "Krebs on Security" },
  { url: "https://www.darkreading.com/rss.xml", name: "Dark Reading" },
  { url: "https://www.securityweek.com/feed/", name: "SecurityWeek" },
  { url: "https://therecord.media/feed", name: "The Record" },
];

function extractSnippet(content: unknown, maxLength: number = 200): string {
  const raw = asText(content);
  if (!raw) return "";
  const textOnly = raw.replace(/<[^>]*>/g, "");
  return textOnly.length > maxLength
    ? textOnly.substring(0, maxLength) + "..."
    : textOnly;
}

function extractLink(item: Record<string, unknown>): string {
  const link = item.link;
  if (typeof link === "string") return link;
  if (Array.isArray(link)) {
    // Atom: <link href=... rel=alternate/> (rel may be absent for the primary link)
    for (const l of link) {
      const rec = asRecord(l);
      const href = asString(rec?.["@_href"]);
      if (href && (rec?.["@_rel"] === undefined || rec?.["@_rel"] === "alternate")) {
        return href;
      }
    }
    return "#";
  }
  return asString(asRecord(link)?.["@_href"], "#");
}

function extractThumbnail(item: Record<string, unknown>): string | undefined {
  for (const key of ["media:content", "media:thumbnail"]) {
    const url = asString(asRecord(item[key])?.["@_url"]);
    if (url) return url;
  }
  const enclosure = asString(asRecord(item.enclosure)?.["@_url"]);
  if (enclosure.startsWith("http")) return enclosure;
  const html =
    asText(item["content:encoded"]) || asText(item.content) || asText(item.description);
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/);
  return imgMatch ? imgMatch[1] : undefined;
}

async function fetchSingleFeed(feed: { url: string; name: string }): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "CyberDaily/1.0 (+https://cyberdaily.pages.dev)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const doc: unknown = parser.parse(xml);
    const root = asRecord(doc) ?? {};
    const channel = asRecord(
      asRecord(root.rss)?.channel ?? root.feed ?? root["rdf:RDF"]
    );
    const items = asArray(channel?.item ?? channel?.entry);
    return items.map((entry) => {
      const item = asRecord(entry) ?? {};
      let pubDate = new Date().toISOString();
      for (const key of ["pubDate", "published", "updated", "dc:date"]) {
        const value = item[key];
        if (typeof value === "string") {
          pubDate = value;
          break;
        }
      }
      return {
        title: asText(item.title) || "Untitled",
        link: extractLink(item),
        snippet: extractSnippet(
          item.description ?? item.summary ?? item["content:encoded"] ?? item.content
        ),
        source: feed.name,
        pubDate,
        thumbnail: extractThumbnail(item),
      };
    });
  } catch (error) {
    console.error(`Error fetching ${feed.name}:`, error);
    return [];
  }
}

export async function fetchRSSFeeds(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchSingleFeed(feed))
  );

  const allItems = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  return allItems.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
}
