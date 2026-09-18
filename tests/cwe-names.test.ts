// tests/cwe-names.test.ts — Regression tests for lib/cwe-names.ts.

import { describe, expect, it } from "vitest";
import { CWE_NAMES, getCweName } from "@/lib/cwe-names";

describe("getCweName", () => {
  it("resolves a bare numeric ID", () => {
    expect(getCweName("787")).toBe("Out-of-bounds Write");
  });

  it("resolves the conventional CWE-<n> form", () => {
    expect(getCweName("CWE-79")).toBe("Cross-Site Scripting (XSS)");
  });

  it("resolves every ID in the static table via its CWE-<n> form", () => {
    for (const id of Object.keys(CWE_NAMES)) {
      expect(getCweName(`CWE-${id}`)).toBe(CWE_NAMES[id]);
    }
  });

  it("falls back to the bare identifier for an unmapped numeric ID", () => {
    expect(getCweName("CWE-999999")).toBe("CWE-999999");
  });

  it("falls back to the original string when it has no digits at all", () => {
    expect(getCweName("NVD-CWE-noinfo")).toBe("NVD-CWE-noinfo");
  });

  it("never invents a name — every fallback equals the input verbatim", () => {
    const unmapped = "CWE-123456";
    expect(getCweName(unmapped)).toBe(unmapped);
  });
});
