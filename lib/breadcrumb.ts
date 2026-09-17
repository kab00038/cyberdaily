// lib/breadcrumb.ts — Pure route -> breadcrumb resolver used by AppHeader.
// Kept separate from the component (and exported) so the fallback behaviour
// for dynamic and unknown routes can be unit tested without rendering React.

export interface Breadcrumb {
  /** Leading segment, hidden below the `sm` breakpoint in AppHeader. */
  section: string;
  /** Trailing segment, always shown. */
  page: string;
}

// Known static routes. Every one of these renders as "Briefing / <page>".
const ROUTE_TITLES: Record<string, string> = {
  "/": "Today",
  "/news": "News",
  "/threats": "Vulnerabilities",
  "/community": "Community",
  "/analytics": "Analytics",
  "/sources": "Sources",
};

const DEFAULT_SECTION = "Briefing";

/** "some-segment" -> "Some Segment" for the unknown-route fallback. */
function titleCaseSegment(segment: string): string {
  return decodeURIComponent(segment)
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Resolves a pathname to a { section, page } breadcrumb pair.
 *
 * - Known static routes map 1:1 to their fixed title.
 * - /cve/{id} resolves to "Vulnerabilities / CVE-XXXX-XXXX" (id uppercased).
 * - Anything else falls back to a title derived from its first path segment
 *   instead of silently claiming to be "Today".
 */
export function resolveBreadcrumb(pathname: string): Breadcrumb {
  const known = ROUTE_TITLES[pathname];
  if (known) {
    return { section: DEFAULT_SECTION, page: known };
  }

  const cveMatch = pathname.match(/^\/cve\/([^/]+)/);
  if (cveMatch) {
    return { section: "Vulnerabilities", page: cveMatch[1].toUpperCase() };
  }

  const [firstSegment] = pathname.split("/").filter(Boolean);
  const page = firstSegment ? titleCaseSegment(firstSegment) : ROUTE_TITLES["/"];
  return { section: DEFAULT_SECTION, page };
}
