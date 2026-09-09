// components/sections/ThreatsSection.tsx
"use client";

import ThreatForecast from "@/components/ThreatForecast";

export default function ThreatsSection() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Vulnerability register / NVD · CISA · FIRST</p>
        <h1 className="page-title">Vulnerabilities</h1>
        <p className="page-subtitle">
          Browse recent CVEs and known exploited vulnerabilities
        </p>
      </header>
      <div className="page-body">
        <div className="panel flat-panel">
          <div className="panel-body">
            <ThreatForecast />
          </div>
        </div>
      </div>
    </>
  );
}