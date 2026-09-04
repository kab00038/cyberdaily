// components/sections/ThreatsSection.tsx
"use client";

import ThreatForecast from "@/components/ThreatForecast";

export default function ThreatsSection() {
  return (
    <div className="panel rounded-lg overflow-hidden">
      <div className="panel-header p-4">
        <h2 className="text-sm font-semibold text-[#F0E8E0] flex items-center gap-2 uppercase tracking-widest">
          <svg className="w-4 h-4 text-[#E85030]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Threat Intel & Risk Scoring
        </h2>
      </div>
      <div className="p-4">
        <ThreatForecast />
      </div>
    </div>
  );
}
