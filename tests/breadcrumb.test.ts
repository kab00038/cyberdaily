// tests/breadcrumb.test.ts
// Regression tests for lib/breadcrumb.ts — the AppHeader breadcrumb
// resolver. Covers every known static route, the /cve/{id} dynamic route,
// and the unknown-route fallback (which must not claim to be "Today").

import { describe, expect, it } from "vitest";
import { resolveBreadcrumb } from "@/lib/breadcrumb";

describe("resolveBreadcrumb", () => {
  it.each([
    ["/", "Today"],
    ["/news", "News"],
    ["/threats", "Vulnerabilities"],
    ["/community", "Community"],
    ["/analytics", "Analytics"],
    ["/sources", "Sources"],
  ])("resolves %s to Briefing / %s", (pathname, page) => {
    expect(resolveBreadcrumb(pathname)).toEqual({ section: "Briefing", page });
  });

  it("resolves a CVE detail route to Vulnerabilities / <CVE ID>", () => {
    expect(resolveBreadcrumb("/cve/CVE-2026-85046")).toEqual({
      section: "Vulnerabilities",
      page: "CVE-2026-85046",
    });
  });

  it("uppercases a lowercased CVE id param", () => {
    expect(resolveBreadcrumb("/cve/cve-2026-85046")).toEqual({
      section: "Vulnerabilities",
      page: "CVE-2026-85046",
    });
  });

  it("ignores trailing path segments after the CVE id", () => {
    expect(resolveBreadcrumb("/cve/CVE-2026-85046/related")).toEqual({
      section: "Vulnerabilities",
      page: "CVE-2026-85046",
    });
  });

  it("falls back to a derived title for an unknown route instead of Today", () => {
    const result = resolveBreadcrumb("/some-unknown-route");
    expect(result.page).not.toBe("Today");
    expect(result).toEqual({ section: "Briefing", page: "Some Unknown Route" });
  });

  it("falls back gracefully for a deeply nested unknown route", () => {
    expect(resolveBreadcrumb("/foo/bar/baz")).toEqual({
      section: "Briefing",
      page: "Foo",
    });
  });
});
