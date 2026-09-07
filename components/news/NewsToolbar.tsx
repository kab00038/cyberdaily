// components/news/NewsToolbar.tsx
// Search + filter toolbar for the news feed. Fully controlled by the parent.
// All controls are native form elements with persistent, visible labels so
// the toolbar is keyboard-navigable and screen-reader friendly.

"use client";

export interface NewsToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  source: string;
  onSourceChange: (s: string) => void;
  sources: string[]; // unique source names
  days: number | null; // null = all time
  onDaysChange: (d: number | null) => void;
  totalCount: number;
  visibleCount: number;
  onClearFilters: () => void;
}

const DATE_OPTIONS: { value: string; label: string; days: number | null }[] = [
  { value: "all", label: "All time", days: null },
  { value: "1", label: "24 hours", days: 1 },
  { value: "7", label: "7 days", days: 7 },
  { value: "30", label: "30 days", days: 30 },
];

export default function NewsToolbar({
  query,
  onQueryChange,
  source,
  onSourceChange,
  sources,
  days,
  onDaysChange,
  totalCount,
  visibleCount,
  onClearFilters,
}: NewsToolbarProps) {
  const hasActiveFilters = query !== "" || source !== "all" || days !== null;

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
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
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
            onChange={(e) => onSourceChange(e.target.value)}
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
            className="control min-w-[160px]"
            aria-label="Filter by date range"
            value={days === null ? "all" : String(days)}
            onChange={(e) =>
              onDaysChange(
                e.target.value === "all" ? null : Number(e.target.value)
              )
            }
          >
            {DATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mb-0.5 text-xs font-mono uppercase tracking-widest text-ui-accent border border-ui-accent/30 rounded px-3 py-2 hover:bg-ui-accent/10 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ui-muted">
        <span className="numeric">
          {visibleCount} of {totalCount} stories
        </span>
        {query !== "" && <FilterChip label={`“${query}”`} />}
        {source !== "all" && <FilterChip label={source} />}
        {days !== null && (
          <FilterChip
            label={
              DATE_OPTIONS.find((o) => o.days === days)?.label ?? `${days} days`
            }
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