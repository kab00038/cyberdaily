// lib/format.ts — Centralized date and probability formatters.
// All UI components and adapters should consume these helpers instead of
// duplicating their own timeAgo() / percent formatters. This eliminates
// hydration risks and unifies edge cases (future dates, invalid dates,
// absent probability values).

/**
 * Format an RFC-3339-ish publication date for human reading.
 *
 * Returns one of:
 *   - "Future-dated · <date> UTC" if the value is more than 60s in the future
 *   - "Date unavailable" if the value is missing or invalid
 *   - "Just now", "Nm ago", "Nh ago", "Nd ago" for recent values
 *   - "<Mon D, YYYY> UTC" for older values
 *
 * `nowMs` exists so callers can pass a stable reference clock (e.g. server
 * render time) to avoid hydration mismatches. When omitted, the formatter
 * uses the current wall clock.
 */
export function formatPublishedAt(
  value: string | number | null | undefined,
  nowMs: number = Date.now()
): string {
  if (value === null || value === undefined || value === "") {
    return "Date unavailable";
  }

  const timestamp =
    typeof value === "number" ? value : Date.parse(String(value));
  if (!Number.isFinite(timestamp)) return "Date unavailable";

  const seconds = Math.floor((nowMs - timestamp) / 1_000);
  const absoluteDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(timestamp);

  if (seconds < -60) return `Future-dated · ${absoluteDate} UTC`;
  if (seconds < 60) return "Just now";
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d ago`;
  return `${absoluteDate} UTC`;
}

/**
 * Parse a value into a millisecond timestamp, or `null` if invalid.
 */
export function parseTimestamp(
  value: string | number | null | undefined
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const ts = typeof value === "number" ? value : Date.parse(String(value));
  return Number.isFinite(ts) ? ts : null;
}

/**
 * Format an EPSS probability (0–1 fraction) for display.
 *
 * Returns "Unavailable" when the value is missing, empty, or out of range.
 * Returns "<0.01%" for very small non-zero probabilities to avoid "0%".
 */
export function formatProbability(
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined || value === "") {
    return "Unavailable";
  }
  if (typeof value === "string" && value.trim() === "") return "Unavailable";

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return "Unavailable";
  }
  if (parsed > 0 && parsed < 0.0001) return "<0.01%";
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(parsed);
}

/**
 * Format an EPSS percentile (0–1 fraction) for display.
 *
 * The EPSS API returns percentile as a 0–1 fractional value, NOT 0–100.
 * Use this when you want a percent rendering. Returns "Unavailable" for
 * missing/out-of-range values.
 */
export function formatPercentile(
  value: string | number | null | undefined
): string {
  return formatProbability(value);
}

/**
 * Format an ISO date for use as a chart axis label (UTC, YYYY-MM-DD).
 * Returns the input unchanged if it cannot be parsed.
 */
export function formatChartDate(value: string | null | undefined): string {
  if (!value) return "";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return value;
  return new Date(ts).toISOString().slice(0, 10);
}
