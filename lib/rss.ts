// lib/rss.ts — edge-compatible (fetch + fast-xml-parser, no Node http modules)
import { XMLParser } from "fast-xml-parser";
import { asArray, asRecord, asString, asText } from "./parse";

export interface NewsItem {
  title: string;
  link: string;
  snippet: string;
  source: string;
  /**
   * RFC-3339 publication date string. `null` when the feed does not
   * supply a usable timestamp — never synthesized to "now".
   */
  pubDate: string | null;
  thumbnail?: string;
  /**
   * AI-enriched fields merged onto each item by the `/api/news` route.
   * Optional because the raw feed parser does not populate them.
   */
  aiSummary?: string | null;
  category?: string | null;
  urgency?: string | null;
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

async function fetchSingleFeedResult(feed: {
  url: string;
  name: string;
}): Promise<{ items: NewsItem[]; fetchedAt: string }> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "CyberDaily/1.0 (+https://cyberdaily.pages.dev)" },
    next: { revalidate: 900 }, // match the 15-minute feed cadence
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const doc: unknown = parser.parse(xml);
  const root = asRecord(doc) ?? {};
  const channel = asRecord(
    asRecord(root.rss)?.channel ?? root.feed ?? root["rdf:RDF"]
  );
  const items = asArray(channel?.item ?? channel?.entry);
  const parsed = items.map((entry) => {
    const item = asRecord(entry) ?? {};
    let pubDate: string | null = null;
    for (const key of ["pubDate", "published", "updated", "dc:date"]) {
      const value = item[key];
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed)) {
          pubDate = new Date(parsed).toISOString();
        }
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
  return { items: parsed, fetchedAt: new Date().toISOString() };
}

async function fetchSingleFeed(feed: { url: string; name: string }): Promise<NewsItem[]> {
  try {
    const result = await fetchSingleFeedResult(feed);
    return result.items;
  } catch (error) {
    console.error(`Error fetching ${feed.name}:`, error);
    return [];
  }
}

/** Per-feed health probe — used by `/api/sources` and route `sourceMeta`. */
export interface FeedStatus {
  name: string;
  ok: boolean;
  count: number;
  fetchedAt: string | null;
  /** Newest item publication time across the feed (upstream freshness). */
  latestItemAt: string | null;
  message?: string;
}

function sortByNewest(items: NewsItem[]): NewsItem[] {
  return items.sort((a, b) => {
    const aTs = a.pubDate ? Date.parse(a.pubDate) : NaN;
    const bTs = b.pubDate ? Date.parse(b.pubDate) : NaN;
    const aValid = Number.isFinite(aTs);
    const bValid = Number.isFinite(bTs);
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    if (!aValid && !bValid) return 0;
    return (bTs as number) - (aTs as number);
  });
}

export async function fetchRSSFeedStatuses(): Promise<FeedStatus[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchSingleFeedResult(feed))
  );
  return results.map((result, i) => {
    const feed = RSS_FEEDS[i];
    if (result.status === "fulfilled") {
      const latestItemAt = result.value.items.reduce<string | null>(
        (latest, item) => {
          if (!item.pubDate) return latest;
          return !latest || item.pubDate > latest ? item.pubDate : latest;
        },
        null
      );
      return {
        name: feed.name,
        ok: true,
        count: result.value.items.length,
        fetchedAt: result.value.fetchedAt,
        latestItemAt,
      };
    }
    return {
      name: feed.name,
      ok: false,
      count: 0,
      fetchedAt: null,
      latestItemAt: null,
      message:
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
    };
  });
}

/** Fetch every feed once, returning the items and the per-feed status in a
 *  single pass so callers never double-fetch the upstreams. */
export async function fetchRSSFeedsWithStatus(): Promise<{
  items: NewsItem[];
  feeds: FeedStatus[];
}> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchSingleFeedResult(feed))
  );
  const feeds: FeedStatus[] = results.map((result, i) => {
    const feed = RSS_FEEDS[i];
    if (result.status === "fulfilled") {
      const latestItemAt = result.value.items.reduce<string | null>(
        (latest, item) => {
          if (!item.pubDate) return latest;
          return !latest || item.pubDate > latest ? item.pubDate : latest;
        },
        null
      );
      return {
        name: feed.name,
        ok: true,
        count: result.value.items.length,
        fetchedAt: result.value.fetchedAt,
        latestItemAt,
      };
    }
    return {
      name: feed.name,
      ok: false,
      count: 0,
      fetchedAt: null,
      latestItemAt: null,
      message:
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
    };
  });

  const allItems = results
    .filter(
      (r): r is PromiseFulfilledResult<{ items: NewsItem[]; fetchedAt: string }> =>
        r.status === "fulfilled"
    )
    .flatMap((r) => r.value.items);

  return { items: sortByNewest(allItems), feeds };
}

export async function fetchRSSFeeds(): Promise<NewsItem[]> {
  const { items } = await fetchRSSFeedsWithStatus();
  return items;
}
