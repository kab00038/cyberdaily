// tests/navigation.test.ts
// Regression tests for lib/nav-active.ts's isNavItemActive — shared by the
// desktop sidebar and mobile drawer (via components/navigation.tsx) so a
// CVE detail page still shows "Vulnerabilities" as the current nav item.

import { describe, expect, it } from "vitest";
import { isNavItemActive } from "@/lib/nav-active";

const vulnerabilities = { href: "/threats" };
const news = { href: "/news" };
const today = { href: "/" };

describe("isNavItemActive", () => {
  it("matches a nav item's own href", () => {
    expect(isNavItemActive("/threats", vulnerabilities)).toBe(true);
  });

  it("matches sub-paths of a nav item's href", () => {
    expect(isNavItemActive("/threats/foo", vulnerabilities)).toBe(true);
  });

  it("marks Vulnerabilities active on a /cve/{id} detail route", () => {
    expect(isNavItemActive("/cve/CVE-2026-85046", vulnerabilities)).toBe(true);
  });

  it("does not mark other nav items active on a /cve/{id} route", () => {
    expect(isNavItemActive("/cve/CVE-2026-85046", news)).toBe(false);
    expect(isNavItemActive("/cve/CVE-2026-85046", today)).toBe(false);
  });

  it("only matches Today on the exact root path", () => {
    expect(isNavItemActive("/", today)).toBe(true);
    expect(isNavItemActive("/news", today)).toBe(false);
  });

  it("does not match an unrelated route", () => {
    expect(isNavItemActive("/sources", vulnerabilities)).toBe(false);
  });
});
