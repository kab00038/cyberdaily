// components/news/NewsToolbar.tsx
// Search + filter toolbar for the news feed. Filter state lives in the URL
// (`q`, `source`, `period`, `sort`) so selections survive navigation and are
// shareable. This component reads the current filter values from the search
// params and writes changes back via `router.replace` (no history entries per
// keystroke). The query text is debounced (~300 ms) before hitting the URL.
//
// All controls are native form elements with persistent, visible labels so
// the toolbar is keyboard-navigable and screen-reader friendly.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export interface NewsToolbarProps {
  /** Unique source names to offer in the Source select. */
  sources: string[];
  /** "X matching stories · Y loaded" or "Y stories". */
  resultLabel: string;
  /** Whether any filter (not sort) is currently active. */
  hasActiveFilters: boolean;
}

/**
 * Build a URL string for the given filter updates. Values of `null` or ""
 * remove the param; anything else sets it. Existing unrelated params are kept.
 */
export function buildFilteredUrl(
  pathname: string,
  current: URLSearchParams,
  next: Record<string, string | null>
): string {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(next)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All loaded stories" },
  { value: "24", label: "24 hours" },
  { value: "168", label: "7 days" },
  { value: "720", label: "30 days" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "source", label: "Source" },
];

const QUERY_DEBOUNCE_MS = 300;

export default function NewsToolbar({
  sources,
  resultLabel,
  hasActiveFilters,
}: NewsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const source = searchParams.get("source") ?? "all";
  const period = searchParams.get("period"); // hours as string, or null
  const sort = searchParams.get("sort") ?? "recent";

  // Local copy of the query text so typing stays snappy while the URL update
  // is debounced. Adopted back from the URL on external changes (back/forward).
  const [inputValue, setInputValue] = useState(q);
  const committedRef = useRef(q);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (q !== committedRef.current) {
      setInputValue(q);
      committedRef.current = q;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [q]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const updateUrl = (next: Record<string, string | null>) => {
    router.replace(buildFilteredUrl(pathname, searchParams, next), {
      scroll: false,
    });
  };

  const handleQueryChange = (value: string) => {
    setInputValue(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      committedRef.current = value;
      updateUrl({ q: value });
    }, QUERY_DEBOUNCE_MS);
  };

  const clearFilters = () => {
    setInputValue("");
    updateUrl({ q: null, source: null, period: null, sort: null });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="news-search"
            className="mb-1 block text-xs font-medium text-ui-muted"
          >
            Search
          </label>
          <input
            id="news-search"
            type="search"
            className="control w-full"
            placeholder="Search news"
            aria-label="Search news"
            value={inputValue}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="news-source"
            className="mb-1 block text-xs font-medium text-ui-muted"
          >
            Source
          </label>
          <select
            id="news-source"
            className="control min-w-[180px]"
            aria-label="Filter by source"
            value={source}
            onChange={(e) => updateUrl({ source: e.target.value })}
          >
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="news-range"
            className="mb-1 block text-xs font-medium text-ui-muted"
          >
            Date
          </label>
          <select
            id="news-range"
            className="control min-w-[180px]"
            aria-label="Filter by date range"
            value={period ?? "all"}
            onChange={(e) =>
              updateUrl({ period: e.target.value === "all" ? null : e.target.value })
            }
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="news-sort"
            className="mb-1 block text-xs font-medium text-ui-muted"
          >
            Sort
          </label>
          <select
            id="news-sort"
            className="control min-w-[140px]"
            aria-label="Sort stories"
            value={sort}
            onChange={(e) => updateUrl({ sort: e.target.value })}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="mb-0.5 text-xs font-mono uppercase tracking-widest text-ui-accent border border-ui-accent/30 rounded px-3 py-2 hover:bg-ui-accent/10 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ui-muted">
        <span className="numeric">{resultLabel}</span>
        {q !== "" && <FilterChip label={`“${q}”`} />}
        {source !== "all" && <FilterChip label={source} />}
        {period !== null && (
          <FilterChip
            label={
              PERIOD_OPTIONS.find((o) => o.value === period)?.label ??
              `${period}h`
            }
          />
        )}
        {sort !== "recent" && (
          <FilterChip
            label={SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort}
          />
        )}
      </div>
    </div>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-ui-border bg-ui-raised px-2.5 py-0.5 text-[11px] text-ui-secondary">
      {label}
    </span>
  );
}