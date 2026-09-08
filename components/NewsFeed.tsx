// components/NewsFeed.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  // Incoming items that arrived after a refresh but aren't shown yet, so the
  // list doesn't shuffle under a user mid-reading. Staged until they Refresh.
  const [pendingNews, setPendingNews] = useState<NewsItem[] | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Count of items the user has "seen" (committed to `news`). Used to decide
  // whether a newer fetch actually contains new stories worth announcing.
  const seenCountRef = useRef(0);
  // Distinguishes the first successful load (render immediately) from a later
  // refresh where new items arriving should trigger the banner instead.
  const initializedRef = useRef(false);
  // Stable reference clock set once on mount so server and client agree
  // during the initial render; not re-ticked every second.
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  useEffect(() => {
    // A fresh controller per fetch cycle so the cleanup abort never kills an
    // in-flight request that a later interval tick started.
    let controller: AbortController | null = null;

    async function fetchNews() {
      controller = new AbortController();
      try {
        const res = await fetch("/api/news", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (controller.signal.aborted) return;
        setError(false);
        // `/api/news` returns `{ items, generatedAt, sourceMeta }`; tolerate
        // a bare array too so older caches keep working.
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];

        if (!initializedRef.current) {
          // First successful load: show it right away.
          initializedRef.current = true;
          seenCountRef.current = items.length;
          setNews(items);
        } else if (items.length > seenCountRef.current) {
          // New stories arrived during a refresh: offer a refresh instead of
          // shuffling the content under the reader.
          setPendingNews(items);
          setPendingCount(items.length - seenCountRef.current);
        } else {
          // Same count (or fewer): apply in place — nothing new to announce.
          seenCountRef.current = items.length;
          setNews(items);
          setPendingNews(null);
          setPendingCount(0);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Failed to fetch news:", err);
        if (controller.signal.aborted) return;
        // Preserve previously loaded content on a refresh failure.
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchNews();
    const interval = setInterval(fetchNews, REFRESH_MS);
    return () => {
      controller?.abort();
      clearInterval(interval);
    };
  }, []);

  // Apply a staged "New stories available" update on demand.
  const applyPending = () => {
    if (!pendingNews) return;
    seenCountRef.current = pendingNews.length;
    setNews(pendingNews);
    setPendingNews(null);
    setPendingCount(0);
  };

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

      {pendingCount > 0 && pendingNews && !loading && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2.5 text-sm text-ui-text"
        >
          <span>
            {pendingCount} new {pendingCount === 1 ? "story" : "stories"}{" "}
            available. Refresh to view.
          </span>
          <button
            type="button"
            onClick={applyPending}
            className="shrink-0 text-xs font-mono text-ui-accent border border-ui-accent/30 rounded px-3 py-1.5 hover:bg-ui-accent/10 transition-colors"
          >
            Refresh
          </button>
        </div>
      )}

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