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

const SEVERITY_CONFIG: Record<string, { color: string; bar: string }> = {
  CRITICAL: {
    color: "text-red-500",
    bar: "bg-red-500",
  },
  HIGH: {
    color: "text-orange-500",
    bar: "bg-orange-500",
  },
  MEDIUM: {
    color: "text-amber-500",
    bar: "bg-amber-500",
  },
  LOW: {
    color: "text-emerald-500",
    bar: "bg-emerald-500",
  },
};

const DEFAULT_SEVERITY = {
  color: "text-gray-500",
  bar: "bg-gray-600",
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
          <div className="h-4 bg-white/[0.08] rounded w-1/2 mb-3" />
          <div className="h-3 bg-white/[0.08] rounded w-full mb-2" />
          <div className="h-3 bg-white/[0.08] rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CISA KEV Section */}
      <div className="panel rounded-lg overflow-hidden">
        <div className="panel-header p-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            CISA Known Exploited Vulnerabilities
          </h3>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {kev.slice(0, 5).map((item) => (
            <div key={item.cveID} className="p-4 hover:bg-[#0B0F0E]/40 transition-colors group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-mono text-emerald-500 glow-text-green group-hover:text-emerald-400 transition-colors">
                  {item.cveID}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">{item.dateAdded}</span>
              </div>
              <p className="text-sm text-gray-100 font-medium mb-1 line-clamp-1">
                {item.vulnerabilityName}
              </p>
              <p className="text-xs text-gray-400">
                {item.vendorProject} — {item.product}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Trending CVEs Section */}
      <div className="panel rounded-lg overflow-hidden">
        <div className="panel-header p-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Trending CVEs
          </h3>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {cves
            .slice()
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 8)
            .map((cve) => {
              const config = cve.severity
                ? SEVERITY_CONFIG[cve.severity] || DEFAULT_SEVERITY
                : DEFAULT_SEVERITY;
              return (
                <div key={cve.id} className="p-4 hover:bg-[#0B0F0E]/40 transition-colors group">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-mono text-emerald-500 glow-text-green group-hover:text-emerald-400 transition-colors">
                      {cve.id}
                    </span>
                    <div className="flex items-center gap-2">
                      {cve.inKEV && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/40">
                          KEV
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded border ${scoreToColor(cve.riskLevel)}`}>
                        {cve.riskLevel} ({cve.riskScore})
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-2">{cve.description}</p>

                  {cve.riskFactors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {cve.riskFactors.map((factor, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#0B0F0E]/50 text-gray-500">
                          {factor}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
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
                      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${config.bar} ${severityBarWidth(cve.cvssScore)}`}
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
