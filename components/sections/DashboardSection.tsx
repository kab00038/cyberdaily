// components/sections/DashboardSection.tsx
"use client";

import StatsBar from "@/components/StatsBar";
import ThreatMap from "@/components/ThreatMap";
import TrendAnalytics from "@/components/TrendAnalytics";
import ThreatSurface from "@/components/ThreatSurface";

export default function DashboardSection() {
  return (
    <div className="space-y-6">
      <StatsBar />

      {/* Threat surface overview */}
      <ThreatSurface />

      {/* Trend analytics */}
      <div className="panel rounded-lg overflow-hidden">
        <div className="panel-header p-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-widest">
            <svg className="w-4 h-4 text-cyber-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Threat Intelligence Analytics
          </h2>
        </div>
        <div className="p-4">
          <TrendAnalytics />
        </div>
      </div>

      {/* Threat map hero */}
      <div className="h-[40vh] sm:h-[45vh] lg:h-[50vh] min-h-[300px]">
        <ThreatMap />
      </div>
    </div>
  );
}
