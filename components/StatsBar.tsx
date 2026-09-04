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
          attacksToday: threatmap.length || 0,
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
    { label: "Attacks Tracked", value: stats.attacksToday, color: "text-cyber-red" },
    { label: "New CVEs", value: stats.newCVEs, color: "text-yellow-400" },
    { label: "KEV Additions", value: stats.kevAdditions, color: "text-orange-400" },
    { label: "Sources", value: stats.sourcesMonitored, color: "text-cyber-green" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="bg-cyber-navy rounded-lg p-4 border border-gray-800"
        >
          <p className="text-xs text-gray-400 uppercase tracking-wider">{item.label}</p>
          <p className={`text-2xl font-bold ${item.color} font-mono`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
