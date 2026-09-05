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
    {
      label: "Attacks Tracked",
      value: stats.attacksToday,
      delta: "+12%",
      deltaPositive: false,
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: "New CVEs",
      value: stats.newCVEs,
      delta: "+8%",
      deltaPositive: true,
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      label: "KEV Additions",
      value: stats.kevAdditions,
      delta: "+2",
      deltaPositive: true,
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      label: "Sources",
      value: stats.sourcesMonitored,
      delta: "0",
      deltaPositive: true,
      icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="panel p-5 flex items-start gap-4 group"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#0B0F0E]/50 border border-white/[0.08] flex items-center justify-center text-gray-500 group-hover:text-emerald-500 transition-colors duration-300">
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-2xl sm:text-3xl font-bold text-white font-display group-hover:scale-105 transition-transform duration-300 origin-left">
                {item.value.toLocaleString()}
              </p>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  item.deltaPositive
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-red-500/15 text-red-500"
                }`}
              >
                {item.delta}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 uppercase tracking-widest font-medium mt-0.5">
              {item.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
