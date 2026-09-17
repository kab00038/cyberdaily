// lib/nav-active.ts — Pure "is this nav item the current page" logic,
// shared by the desktop sidebar and the mobile drawer (via
// components/navigation.tsx) so their active states never drift apart.
// Kept in a plain .ts module (no JSX) so it can be unit tested without
// pulling in React or the nav icon markup.

export interface NavHref {
  href: string;
}

// Routes that should count as "inside" a given nav item beyond its own
// href and its direct sub-paths (which isNavItemActive already covers via
// startsWith(item.href + "/")). /cve/{id} detail pages live outside
// /threats/* but are conceptually part of the Vulnerabilities section, so
// the sidebar/drawer should still highlight it there.
const EXTRA_ACTIVE_PREFIXES: Record<string, string[]> = {
  "/threats": ["/cve/"],
};

/**
 * Whether a nav item should render as the current page for a given
 * pathname.
 */
export function isNavItemActive(pathname: string, item: NavHref): boolean {
  if (pathname === item.href) return true;
  if (item.href !== "/" && pathname.startsWith(item.href + "/")) return true;
  const extraPrefixes = EXTRA_ACTIVE_PREFIXES[item.href] ?? [];
  return extraPrefixes.some((prefix) => pathname.startsWith(prefix));
}
