// components/sections/AnalyticsSection.tsx
"use client";

import TrendAnalytics from "@/components/TrendAnalytics";

export default function AnalyticsSection() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Dataset notebook / Scope before signal</p>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">
          Dataset scope and distribution breakdowns
        </p>
      </header>
      <div className="page-body">
        <div className="panel flat-panel">
          <div className="panel-body">
            <TrendAnalytics />
          </div>
        </div>
      </div>
    </>
  );
}