// components/ThreatForecast.tsx
"use client";

import { useEffect, useState } from "react";

interface CVEItem {
  id: string;
  description: string;
  cvssScore: number | null;
  severity: string | null;
  published: string;
}

interface KEVItem {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-500 bg-red-500/20",
  HIGH: "text-orange-500 bg-orange-500/20",
  MEDIUM: "text-yellow-500 bg-yellow-500/20",
  LOW: "text-green-500 bg-green-500/20",
};

export default function ThreatForecast() {
  const [cves, setCves] = useState<CVEItem[]>([]);
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
        <div className="bg-cyber-navy rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-3" />
          <div className="h-3 bg-gray-700 rounded w-full mb-2" />
          <div className="h-3 bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CISA KEV Section */}
      <div className="bg-cyber-navy rounded-lg border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="text-cyber-red">⚠️</span>
            CISA Known Exploited Vulnerabilities
          </h3>
        </div>
        <div className="divide-y divide-gray-800">
          {kev.slice(0, 5).map((item) => (
            <div key={item.cveID} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-mono text-cyber-green">{item.cveID}</span>
                <span className="text-xs text-gray-500">{item.dateAdded}</span>
              </div>
              <p className="text-sm text-white font-medium mb-1">{item.vulnerabilityName}</p>
              <p className="text-xs text-gray-400">
                {item.vendorProject} — {item.product}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Trending CVEs Section */}
      <div className="bg-cyber-navy rounded-lg border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="text-yellow-400">🔍</span>
            Trending CVEs
          </h3>
        </div>
        <div className="divide-y divide-gray-800">
          {cves.slice(0, 5).map((cve) => (
            <div key={cve.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-mono text-cyber-green">{cve.id}</span>
                {cve.severity && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      SEVERITY_COLORS[cve.severity] || "text-gray-400 bg-gray-500/20"
                    }`}
                  >
                    {cve.severity} {cve.cvssScore && `(${cve.cvssScore})`}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 line-clamp-2">{cve.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
