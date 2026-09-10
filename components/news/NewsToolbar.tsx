// components/news/NewsToolbar.tsx
// Search + filter toolbar for the news feed. Filter state lives in the URL
// (`q`, `cve`, `source`, `period`, `sort`) so selections survive navigation
// and are shareable. This component reads the current filter values from the
// search params and writes changes back via `router.replace` (no history
// entries per keystroke). Text fields are debounced (~300 ms) before hitting
// the URL.
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

/**
 * Text control bound to one URL search param. Typing stays local and the URL
 * is updated once typing pauses; external URL changes (back/forward, a
 * cleared filter) are adopted back into the input.
 *
 * `onCommit` receives only the new value — the key is bound by this call, so
 * callers cannot mis-pair a value with the wrong param.
 */
function useDebouncedParam(key: string, onCommit: (value: string) => void) {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get(key) ?? "";
  const [value, setValue] = useState(fromUrl);
  const committedRef = useRef(fromUrl);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (fromUrl === committedRef.current) return;
    setValue(fromUrl);
    committedRef.current = fromUrl;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [fromUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const change = (next: string) => {
    setValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      committedRef.current = next;
      onCommit(next);
    }, QUERY_DEBOUNCE_MS);
  };

  const reset = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    committedRef.current = "";
    setValue("");
  };

  return { value, change, reset };
}

export default function NewsToolbar({
  sources,
  resultLabel,
  hasActiveFilters,
}: NewsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const source = searchParams.get("source") ?? "all";
  const period = searchParams.get("period"); // hours as string, or null
  const sort = searchParams.get("sort") ?? "recent";
  const cve = searchParams.get("cve") ?? "";

  // One pending-param snapshot shared by every control. Debounced fields
  // commit independently, so writing to the live URL params (rather than a
  // per-field copy) is what keeps a second commit from dropping the first.
  const paramsRef = useRef<URLSearchParams>(
    new URLSearchParams(searchParams.toString())
  );
  useEffect(() => {
    paramsRef.current = new URLSearchParams(searchParams.toString());
  }, [searchParams]);

  const applyParams = (next: Record<string, string | null>) => {
    const params = paramsRef.current;
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const query = useDebouncedParam("q", (value) => applyParams({ q: value }));
  const cveRef = useDebouncedParam("cve", (value) => applyParams({ cve: value }));

  const clearFilters = () => {
    query.reset();
    cveRef.reset();
    applyParams({ q: null, cve: null, source: null, period: null, sort: null });
  };

  return (
    <div className="news-toolbar space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="news-search"
            className="control-label"
          >
            Search
          </label>
          <input
            id="news-search"
            type="search"
            className="control w-full"
            placeholder="Search news"
            aria-label="Search news"
            value={query.value}
            onChange={(e) => query.change(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="news-cve"
            className="control-label"
          >
            CVE reference
          </label>
          <input
            id="news-cve"
            type="search"
            className="control min-w-[180px] font-mono"
            placeholder="CVE-2026-0000"
            aria-label="Filter by CVE identifier"
            aria-describedby="news-cve-hint"
            value={cveRef.value}
            onChange={(e) => cveRef.change(e.target.value)}
          />
          <span id="news-cve-hint" className="sr-only">
            Exact CVE identifier, for example CVE-2026-12345.
          </span>
        </div>

        <div>
          <label
            htmlFor="news-source"
            className="control-label"
          >
            Source
          </label>
          <select
            id="news-source"
            className="control min-w-[180px]"
            aria-label="Filter by source"
            value={source}
            onChange={(e) => applyParams({ source: e.target.value })}
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
            className="control-label"
          >
            Date
          </label>
          <select
            id="news-range"
            className="control min-w-[180px]"
            aria-label="Filter by date range"
            value={period ?? "all"}
            onChange={(e) =>
              applyParams({ period: e.target.value === "all" ? null : e.target.value })
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
            className="control-label"
          >
            Sort
          </label>
          <select
            id="news-sort"
            className="control min-w-[140px]"
            aria-label="Sort stories"
            value={sort}
            onChange={(e) => applyParams({ sort: e.target.value })}
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
            className="mb-0.5 text-xs font-mono text-ui-accent border border-ui-accent/30 rounded px-3 py-2 hover:bg-ui-accent/10 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ui-muted">
        <span className="numeric">{resultLabel}</span>
        {query.value !== "" && <FilterChip label={`“${query.value}”`} />}
        {cve !== "" && (
          <FilterChip label={`References ${cve.trim().toUpperCase()}`} />
        )}
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
