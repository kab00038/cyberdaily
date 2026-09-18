// components/community-sort.ts — Shared ordering for the community feeds
// (Hacker News + OSINT/Reddit). Both feeds render `.community-row` items and
// should behave identically: an explicit "Recent" default (newest first,
// undated items sink to the bottom and render "Date unavailable" rather than
// being treated as "now"), and a "Top" mode that ranks by engagement while
// applying the exact same undated/null-count handling.
//
// Kept as a small dependency-free module (no React) so the comparators are
// unit-testable in isolation — see tests/community-sort.test.ts.

export type CommunitySortMode = "recent" | "top";

export interface DatedItem {
  publishedAt: string | null;
}

/**
 * Compare two items by publish recency, newest first.
 *
 * An item with no usable timestamp never sorts as "now" — it sinks below
 * every dated item, matching `formatPublishedAt()`'s "Date unavailable" and
 * the same rule already applied server-side in `lib/osint.ts`. Two undated
 * items are left in their existing relative order (stable, not treated as
 * equal-to-now).
 */
export function compareByRecency(a: DatedItem, b: DatedItem): number {
  const aTs = a.publishedAt ? Date.parse(a.publishedAt) : NaN;
  const bTs = b.publishedAt ? Date.parse(b.publishedAt) : NaN;
  const aValid = Number.isFinite(aTs);
  const bValid = Number.isFinite(bTs);
  if (aValid && !bValid) return -1;
  if (!aValid && bValid) return 1;
  if (!aValid && !bValid) return 0;
  return bTs - aTs;
}

/**
 * Build a comparator that ranks by a nullable engagement count, highest
 * first, treating a missing count the same way a missing date is treated:
 * it sinks to the bottom rather than being coerced to 0 (which would let an
 * unknown value masquerade as "no engagement" and crowd out items that
 * simply lack the signal). Ties — including two null counts — fall back to
 * recency so the ordering stays deterministic and still honors the
 * undated-sinks-last rule.
 */
export function compareByEngagement<T extends DatedItem>(
  getCount: (item: T) => number | null | undefined
): (a: T, b: T) => number {
  return (a: T, b: T): number => {
    const aCount = getCount(a) ?? null;
    const bCount = getCount(b) ?? null;
    if (aCount !== null && bCount === null) return -1;
    if (aCount === null && bCount !== null) return 1;
    if (aCount !== null && bCount !== null && aCount !== bCount) {
      return bCount - aCount;
    }
    return compareByRecency(a, b);
  };
}

/** Sort a copy of `items` by recency (newest first, undated last). */
export function sortByRecency<T extends DatedItem>(items: T[]): T[] {
  return [...items].sort(compareByRecency);
}

/** Sort a copy of `items` by a nullable engagement count (highest first). */
export function sortByEngagement<T extends DatedItem>(
  items: T[],
  getCount: (item: T) => number | null | undefined
): T[] {
  return [...items].sort(compareByEngagement(getCount));
}
