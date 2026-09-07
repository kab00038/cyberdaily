// components/NewsFeed.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { NewsItem } from "@/lib/rss";
import { formatPublishedAt } from "@/lib/format";
import NewsRow from "@/components/news/NewsRow";
import NewsToolbar from "@/components/news/NewsToolbar";

const PAGE_SIZE = 20;
const REFRESH_MS = 900000; // 15 min

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [days, setDays] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  // Reset the pagination window whenever the active filters change.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, source, days]);

  const sources = useMemo(
    () =>
      [...new Set(news.map((n) => n.source).filter((s): s is string => Boolean(s)))].sort(),
    [news]
  );

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cutoff = days === null ? null : Date.now() - days * 86_400_000;

    const filtered = news.filter((item) => {
      if (source !== "all" && item.source !== source) return false;

      if (days !== null) {
        const ts = item.pubDate ? Date.parse(item.pubDate) : NaN;
        // Items with invalid/missing pubDate are not "fresh enough" — they
        // fail the date filter.
        if (!Number.isFinite(ts)) return false;
        if ((ts as number) < (cutoff as number)) return false;
      }

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
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      if (!aValid && !bValid) return 0;
      return (bTs as number) - (aTs as number);
    });
  }, [news, source, days, query]);

  const clearFilters = () => {
    setQuery("");
    setSource("all");
    setDays(null);
  };

  return (
    <div className="space-y-3">
      <NewsToolbar
        query={query}
        onQueryChange={setQuery}
        source={source}
        onSourceChange={setSource}
        sources={sources}
        days={days}
        onDaysChange={setDays}
        totalCount={news.length}
        visibleCount={Math.min(visibleCount, visibleItems.length)}
        onClearFilters={clearFilters}
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
              className="text-xs font-mono uppercase tracking-widest text-ui-accent border border-ui-accent/30 rounded px-3 py-2 hover:bg-ui-accent/10 transition-colors"
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
                className="w-full py-3 text-xs font-mono uppercase tracking-widest text-ui-accent border border-ui-accent/30 rounded-lg hover:bg-ui-accent/10 hover:border-ui-accent/50 transition-colors"
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