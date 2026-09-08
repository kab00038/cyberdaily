// tests/scoring.test.ts
// Regression tests for lib/risk-scoring.ts — the composite CVSS + EPSS + KEV
// scoring used to prioritize the vulnerability browser.

import { describe, expect, it } from "vitest";
import { calculateRiskScore } from "@/lib/risk-scoring";
import type { CVEItem } from "@/lib/nvd";
import type { EPSSScore } from "@/lib/epss";
import type { KEVItem } from "@/lib/abuse-ch";

function makeCve(overrides: Partial<CVEItem> = {}): CVEItem {
  return {
    id: "CVE-2026-0001",
    description: "Test CVE",
    cvssScore: null,
    severity: null,
    publishedAt: "2026-09-01T00:00:00Z",
    lastModified: "2026-09-01T00:00:00Z",
    references: [],
    attackVector: null,
    cweIds: [],
    ...overrides,
  };
}

function makeEpss(epss: string): EPSSScore {
  return {
    cve: "CVE-2026-0001",
    epss,
    percentile: "50",
    date: "2026-09-07",
  };
}

const kev: KEVItem = {
  cveID: "CVE-2026-0001",
  vendorProject: "Test",
  product: "Thing",
  vulnerabilityName: "Sample vulnerability",
  dateAdded: "2026-09-01",
  shortDescription: "Known exploited.",
  requiredAction: "Apply vendor fixes.",
  dueDate: "2026-09-15",
};

describe("calculateRiskScore", () => {
  it("scores an empty record 0 with LOW level and no factors", () => {
    const result = calculateRiskScore(makeCve());

    expect(result.riskScore).toBe(0);
    expect(result.riskLevel).toBe("LOW");
    expect(result.riskFactors).toEqual([]);
    expect(result.inKEV).toBe(false);
  });

  it("scores CVSS 9.5 as 38 and flags Critical CVSS score", () => {
    const result = calculateRiskScore(makeCve({ cvssScore: 9.5 }));

    expect(result.riskScore).toBe(38); // (9.5 / 10) * 40
    // Score 38 is >= 25, so the level is MEDIUM (the LOW band is < 25).
    expect(result.riskLevel).toBe("MEDIUM");
    expect(result.riskFactors).toContain("Critical CVSS score");
  });

  it("scores EPSS 0.8 as 32 and flags Very high exploit probability", () => {
    const result = calculateRiskScore(makeCve(), makeEpss("0.8"));

    expect(result.riskScore).toBe(32); // 0.8 * 40
    expect(result.riskLevel).toBe("MEDIUM");
    expect(result.riskFactors).toContain("Very high exploit probability");
  });

  it("scores a KEV-only record as 20 and flags active exploitation", () => {
    const result = calculateRiskScore(makeCve(), undefined, kev);

    expect(result.riskScore).toBe(20);
    expect(result.riskLevel).toBe("LOW");
    expect(result.riskFactors).toContain("Actively exploited (CISA KEV)");
    expect(result.inKEV).toBe(true);
  });

  it("caps a maxed record at 100 with CRITICAL level", () => {
    const result = calculateRiskScore(
      makeCve({ cvssScore: 10 }),
      makeEpss("1.0"),
      kev
    );

    expect(result.riskScore).toBe(100); // 40 (CVSS) + 40 (EPSS) + 20 (KEV)
    expect(result.riskLevel).toBe("CRITICAL");
    expect(result.riskFactors).toEqual([
      "Critical CVSS score",
      "Very high exploit probability",
      "Actively exploited (CISA KEV)",
    ]);
  });
});