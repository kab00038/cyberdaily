// components/TrendAnalytics.tsx
"use client";

import { useEffect, useState } from "react";
import { DistributionList } from "@/components/ui/DistributionList";
import { getCweName } from "@/lib/cwe-names";
import { formatPublishedAt, plural } from "@/lib/format";

interface TrendData {
  severityBreakdown: Record<string, number>;
  attackVectors: Record<string, number>;
  riskBreakdown: Record<string, number>;
  epssDistribution: { range: string; count: number }[];
  topCWEs: { cwe: string; count: number }[];
  vendorMentions: { vendor: string; count: number }[];
  totalCVEs: number;
  totalResults: number | null;
  totalKEV: number;
  epssCoverage: number;
  coverage: "complete" | "partial" | "unknown" | "stale";
  completeness: "complete" | "partial" | "unknown";
  nvdError: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  dataFetchedAt: string | null;
}

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"] as const;
const ATTACK_VECTOR_ORDER = ["NETWORK", "ADJACENT", "LOCAL", "PHYSICAL", "UNKNOWN"];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "var(--cd-critical)",
  HIGH: "var(--cd-high)",
  MEDIUM: "var(--cd-medium)",
  LOW: "var(--cd-low)",
  UNKNOWN: "var(--cd-unknown)",
};

