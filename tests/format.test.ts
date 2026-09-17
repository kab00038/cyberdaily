// tests/format.test.ts
// Regression tests for lib/format.ts — the date/time and probability
// formatters every feed and chart depends on. All calls use a fixed
// reference clock so assertions never depend on the wall clock.

import { describe, expect, it } from "vitest";
import {
  formatChartDate,
  formatKevPrimaryLine,
  formatKevVendorProduct,
  formatProbability,
  formatPublishedAt,
  isPublishedWithin,
  parseTimestamp,
  plural,
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

describe("plural", () => {
  it("uses the singular form for a count of exactly 1", () => {
    expect(plural(1, "point")).toBe("1 point");
    expect(plural(1, "comment")).toBe("1 comment");
  });

  it("uses the default '+s' plural form for counts other than 1", () => {
    expect(plural(0, "point")).toBe("0 points");
    expect(plural(2, "point")).toBe("2 points");
    expect(plural(100, "comment")).toBe("100 comments");
  });

  it("uses an explicit override for irregular plurals", () => {
    expect(plural(1, "entry", "entries")).toBe("1 entry");
    expect(plural(2, "entry", "entries")).toBe("2 entries");
    expect(plural(0, "entry", "entries")).toBe("0 entries");
  });

  it("always includes the count in the returned string", () => {
    expect(plural(42, "record")).toContain("42");
  });
});

describe("formatKevVendorProduct", () => {
  it("joins vendor and product with an em dash", () => {
    expect(formatKevVendorProduct("Microsoft", "Windows")).toBe(
      "Microsoft — Windows"
    );
  });

  it("omits the missing side instead of a bare dash", () => {
    expect(formatKevVendorProduct("Microsoft", "")).toBe("Microsoft");
    expect(formatKevVendorProduct("", "Windows")).toBe("Windows");
  });

  it("returns an empty string when both sides are blank", () => {
    expect(formatKevVendorProduct("", "")).toBe("");
  });
});

describe("formatKevPrimaryLine", () => {
  it("prefers the vulnerability name", () => {
    expect(
      formatKevPrimaryLine(
        "Windows Kernel Elevation of Privilege Vulnerability",
        "Microsoft",
        "Windows"
      )
    ).toBe("Windows Kernel Elevation of Privilege Vulnerability");
  });

  it("falls back to vendor/product when the name is empty", () => {
    expect(formatKevPrimaryLine("", "Microsoft", "Windows")).toBe(
      "Microsoft — Windows"
    );
    expect(formatKevPrimaryLine("   ", "Microsoft", "")).toBe("Microsoft");
  });

  it("falls back to a placeholder when everything is empty", () => {
    expect(formatKevPrimaryLine("", "", "")).toBe(
      "Vulnerability details unavailable"
    );
  });

  it("never falls back to required-action-style boilerplate", () => {
    // formatKevPrimaryLine takes no requiredAction argument at all, so
    // there is no way for boilerplate remediation text to leak into the
    // headline — this just documents the guarantee explicitly.
    const result = formatKevPrimaryLine("", "", "");
    expect(result).not.toMatch(/vendor instructions|BOD/i);
  });
});