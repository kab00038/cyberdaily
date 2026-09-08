// tests/format.test.ts
// Regression tests for lib/format.ts — the date/time and probability
// formatters every feed and chart depends on. All calls use a fixed
// reference clock so assertions never depend on the wall clock.

import { describe, expect, it } from "vitest";
import {
  formatChartDate,
  formatProbability,
  formatPublishedAt,
  isPublishedWithin,
  parseTimestamp,
} from "@/lib/format";

// Fixed reference clock: 2026-09-07 12:00:00 UTC.
const NOW_MS = Date.parse("2026-09-07T12:00:00Z");
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

describe("isPublishedWithin", () => {
  it("rejects null publishedAt for any hours value", () => {
    expect(isPublishedWithin(null, NOW_MS, 24)).toBe(false);
    expect(isPublishedWithin(null, NOW_MS, null)).toBe(false);
    expect(isPublishedWithin(null, NOW_MS, -1)).toBe(false);
  });

  it("rejects unparseable publishedAt strings", () => {
    expect(isPublishedWithin("not-a-date", NOW_MS, 24)).toBe(false);
    expect(isPublishedWithin("", NOW_MS, null)).toBe(false);
  });

  it("rejects future-dated items in every mode", () => {
    const future = new Date(NOW_MS + 5 * 60_000).toISOString();
    expect(isPublishedWithin(future, NOW_MS, 24)).toBe(false);
    expect(isPublishedWithin(future, NOW_MS, null)).toBe(false);
  });

  it("treats exactly-24h-ago as inside hours=24 but outside hours=23.9999", () => {
    const at = new Date(NOW_MS - 24 * HOUR_MS).toISOString();
    expect(isPublishedWithin(at, NOW_MS, 24)).toBe(true);
    expect(isPublishedWithin(at, NOW_MS, 23.9999)).toBe(false);
  });

  it("accepts items within the last 7 days", () => {
    const weekAgo = new Date(NOW_MS - 7 * DAY_MS).toISOString();
    expect(isPublishedWithin(weekAgo, NOW_MS, 7 * 24)).toBe(true);
  });

  it("with hours=null (all time) accepts valid past items only", () => {
    const past = new Date(NOW_MS - DAY_MS).toISOString();
    expect(isPublishedWithin(past, NOW_MS, null)).toBe(true);
    const future = new Date(NOW_MS + HOUR_MS).toISOString();
    expect(isPublishedWithin(future, NOW_MS, null)).toBe(false);
    expect(isPublishedWithin("garbage", NOW_MS, null)).toBe(false);
  });

  it("rejects negative and NaN hour windows", () => {
    const past = new Date(NOW_MS - HOUR_MS).toISOString();
    expect(isPublishedWithin(past, NOW_MS, -1)).toBe(false);
    expect(isPublishedWithin(past, NOW_MS, Number.NaN)).toBe(false);
  });
});

describe("formatPublishedAt", () => {
  it('renders recent seconds as "Just now"', () => {
    expect(formatPublishedAt(new Date(NOW_MS - 30_000).toISOString(), NOW_MS)).toBe(
      "Just now"
    );
  });

  it("renders minutes ago as {n}m ago", () => {
    expect(formatPublishedAt(new Date(NOW_MS - 5 * 60_000).toISOString(), NOW_MS)).toBe(
      "5m ago"
    );
  });

  it("renders hours ago as {n}h ago", () => {
    expect(formatPublishedAt(new Date(NOW_MS - 3 * HOUR_MS).toISOString(), NOW_MS)).toBe(
      "3h ago"
    );
  });

  it("renders days ago (under 7) as {n}d ago", () => {
    expect(formatPublishedAt(new Date(NOW_MS - 2 * DAY_MS).toISOString(), NOW_MS)).toBe(
      "2d ago"
    );
  });

  it("renders older items as an absolute UTC date", () => {
    expect(formatPublishedAt(new Date(NOW_MS - 10 * DAY_MS).toISOString(), NOW_MS)).toBe(
      "Aug 28, 2026 UTC"
    );
  });

  it("labels future-dated items explicitly", () => {
    expect(formatPublishedAt(new Date(NOW_MS + 10 * 60_000).toISOString(), NOW_MS)).toBe(
      "Future-dated · Sep 7, 2026 UTC"
    );
  });

  it("renders missing or invalid values as Date unavailable", () => {
    expect(formatPublishedAt(null, NOW_MS)).toBe("Date unavailable");
    expect(formatPublishedAt(undefined, NOW_MS)).toBe("Date unavailable");
    expect(formatPublishedAt("", NOW_MS)).toBe("Date unavailable");
    expect(formatPublishedAt("garbage", NOW_MS)).toBe("Date unavailable");
  });
});

describe("formatProbability", () => {
  it("returns Unavailable for missing or empty values", () => {
    expect(formatProbability(null)).toBe("Unavailable");
    expect(formatProbability(undefined)).toBe("Unavailable");
    expect(formatProbability("")).toBe("Unavailable");
  });

  it("formats valid fractions as percents", () => {
    expect(formatProbability(0)).toBe("0%");
    expect(formatProbability(0.5)).toBe("50%");
    expect(formatProbability(1)).toBe("100%");
    expect(formatProbability("0.42")).toBe("42%");
  });

  it("shows <0.01% for very small non-zero values", () => {
    expect(formatProbability(0.00005)).toBe("<0.01%");
  });

  it("rejects out-of-range values", () => {
    expect(formatProbability(-1)).toBe("Unavailable");
    expect(formatProbability(1.5)).toBe("Unavailable");
  });
});

describe("parseTimestamp", () => {
  it("parses a valid ISO string to milliseconds", () => {
    expect(parseTimestamp("2026-09-07T12:00:00Z")).toBe(NOW_MS);
  });

  it("returns null for null, undefined, and invalid input", () => {
    expect(parseTimestamp(null)).toBeNull();
    expect(parseTimestamp(undefined)).toBeNull();
    expect(parseTimestamp("not-a-date")).toBeNull();
  });
});

describe("formatChartDate", () => {
  it("extracts the UTC date part", () => {
    expect(formatChartDate("2026-09-07T00:00:00Z")).toBe("2026-09-07");
  });

  it("returns an empty string for missing values", () => {
    expect(formatChartDate(null)).toBe("");
    expect(formatChartDate("")).toBe("");
  });
});