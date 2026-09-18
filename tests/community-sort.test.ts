// tests/community-sort.test.ts
// Unit tests for the shared community-feed sort comparators (F12): normal
// ordering, ties, missing dates, and null engagement counts. Both
// HackerNewsFeed and OsintFeed drive their "Recent"/"Top" toggle off these
// same functions, so the behaviour is verified once here.

import { describe, expect, it } from "vitest";
import {
  compareByEngagement,
  compareByRecency,
  sortByEngagement,
  sortByRecency,
} from "@/components/community-sort";

interface Item {
  title: string;
  publishedAt: string | null;
  count: number | null;
}

function item(title: string, publishedAt: string | null, count: number | null): Item {
  return { title, publishedAt, count };
}

describe("compareByRecency / sortByRecency", () => {
  it("orders newest first under normal conditions", () => {
    const items = [
      item("oldest", "2026-09-01T00:00:00Z", null),
      item("newest", "2026-09-10T00:00:00Z", null),
      item("middle", "2026-09-05T00:00:00Z", null),
    ];
    expect(sortByRecency(items).map((i) => i.title)).toEqual([
      "newest",
      "middle",
      "oldest",
    ]);
  });

  it("treats identical timestamps as a tie (comparator returns 0)", () => {
    const a = item("a", "2026-09-05T00:00:00Z", null);
    const b = item("b", "2026-09-05T00:00:00Z", null);
    expect(compareByRecency(a, b)).toBe(0);
  });

  it("sinks items with a missing or unparseable date to the bottom, never treating them as 'now'", () => {
    const items = [
      item("undated", null, null),
      item("recent", "2026-09-10T00:00:00Z", null),
      item("also-undated", null, null),
      item("older", "2026-09-01T00:00:00Z", null),
      item("bad-date", "not-a-date", null),
    ];
    const sorted = sortByRecency(items);
    expect(sorted.map((i) => i.title)).toEqual([
      "recent",
      "older",
      "undated",
      "also-undated",
      "bad-date",
    ]);
  });

  it("two undated items compare as equal rather than one outranking the other", () => {
    const a = item("a", null, null);
    const b = item("b", null, null);
    expect(compareByRecency(a, b)).toBe(0);
    expect(compareByRecency(b, a)).toBe(0);
  });
});

describe("compareByEngagement / sortByEngagement", () => {
  const byCount = (i: Item) => i.count;

  it("orders highest engagement first under normal conditions", () => {
    const items = [
      item("low", "2026-09-05T00:00:00Z", 3),
      item("high", "2026-09-05T00:00:00Z", 42),
      item("mid", "2026-09-05T00:00:00Z", 10),
    ];
    expect(sortByEngagement(items, byCount).map((i) => i.title)).toEqual([
      "high",
      "mid",
      "low",
    ]);
  });

  it("breaks a tie in engagement count by recency", () => {
    const items = [
      item("tied-older", "2026-09-01T00:00:00Z", 10),
      item("tied-newer", "2026-09-10T00:00:00Z", 10),
    ];
    expect(sortByEngagement(items, byCount).map((i) => i.title)).toEqual([
      "tied-newer",
      "tied-older",
    ]);
  });

  it("does not coerce a null engagement count to zero: null sinks below every real count, including 0", () => {
    const items = [
      item("null-count", "2026-09-10T00:00:00Z", null),
      item("zero-points", "2026-09-01T00:00:00Z", 0),
      item("some-points", "2026-09-01T00:00:00Z", 5),
    ];
    const sorted = sortByEngagement(items, byCount);
    expect(sorted.map((i) => i.title)).toEqual([
      "some-points",
      "zero-points",
      "null-count",
    ]);
  });

  it("falls back to recency (undated last) when all compared counts are null", () => {
    const items = [
      item("null-undated", null, null),
      item("null-recent", "2026-09-10T00:00:00Z", null),
      item("null-older", "2026-09-01T00:00:00Z", null),
    ];
    const sorted = sortByEngagement(items, byCount);
    expect(sorted.map((i) => i.title)).toEqual([
      "null-recent",
      "null-older",
      "null-undated",
    ]);
  });

  it("comparator function itself is directly usable (not just via sortByEngagement)", () => {
    const compare = compareByEngagement(byCount);
    const higher = item("higher", "2026-09-05T00:00:00Z", 20);
    const lower = item("lower", "2026-09-05T00:00:00Z", 5);
    expect(compare(higher, lower)).toBeLessThan(0);
    expect(compare(lower, higher)).toBeGreaterThan(0);
  });
});