export default function TrendAnalytics() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // A fresh controller per fetch cycle so the cleanup abort never kills an
    // in-flight request that a later interval tick started.
    let controller: AbortController | null = null;

    async function fetchTrends() {
      controller = new AbortController();
      try {
        const res = await fetch("/api/trends", { signal: controller.signal });
        if (!res.ok) throw new Error(`trends ${res.status}`);
        const trendData = await res.json();
        if (controller.signal.aborted) return;
        setData(trendData);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Failed to fetch trends:", err);
        if (controller.signal.aborted) return;
        // Keep previously loaded analytics visible on a refresh failure.
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchTrends();
    const interval = setInterval(fetchTrends, 3600000); // 1 hour
    return () => {
      controller?.abort();
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <p className="state-panel" role="status"><strong>Preparing the dataset notebook</strong>Loading the NVD publication window and distribution coverage.</p>
    );
  }

  // A refresh failure should not hide previously loaded analytics. Only fall
  // back to the full error panel when there is no data to show.
  if (error && !data) {
    return (
      <div className="state-panel" role="status">
        Analytics could not be loaded. Please try again later.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="state-panel" role="status">
        No analytics data available.
      </div>
    );
  }

  const nvdUnavailable = data.coverage === "unknown";

  const severityRows = SEVERITY_ORDER.map((key) => ({
    id: key,
    label: key,
    count: data.severityBreakdown?.[key] || 0,
    color: SEVERITY_COLORS[key] ?? "var(--cd-accent)",
  }));
  const severityTotal = severityRows.reduce((sum, r) => sum + r.count, 0);

  const attackVectorRows = ATTACK_VECTOR_ORDER.map((key) => ({
    id: key,
    label: key,
    count: data.attackVectors?.[key] || 0,
  }));
  const attackVectorTotal = attackVectorRows.reduce((sum, r) => sum + r.count, 0);

  const epssRows = (data.epssDistribution ?? []).map((bucket) => ({
    id: bucket.range,
    label: bucket.range,
    count: bucket.count,
  }));
  const epssTotal = epssRows.reduce((sum, r) => sum + r.count, 0);

  const vendorRows = (data.vendorMentions ?? []).map((v) => ({
    id: v.vendor,
    label: v.vendor,
    count: v.count,
  }));
  const vendorTotal = vendorRows.reduce((sum, r) => sum + r.count, 0);

  const cweRows = (data.topCWEs ?? []).map((c) => {
    const name = getCweName(c.cwe);
    // getCweName() falls back to the bare ID verbatim when unmapped — don't
    // print the same string twice in that case.
    const isUnmapped = name === c.cwe;
    return {
      id: c.cwe,
      label: isUnmapped ? (
        <span className="font-mono">{c.cwe}</span>
      ) : (
        <>
          <span className="font-mono text-ui-muted mr-1.5">{c.cwe}</span>
          <span>{name}</span>
        </>
      ),
      count: c.count,
    };
  });
  const cweTotal = cweRows.reduce((sum, r) => sum + r.count, 0);

  // EPSS coverage is reported as "N of M" against the loaded CVE set.
  const epssCoverageText =
    data.totalCVEs > 0
      ? `${data.epssCoverage} of ${data.totalCVEs}`
      : "0 of 0";
  const cveCountDisplay = nvdUnavailable ? "Unavailable" : data.totalCVEs;
  const epssDisplay = nvdUnavailable ? "Unavailable" : epssCoverageText;

  // Coverage is stated once, in the metric that already carries the
  // dataset's scope, rather than in a separate banner per chart.
  const coverageSuffix =
    data.coverage === "partial"
      ? " · partial"
      : data.coverage === "stale"
        ? " · stale"
        : "";

  return (
    <div className="space-y-6">
      {error && (
        <div className="panel rounded-lg p-3 text-xs text-ui-medium border border-ui-border bg-ui-raised">
          Refresh failed. Showing last successful update
          {data.dataFetchedAt
            ? ` from ${formatPublishedAt(data.dataFetchedAt)}.`
            : "."}
        </div>
      )}

      {/* Coverage state gate */}
      {nvdUnavailable && (
        <div className="panel rounded-lg p-3 text-xs text-ui-critical border border-ui-border bg-ui-raised">
          NVD data could not be loaded. Analytics are unavailable.
          {data.nvdError && (
            <p className="text-ui-secondary mt-1 font-mono">{data.nvdError}</p>
          )}
        </div>
      )}

      {nvdUnavailable ? (
        <p className="metadata">No analytics to display until NVD data is available.</p>
      ) : (
        <>
          {/* Summary stats — each metric names its dataset/catalog scope */}
          <div className="metric-ledger">
            <div className="metric-cell">
              <p className="metric-number text-ui-text">{cveCountDisplay}</p>
              <p className="metric-label">
                CVEs in loaded dataset
              </p>
              <p className="metric-scope">
                NVD · 14-day window{coverageSuffix}
              </p>
            </div>
            <div className="metric-cell">
              <p className="metric-number">{data.totalKEV}</p>
              <p className="metric-label">
                KEV catalog entries
              </p>
              <p className="metric-scope">
                CISA KEV · full catalog
              </p>
            </div>
            <div className="metric-cell">
              <p className="metric-number">{epssDisplay}</p>
              <p className="metric-label">
                EPSS coverage
              </p>
              <p className="metric-scope">
                EPSS scores for loaded CVEs
              </p>
            </div>
          </div>

          {/* Charts grid — one shared grammar: label / neutral track / value,
              no axes. Severity is the sole exception, keeping its semantic
              color ramp because that color carries real meaning. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Severity breakdown — label / bar / value regions */}
            <div className="panel rounded-lg p-4">
              <h2 className="text-sm font-semibold text-ui-secondary mb-4">
                Severity breakdown
              </h2>
              <DistributionList rows={severityRows} total={severityTotal} />
            </div>

            {/* Attack vector — label / bar / value regions */}
            <div className="panel rounded-lg p-4">
              <h2 className="text-sm font-semibold text-ui-secondary mb-4">
                Attack vector
              </h2>
              <DistributionList rows={attackVectorRows} total={attackVectorTotal} />
            </div>

            {/* EPSS score distribution — replaces the former daily-trend
                chart. NVD's capped, partial result set can't honestly
                answer "how many CVEs were published each day" (most days
                would render as a fabricated zero); it CAN describe the
                loaded set's own EPSS scores, so that's the question this
                panel answers instead. */}
            <div className="panel rounded-lg p-4">
              <h2 className="text-sm font-semibold text-ui-secondary mb-1">
                EPSS score distribution
              </h2>
              <p className="text-[11px] text-ui-muted mb-4">
                {plural(data.totalCVEs, "loaded CVE")}, {data.epssCoverage} EPSS scored
              </p>
              <DistributionList rows={epssRows} total={epssTotal} />
            </div>

            {/* Vendor mentions — same neutral grammar as attack vector */}
            <div className="panel rounded-lg p-4">
              <h2 className="text-sm font-semibold text-ui-secondary mb-1">
                Vendor mentions in descriptions
              </h2>
              <p className="text-[11px] text-ui-muted mb-4">
                Counts reflect text mentions, not confirmed affected products.
              </p>
              <DistributionList rows={vendorRows} total={vendorTotal} />
            </div>
          </div>

          {/* Top CWEs - full width, stacked layout for the longer names */}
          {(data.topCWEs?.length ?? 0) > 0 && (
            <div className="panel rounded-lg p-4">
              <h2 className="text-sm font-semibold text-ui-secondary mb-1">
                Top weakness types (CWE)
              </h2>
              <p className="text-[11px] text-ui-muted mb-3">
                Extracted from structured weakness IDs where available; otherwise empty.
              </p>
              <DistributionList rows={cweRows} total={cweTotal} stacked />
            </div>
          )}
        </>
      )}
    </div>
  );
}
