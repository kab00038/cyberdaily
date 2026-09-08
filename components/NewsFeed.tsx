// components/NewsFeed.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { NewsItem } from "@/lib/rss";
import { formatPublishedAt, isPublishedWithin } from "@/lib/format";
import NewsRow from "@/components/news/NewsRow";
import NewsToolbar, {
  buildFilteredUrl,
} from "@/components/news/NewsToolbar";

const PAGE_SIZE = 20;
const REFRESH_MS = 900000; // 15 min

export default function NewsFeed() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Stable reference clock set once on mount so server and client agree
  // during the initial render; not re-ticked every second.
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchNews() {
      try {
        const res = await fetch("/api/news");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setNews(data);
          setError(false);
        }
      } catch (err) {
        console.error("Failed to fetch news:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNews();
    const interval = setInterval(fetchNews, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Filter state lives in the URL: q, source, period (hours), sort.
  const query = searchParams.get("q") ?? "";
  const source = searchParams.get("source") ?? "all";
  const periodParam = searchParams.get("period");
  const hours =
    periodParam !== null &&
    Number.isFinite(Number(periodParam)) &&
    Number(periodParam) > 0
      ? Number(periodParam)
      : null;
  const sort = searchParams.get("sort") ?? "recent";

  // Reset the pagination window whenever the active filters change.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, source, periodParam, sort]);

  const sources = useMemo(
    () =>
      [...new Set(news.map((n) => n.source).filter((s): s is string => Boolean(s)))].sort(),
    [news]
  );

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = news.filter((item) => {
      if (source !== "all" && item.source !== source) return false;

      // FIX-01: future-dated, invalid, or outside-window items are excluded.
      if (!isPublishedWithin(item.pubDate, nowMs, hours)) return false;

      if (q) {
        const haystack = `${item.title} ${item.snippet} ${item.source}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const aTs = a.pubDate ? Date.parse(a.pubDate) : NaN;
      const bTs = b.pubDate ? Date.parse(b.pubDate) : NaN;
      const aValid = Number.isFinite(aTs);
      const bValid = Number.isFinite(bTs);
      if (sort === "source") {
        const srcCmp = a.source.localeCompare(b.source);
        if (srcCmp !== 0) return srcCmp;
      }
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      if (!aValid && !bValid) return 0;
      return (bTs as number) - (aTs as number);
    });
  }, [news, source, hours, query, sort, nowMs]);

  const hasActiveFilters = query !== "" || source !== "all" || hours !== null;

  const clearFilters = () => {
    router.replace(
      buildFilteredUrl(pathname, searchParams, {
        q: null,
        source: null,
        period: null,
        sort: null,
      }),
      { scroll: false }
    );
  };

  const resultLabel = hasActiveFilters
    ? `${visibleItems.length} matching stories · ${news.length} loaded`
    : `${news.length} stories`;

  return (
    <div className="space-y-3">
      <NewsToolbar
        sources={sources}
        resultLabel={resultLabel}
        hasActiveFilters={hasActiveFilters}
      />

      <div aria-busy={loading || undefined}>
        {loading ? (
          <SkeletonList />
        ) : error && news.length === 0 ? (
          <p className="px-1 py-6 text-sm text-ui-muted">
            Unable to load news. Try refreshing.
          </p>
        ) : visibleItems.length === 0 ? (
          <div className="px-1 py-6 space-y-3">
            <p className="text-sm text-ui-muted">No stories match these filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-mono text-ui-accent border border-ui-accent/30 rounded px-3 py-2 hover:bg-ui-accent/10 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-ui-border overflow-hidden">
              {visibleItems.slice(0, visibleCount).map((item) => (
                <NewsRow
                  key={item.link}
                  item={item}
                  dateLabel={formatPublishedAt(item.pubDate)}
                />
              ))}
            </div>

            {visibleCount < visibleItems.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="w-full py-3 text-xs font-mono text-ui-accent border border-ui-accent/30 rounded-lg hover:bg-ui-accent/10 hover:border-ui-accent/50 transition-colors"
              >
                Load more stories
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex gap-5 px-5 py-5 border border-ui-border rounded-lg animate-pulse"
        >
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-white/[0.08] rounded w-1/3" />
            <div className="h-4 bg-white/[0.08] rounded w-3/4" />
            <div className="h-3 bg-white/[0.08] rounded w-1/2" />
          </div>
          <div className="hidden sm:block w-24 h-24 bg-white/[0.08] rounded-lg" />
        </div>
      ))}
    </div>
  );
}