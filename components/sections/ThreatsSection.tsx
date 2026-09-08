// components/sections/ThreatsSection.tsx
"use client";

import ThreatForecast from "@/components/ThreatForecast";

export default function ThreatsSection() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Vulnerabilities</h1>
        <p className="page-subtitle">
          Browse recent CVEs and known exploited vulnerabilities
        </p>
      </header>
      <div className="page-body">
        <div className="panel rounded-lg overflow-hidden">
          <div className="panel-body">
            <ThreatForecast />
          </div>
        </div>
      </div>
    </>
  );
}