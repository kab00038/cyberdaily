// components/ThreatForecast.tsx
"use client";

import { useEffect, useState } from "react";
import { RiskScoredCVE, scoreToColor } from "@/lib/risk-scoring";

interface KEVItem {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
}

const SEVERITY_CONFIG: Record<string, { color: string; bar: string; glow: string }> = {
  CRITICAL: {
    color: "text-[#E85030]",
    bar: "bg-[#E85030]",
    glow: "shadow-[0_0_10px_rgba(232,80,48,0.5)]",
  },
  HIGH: {
    color: "text-[#E8531E]",
    bar: "bg-[#E8531E]",
    glow: "shadow-[0_0_10px_rgba(232,83,30,0.4)]",
  },
  MEDIUM: {
    color: "text-[#D08040]",
    bar: "bg-[#D08040]",
    glow: "shadow-[0_0_10px_rgba(208,128,64,0.4)]",
  },
  LOW: {
    color: "text-[#2EAA7A]",
    bar: "bg-[#2EAA7A]",
    glow: "shadow-[0_0_10px_rgba(46,170,122,0.4)]",
  },
};

const DEFAULT_SEVERITY = {
  color: "text-[#8A7A6A]",
  bar: "bg-[#6A5A4A]",
  glow: "",
};

function severityBarWidth(score: number | null): string {
  if (score === null || score === undefined) return "w-1/4";
  if (score >= 9) return "w-full";
  if (score >= 7) return "w-3/4";
  if (score >= 4) return "w-1/2";
  return "w-1/4";
}

export default function ThreatForecast() {
  const [cves, setCves] = useState<RiskScoredCVE[]>([]);
  const [kev, setKev] = useState<KEVItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchThreats() {
      try {
        const res = await fetch("/api/threats");
        const data = await res.json();
        setCves(data.cves || []);
        setKev(data.kev || []);
      } catch (error) {
        console.error("Failed to fetch threats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchThreats();
    const interval = setInterval(fetchThreats, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="panel rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-[rgba(200,160,120,0.12)] rounded w-1/2 mb-3" />
          <div className="h-3 bg-[rgba(200,160,120,0.12)] rounded w-full mb-2" />
          <div className="h-3 bg-[rgba(200,160,120,0.12)] rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CISA KEV Section */}
      <div className="panel rounded-lg overflow-hidden">
        <div className="panel-header p-4">
          <h3 className="text-sm font-semibold text-[#F0E8E0] flex items-center gap-2">
            <svg className="w-4 h-4 text-[#E85030]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            CISA Known Exploited Vulnerabilities
          </h3>
        </div>
        <div className="divide-y divide-[rgba(200,160,120,0.06)]">
          {kev.slice(0, 5).map((item) => (
            <div key={item.cveID} className="p-4 hover:bg-[#0F0A08]/40 transition-colors group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-mono text-[#2EAA7A] glow-text-green group-hover:text-[#E8531E] transition-colors">
                  {item.cveID}
                </span>
                <span className="text-[10px] text-[#8A7A6A] font-mono">{item.dateAdded}</span>
              </div>
              <p className="text-sm text-[#F0E8E0] font-medium mb-1 line-clamp-1">
                {item.vulnerabilityName}
              </p>
              <p className="text-xs text-[#BFB0A0]">
                {item.vendorProject} — {item.product}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Trending CVEs Section */}
      <div className="panel rounded-lg overflow-hidden">
        <div className="panel-header p-4">
          <h3 className="text-sm font-semibold text-[#F0E8E0] flex items-center gap-2">
            <svg className="w-4 h-4 text-[#E87030]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Trending CVEs
          </h3>
        </div>
        <div className="divide-y divide-[rgba(200,160,120,0.06)]">
          {cves
            .slice()
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 8)
            .map((cve) => {
              const config = cve.severity
                ? SEVERITY_CONFIG[cve.severity] || DEFAULT_SEVERITY
                : DEFAULT_SEVERITY;
              return (
                <div key={cve.id} className="p-4 hover:bg-[#0F0A08]/40 transition-colors group">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-mono text-[#2EAA7A] glow-text-green group-hover:text-[#E8531E] transition-colors">
                      {cve.id}
                    </span>
                    <div className="flex items-center gap-2">
                      {cve.inKEV && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[#E85030]/20 text-[#F07050] border border-[#E85030]/40">
                          KEV
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded border ${scoreToColor(cve.riskLevel)}`}>
                        {cve.riskLevel} ({cve.riskScore})
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#BFB0A0] line-clamp-2 mb-2">{cve.description}</p>

                  {/* Risk factors */}
                  {cve.riskFactors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {cve.riskFactors.map((factor, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#0F0A08]/50 text-[#8A7A6A]">
                          {factor}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* EPSS + CVSS details */}
                  <div className="flex items-center gap-3 text-[10px] text-[#8A7A6A]">
                    {cve.cvssScore !== null && <span>CVSS: {cve.cvssScore}</span>}
                    {cve.epssScore && (
                      <span>EPSS: {(parseFloat(cve.epssScore.epss) * 100).toFixed(1)}%</span>
                    )}
                    {cve.epssScore && (
                      <span>Percentile: {cve.epssScore.percentile}</span>
                    )}
                  </div>

                  {cve.cvssScore !== null && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1 bg-[rgba(200,160,120,0.1)] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${config.bar} ${config.glow} ${severityBarWidth(cve.cvssScore)}`}
                        />
                      </div>
                      <span className={`text-[10px] font-mono ${config.color}`}>{cve.cvssScore}</span>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
