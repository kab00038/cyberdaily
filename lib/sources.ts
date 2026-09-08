// lib/sources.ts — Data source catalog and health probing.
//
// Single source of truth for every upstream feed CyberDaily consumes. The
// `/api/sources` route, the Sources page, and the header health indicator all
// build on `collectSourceStatuses()`, so the whole app reports the same
// evidence-backed freshness instead of a decorative "Operational" badge.

import { fetchRSSFeedStatuses } from "@/lib/rss";
import { fetchCVELatest } from "@/lib/nvd";
import { fetchKEVCatalog, BLOCKLIST_CATEGORIES } from "@/lib/abuse-ch";
import { fetchEPSSScores, type EPSSScore } from "@/lib/epss";
import { fetchHackerNewsStories } from "@/lib/hn";
import { fetchOsintFeed } from "@/lib/osint";
import { isGroqConfigured } from "@/lib/ai";

export type SourceCategory =
  | "news"
  | "vulnerabilities"
  | "community"
  | "threatmap"
  | "enrichment";

export interface SourceStatus {
  id: string;
  label: string;
  category: SourceCategory;
  status: "ok" | "partial" | "error";
  /** When the probe last saw a successful fetch from this source. */
  lastSuccessfulFetchAt: string | null;
  /** Newest upstream item/timestamp the probe observed (source freshness). */
  upstreamUpdatedAt: string | null;
  /** Items/samples the probe observed (e.g. CVE count, feed item count). */
  count: number | null;
  message?: string;
}

export interface SourceCatalogEntry {
  id: string;
  label: string;
  category: SourceCategory;
  description: string;
  upstreamUrl: string;
  cadence: string;
}

export const SOURCE_CATALOG: SourceCatalogEntry[] = [
  // News
  {
    id: "bleepingcomputer",
    label: "BleepingComputer",
    category: "news",
    description: "Cybersecurity news, malware analysis, and breach coverage.",
    upstreamUrl: "https://www.bleepingcomputer.com/",
    cadence: "Refreshed every 15 min",
  },
  {
    id: "the-hacker-news",
    label: "The Hacker News",
    category: "news",
    description: "Infosec news and threat intelligence reporting.",
    upstreamUrl: "https://thehackernews.com/",
    cadence: "Refreshed every 15 min",
  },
  {
    id: "krebs-on-security",
    label: "Krebs on Security",
    category: "news",
    description: "Investigative reporting on cybercrime by Brian Krebs.",
    upstreamUrl: "https://krebsonsecurity.com/",
    cadence: "Refreshed every 15 min",
  },
  {
    id: "dark-reading",
    label: "Dark Reading",
    category: "news",
    description: "Enterprise security news and analysis.",
    upstreamUrl: "https://www.darkreading.com/",
    cadence: "Refreshed every 15 min",
  },
  {
    id: "securityweek",
    label: "SecurityWeek",
    category: "news",
    description: "Cybersecurity news and insight for professionals.",
    upstreamUrl: "https://www.securityweek.com/",
    cadence: "Refreshed every 15 min",
  },
  {
    id: "the-record",
    label: "The Record",
    category: "news",
    description: "Reporting from Recorded Future News.",
    upstreamUrl: "https://therecord.media/",
    cadence: "Refreshed every 15 min",
  },
  {
    id: "groq-enrichment",
    label: "Groq enrichment",
    category: "news",
    description:
      "AI threat summaries for top news items. Asynchronous — may be unavailable.",
    upstreamUrl: "https://groq.com/",
    cadence: "Async enrichment per fetch",
  },
  // Vulnerabilities
  {
    id: "nvd-cve-2.0",
    label: "NVD CVE 2.0",
    category: "vulnerabilities",
    description:
      "U.S. National Vulnerability Database. Last 14 days, partial results.",
    upstreamUrl: "https://nvd.nist.gov/",
    cadence: "Refreshed hourly",
  },
  {
    id: "cisa-kev",
    label: "CISA KEV",
    category: "vulnerabilities",
    description: "CISA Known Exploited Vulnerabilities catalog (full).",
    upstreamUrl:
      "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    cadence: "Refreshed hourly",
  },
  {
    id: "first-epss",
    label: "FIRST EPSS",
    category: "vulnerabilities",
    description: "Exploit Prediction Scoring System scores for loaded CVEs.",
    upstreamUrl: "https://www.first.org/epss/",
    cadence: "Refreshed hourly",
  },
  // Community
  {
    id: "hacker-news",
    label: "Hacker News (Algolia)",
    category: "community",
    description:
      "Cybersecurity discussions via the Algolia search API (date-bounded).",
    upstreamUrl: "https://news.ycombinator.com/",
    cadence: "Refreshed every 15 min",
  },
  {
    id: "reddit-osint",
    label: "Reddit (subreddits)",
    category: "community",
    description: "Posts from security-focused subreddits via RSS.",
    upstreamUrl: "https://www.reddit.com/r/netsec/",
    cadence: "Refreshed every 15 min",
  },
  // Map
  {
    id: "blocklist-de",
    label: "blocklist.de",
    category: "threatmap",
    description:
      "Live attack sources across 9 categories; IP geolocation via ip-api.com (sampled snapshot).",
    upstreamUrl: "https://www.blocklist.de/",
    cadence: "Sampled every 5 min",
  },
];

