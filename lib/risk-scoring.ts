// lib/risk-scoring.ts
import { CVEItem } from "./nvd";
import { KEVItem } from "./abuse-ch";
import { EPSSScore } from "./epss";

export interface RiskScoredCVE extends CVEItem {
  riskScore: number;        // 0-100 composite score
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  epssScore?: EPSSScore;
  inKEV: boolean;
  riskFactors: string[];    // human-readable reasons
}

/**
 * Composite risk scoring: CVSS (40%) + EPSS (40%) + KEV (20%)
 * This mirrors how real SOCs prioritize vulnerabilities.
 */
export function calculateRiskScore(
  cve: CVEItem,
  epss?: EPSSScore,
  kev?: KEVItem
): RiskScoredCVE {
  let score = 0;
  const factors: string[] = [];

  // CVSS component (0-40 points)
  if (cve.cvssScore !== null) {
    const cvssPoints = (cve.cvssScore / 10) * 40;
    score += cvssPoints;
    if (cve.cvssScore >= 9.0) factors.push("Critical CVSS score");
    else if (cve.cvssScore >= 7.0) factors.push("High CVSS score");
  }

  // EPSS component (0-40 points)
  if (epss) {
    const epssProb = parseFloat(epss.epss);
    const epssPoints = epssProb * 40;
    score += epssPoints;
    if (epssProb >= 0.7) factors.push("Very high exploit probability");
    else if (epssProb >= 0.3) factors.push("Elevated exploit probability");
  }

  // KEV component (0-20 points — binary: in KEV or not)
  if (kev) {
    score += 20;
    factors.push("Actively exploited (CISA KEV)");
  }

  // Determine risk level
  let riskLevel: RiskScoredCVE["riskLevel"];
  if (score >= 75) riskLevel = "CRITICAL";
  else if (score >= 50) riskLevel = "HIGH";
  else if (score >= 25) riskLevel = "MEDIUM";
  else riskLevel = "LOW";

  return {
    ...cve,
    riskScore: Math.round(score),
    riskLevel,
    epssScore: epss,
    inKEV: !!kev,
    riskFactors: factors,
  };
}

export function scoreToColor(level: RiskScoredCVE["riskLevel"]): string {
  switch (level) {
    case "CRITICAL": return "text-[#F07050] bg-[#E85030]/20 border-[#E85030]/40";
    case "HIGH": return "text-[#F09060] bg-[#E8531E]/20 border-[#E8531E]/40";
    case "MEDIUM": return "text-[#F0B880] bg-[#D08040]/20 border-[#D08040]/40";
    case "LOW": return "text-[#60D0A0] bg-[#2EAA7A]/20 border-[#2EAA7A]/40";
  }
}
