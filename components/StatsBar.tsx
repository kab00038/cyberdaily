// components/StatsBar.tsx
"use client";

import { useEffect, useState } from "react";

interface Stats {
  attacksToday: number;
  newCVEs: number;
  kevAdditions: number;
  sourcesMonitored: number;
}

export default function StatsBar() {
  const [stats, setStats] = useState<Stats>({
    attacksToday: 0,
    newCVEs: 0,
    kevAdditions: 0,
    sourcesMonitored: 6,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [threatsRes, threatmapRes] = await Promise.all([
          fetch("/api/threats"),
          fetch("/api/threatmap"),
        ]);

        const threats = await threatsRes.json();
        const threatmap = await threatmapRes.json();

        setStats({
          attacksToday:
            (Array.isArray(threatmap) ? threatmap : threatmap?.items)?.length ||
            0,
          newCVEs: threats.cves?.length || 0,
          kevAdditions: threats.kev?.length || 0,
          sourcesMonitored: 6,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  const statItems = [
    { label: "Sampled source IPs", value: stats.attacksToday, scope: "blocklist.de sample" },
    { label: "Loaded CVEs", value: stats.newCVEs, scope: "NVD · last 14 days · partial" },
    { label: "Recent KEV entries", value: stats.kevAdditions, scope: "CISA KEV · newest 10" },
    { label: "News sources", value: stats.sourcesMonitored, scope: "Configured RSS feeds" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {statItems.map((item) => (
        <div key={item.label} className="panel p-5 group">
          <div className="min-w-0 flex-1">
            <p className="metric-number text-ui-text">
              {item.value.toLocaleString()}
            </p>
            <p className="text-[11px] text-ui-muted font-medium mt-0.5">
              {item.label}
            </p>
            <p className="text-[11px] text-ui-muted font-mono mt-0.5">
              {item.scope}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