const PROBE_TIMEOUT_MS = 10_000;

/** Bound a probe so one slow upstream cannot stall the whole snapshot. */
async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Probe timed out")),
      PROBE_TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function newestIso(...values: (string | null | undefined)[]): string | null {
  let latest: string | null = null;
  for (const value of values) {
    if (!value) continue;
    const ts = Date.parse(value);
    if (Number.isFinite(ts) && (!latest || ts > Date.parse(latest))) {
      latest = value;
    }
  }
  return latest;
}

const FEED_ID_BY_NAME: Record<string, string> = {
  BleepingComputer: "bleepingcomputer",
  "The Hacker News": "the-hacker-news",
  "Krebs on Security": "krebs-on-security",
  "Dark Reading": "dark-reading",
  SecurityWeek: "securityweek",
  "The Record": "the-record",
};

/**
 * Lightweight blocklist.de probe: fetch the category lists and count the
 * IP lines. Deliberately skips the per-IP geolocation that the threat-map
 * route performs, so the 60-second header poll stays cheap.
 */
async function probeBlocklistDe(): Promise<{
  ok: boolean;
  count: number;
  message?: string;
}> {
  const results = await Promise.allSettled(
    BLOCKLIST_CATEGORIES.map(async (cat) => {
      const res = await fetch(
        `https://lists.blocklist.de/lists/${cat.list}.txt`,
        { next: { revalidate: 300 } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      return text
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("#") && line.includes("."))
        .length;
    })
  );

  const fulfilled = results.filter(
    (r): r is PromiseFulfilledResult<number> => r.status === "fulfilled"
  );
  const failed = results.length - fulfilled.length;
  const count = fulfilled.reduce((sum, r) => sum + r.value, 0);

  return {
    ok: fulfilled.length > 0,
    count,
    message:
      failed > 0
        ? `${failed} of ${results.length} categories unavailable`
        : undefined,
  };
}

export async function collectSourceStatuses(): Promise<SourceStatus[]> {
  const statuses: SourceStatus[] = [];

  // Fire every independent probe in parallel, each with its own budget.
  const [feeds, nvd, kev, hn, reddit, blocklist] = await Promise.allSettled([
    withTimeout(fetchRSSFeedStatuses()),
    withTimeout(fetchCVELatest()),
    withTimeout(fetchKEVCatalog()),
    withTimeout(fetchHackerNewsStories("latest", { days: 7 })),
    withTimeout(fetchOsintFeed(30)),
    withTimeout(probeBlocklistDe()),
  ]);

  // News RSS feeds — one status per feed.
  if (feeds.status === "fulfilled") {
    for (const feed of feeds.value) {
      statuses.push({
        id: FEED_ID_BY_NAME[feed.name] ?? `news-${feed.name.toLowerCase()}`,
        label: feed.name,
        category: "news",
        status: feed.ok ? "ok" : "error",
        lastSuccessfulFetchAt: feed.ok ? feed.fetchedAt : null,
        upstreamUpdatedAt: feed.latestItemAt,
        count: feed.ok ? feed.count : null,
        message: feed.ok ? undefined : feed.message ?? "Feed unreachable",
      });
    }
  } else {
    // Whole probe batch failed (e.g. edge sandbox restriction) — mark feeds
    // unknown rather than pretending they are healthy.
    statuses.push({
      id: "news-feeds",
      label: "News RSS feeds",
      category: "news",
      status: "error",
      lastSuccessfulFetchAt: null,
      upstreamUpdatedAt: null,
      count: null,
      message: "Feed probe failed",
    });
  }

  // Groq enrichment — configuration probe (no paid API call from health polls).
  statuses.push({
    id: "groq-enrichment",
    label: "Groq enrichment",
    category: "news",
    status: isGroqConfigured() ? "ok" : "partial",
    lastSuccessfulFetchAt: isGroqConfigured() ? new Date().toISOString() : null,
    upstreamUpdatedAt: null,
    count: null,
    message: isGroqConfigured()
      ? undefined
      : "GROQ_API_KEY not configured — AI summaries unavailable",
  });

  // NVD CVE 2.0.
  if (nvd.status === "fulfilled") {
    const result = nvd.value;
    statuses.push({
      id: "nvd-cve-2.0",
      label: "NVD CVE 2.0",
      category: "vulnerabilities",
      status: result.error === null ? "ok" : "error",
      lastSuccessfulFetchAt: result.error === null ? result.fetchedAt : null,
      upstreamUpdatedAt:
        newestIso(result.windowEnd, result.items[0]?.publishedAt) ??
        result.windowEnd,
      count: result.items.length,
      message: result.error ?? undefined,
    });
  }

  // CISA KEV. The catalog reliably carries ~1,000+ entries, so an empty array
  // means the upstream failed rather than a genuinely empty catalog.
  if (kev.status === "fulfilled") {
    const catalog = kev.value;
    statuses.push({
      id: "cisa-kev",
      label: "CISA KEV",
      category: "vulnerabilities",
      status: catalog.length > 0 ? "ok" : "error",
      lastSuccessfulFetchAt:
        catalog.length > 0 ? new Date().toISOString() : null,
      upstreamUpdatedAt: newestIso(catalog[0]?.dateAdded),
      count: catalog.length,
      message:
        catalog.length > 0 ? undefined : "Catalog empty or fetch failed",
    });
  }

  // FIRST EPSS — depends on the NVD ids from the same probe pass.
  let epssMap = new Map<string, EPSSScore>();
  if (nvd.status === "fulfilled") {
    const ids = nvd.value.items.map((c) => c.id);
    if (ids.length > 0) {
      epssMap = await withTimeout(fetchEPSSScores(ids)).catch(
        () => new Map<string, EPSSScore>()
      );
    }
  }
  statuses.push({
    id: "first-epss",
    label: "FIRST EPSS",
    category: "vulnerabilities",
    status: epssMap.size > 0 ? "ok" : "error",
    lastSuccessfulFetchAt:
      epssMap.size > 0 ? new Date().toISOString() : null,
    upstreamUpdatedAt: newestIso(
      ...Array.from(epssMap.values()).map((s) => s.date)
    ),
    count: epssMap.size,
    message:
      epssMap.size > 0
        ? undefined
        : "No EPSS scores returned for loaded CVEs",
  });

  // Hacker News.
  if (hn.status === "fulfilled") {
    const stories = hn.value;
    statuses.push({
      id: "hacker-news",
      label: "Hacker News (Algolia)",
      category: "community",
      status: stories.length > 0 ? "ok" : "error",
      lastSuccessfulFetchAt:
        stories.length > 0 ? new Date().toISOString() : null,
      upstreamUpdatedAt: newestIso(stories[0]?.publishedAt),
      count: stories.length,
      message: stories.length > 0 ? undefined : "No stories returned",
    });
  }

  // Reddit.
  if (reddit.status === "fulfilled") {
    const posts = reddit.value;
    statuses.push({
      id: "reddit-osint",
      label: "Reddit (subreddits)",
      category: "community",
      status: posts.length > 0 ? "ok" : "error",
      lastSuccessfulFetchAt: posts.length > 0 ? new Date().toISOString() : null,
      upstreamUpdatedAt: newestIso(posts[0]?.publishedAt),
      count: posts.length,
      message: posts.length > 0 ? undefined : "No posts returned",
    });
  }

  // blocklist.de.
  if (blocklist.status === "fulfilled") {
    statuses.push({
      id: "blocklist-de",
      label: "blocklist.de",
      category: "threatmap",
      status: blocklist.value.ok ? "ok" : "error",
      lastSuccessfulFetchAt: blocklist.value.ok
        ? new Date().toISOString()
        : null,
      upstreamUpdatedAt: null,
      count: blocklist.value.count,
      message: blocklist.value.message,
    });
  }

  return statuses;
}

/** Reduce a source snapshot to one headline for the header indicator. */
export function aggregateHealth(
  statuses: SourceStatus[]
): { state: "ok" | "partial" | "error"; label: string } {
  if (statuses.length === 0) {
    return { state: "error", label: "No source data" };
  }
  if (statuses.some((s) => s.status === "error")) {
    return { state: "error", label: "Some sources unavailable" };
  }
  if (statuses.some((s) => s.status === "partial")) {
    return { state: "partial", label: "Some sources partial" };
  }
  return { state: "ok", label: "All sources operational" };
}

/** Convert per-feed probe results into the `sourceMeta` the news route
 *  attaches to its payload. IDs stay aligned with `SOURCE_CATALOG`. */
export function newsSourceStatuses(
  feeds: { name: string; ok: boolean; count: number; fetchedAt: string | null; latestItemAt: string | null; message?: string }[]
): SourceStatus[] {
  return feeds.map((feed) => ({
    id: FEED_ID_BY_NAME[feed.name] ?? `news-${feed.name.toLowerCase()}`,
    label: feed.name,
    category: "news",
    status: feed.ok ? "ok" : "error",
    lastSuccessfulFetchAt: feed.ok ? feed.fetchedAt : null,
    upstreamUpdatedAt: feed.latestItemAt,
    count: feed.ok ? feed.count : null,
    message: feed.ok ? undefined : feed.message ?? "Feed unreachable",
  }));
}