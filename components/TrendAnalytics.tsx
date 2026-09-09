// components/TrendAnalytics.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DistributionList } from "@/components/ui/DistributionList";
import { formatChartDate, formatPublishedAt } from "@/lib/format";

interface TrendData {
  severityBreakdown: Record<string, number>;
  attackVectors: Record<string, number>;
  riskBreakdown: Record<string, number>;
  dailyTrend: { date: string; count: number }[];
  topCWEs: { cwe: string; count: number }[];
  vendorMentions: { vendor: string; count: number }[];
  totalCVEs: number;
  totalResults: number | null;
  totalKEV: number;
  epssCoverage: number;
  coverage: "complete" | "partial" | "unknown" | "stale";
  coverageNote: string | null;
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

const tooltipStyle = {
  backgroundColor: "var(--cd-canvas)",
  border: "1px solid var(--cd-border)",
  borderRadius: "10px",
  fontSize: "12px",
};

// Small banner above the daily trend chart reconciling the chart with the
// actual snapshot the bins were built from.
const COVERAGE_TONES: Record<TrendData["coverage"], string> = {
  complete: "text-ui-secondary border-ui-border",
  partial: "text-ui-medium border-ui-border bg-ui-raised",
  stale: "text-ui-medium border-ui-border bg-ui-raised",
  unknown: "text-ui-critical border-ui-border bg-ui-raised",
};

function CoverageBanner({ data }: { data: TrendData }) {
  const {
    coverage,
    totalCVEs,
    totalResults,
    windowStart,
    windowEnd,
    dataFetchedAt,
  } = data;
  const range =
    windowStart && windowEnd ? `${windowStart} → ${windowEnd}` : "n/a";

  let message: string;
  switch (coverage) {
    case "complete":
      message = `Showing ${totalCVEs} CVEs published ${range} (UTC). Snapshot fetched ${formatPublishedAt(dataFetchedAt)}.`;
      break;
    case "partial":
      message = `Partial coverage: ${totalCVEs} of ${totalResults ?? "?"} CVEs in window ${range}.`;
      break;
    case "stale":
      message = `Snapshot is from ${formatPublishedAt(dataFetchedAt)} — bins reflect that window, not today's.`;
      break;
    case "unknown":
    default:
      message = "NVD data could not be loaded.";
      break;
  }

  return (
    <div
      className={`rounded-lg p-3 text-xs mb-4 border ${COVERAGE_TONES[coverage]}`}
    >
      {message}
      {coverage === "partial" && (
        <p className="text-ui-secondary mt-1">
          Counts and distributions are based on a partial result set.
        </p>
      )}
    </div>
  );
}

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
    color: "var(--cd-accent)",
  }));
  const attackVectorTotal = attackVectorRows.reduce((sum, r) => sum + r.count, 0);

  // EPSS coverage is reported as "N of M" against the loaded CVE set.
  const epssCoverageText =
    data.totalCVEs > 0
      ? `${data.epssCoverage} of ${data.totalCVEs}`
      : "0 of 0";
  const cveCountDisplay = nvdUnavailable ? "Unavailable" : data.totalCVEs;
  const epssDisplay = nvdUnavailable ? "Unavailable" : epssCoverageText;

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
                NVD · 14-day window
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

          {/* Charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Severity breakdown — label / bar / value regions */}
            <div className="panel rounded-lg p-4">
              <h3 className="text-sm font-semibold text-ui-secondary mb-4">
                Severity breakdown
              </h3>
              <DistributionList rows={severityRows} total={severityTotal} />
            </div>

            {/* Attack vector — label / bar / value regions */}
            <div className="panel rounded-lg p-4">
              <h3 className="text-sm font-semibold text-ui-secondary mb-4">
                Attack vector
              </h3>
              <DistributionList rows={attackVectorRows} total={attackVectorTotal} />
            </div>

            {/* Daily CVE trend */}
            <div className="panel rounded-lg p-4">
              <h3 className="text-sm font-semibold text-ui-secondary mb-4">
                CVEs by publication date
              </h3>
              <CoverageBanner data={data} />

              {data.dailyTrend.length === 0 && data.coverage !== "complete" ? (
                <p className="py-8 text-center text-xs text-ui-muted">
                  No loaded records cover this period
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.dailyTrend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255, 255, 255, 0.05)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "var(--cd-muted)", fontSize: 10 }}
                      tickFormatter={(v) => formatChartDate(v).slice(5)}
                    />
                    <YAxis tick={{ fill: "var(--cd-muted)", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: "var(--cd-secondary)" }}
                      labelStyle={{ color: "var(--cd-muted)" }}
                    />
                    <Area
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="count"
                      stroke="var(--cd-accent)"
                      fill="var(--cd-accent)"
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* Readable fallback table */}
              {data.dailyTrend.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs text-ui-accent font-mono select-none">
                    Show data table
                  </summary>
                  <table className="w-full mt-3 text-xs">
                    <caption className="text-left text-ui-muted mb-2">
                      CVE count per publication date (UTC)
                    </caption>
                    <thead>
                      <tr className="border-b border-ui-border">
                        <th className="text-left font-medium text-ui-secondary py-1 pr-4">
                          Date
                        </th>
                        <th className="text-right font-medium text-ui-secondary py-1">
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {data.dailyTrend.map((row) => (
                        <tr key={row.date} className="border-b border-ui-border">
                          <td className="py-1 pr-4 text-ui-secondary">
                            {formatChartDate(row.date)}
                          </td>
                          <td className="py-1 text-right text-ui-muted">
                            {row.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
            </div>

            {/* Vendor mentions */}
            <div className="panel rounded-lg p-4">
              <h3 className="text-sm font-semibold text-ui-secondary mb-1">
                Vendor mentions in descriptions
              </h3>
              <p className="text-[11px] text-ui-muted mb-4">
                Counts reflect text mentions, not confirmed affected products.
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.vendorMentions} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.05)"
                  />
                  <XAxis type="number" tick={{ fill: "var(--cd-muted)", fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="vendor"
                    tick={{ fill: "var(--cd-secondary)", fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: "var(--cd-secondary)" }}
                    labelStyle={{ color: "var(--cd-muted)" }}
                  />
                  <Bar dataKey="count" fill="var(--cd-secondary)" radius={[0, 2, 2, 0]} maxBarSize={16} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top CWEs - full width */}
          {data.topCWEs.length > 0 && (
            <div className="panel rounded-lg p-4">
              <h3 className="text-sm font-semibold text-ui-secondary mb-1">
                Top weakness types (CWE)
              </h3>
              <p className="text-[11px] text-ui-muted mb-3">
                Extracted from structured weakness IDs where available; otherwise empty.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.topCWEs.map((cwe) => (
                  <div
                    key={cwe.cwe}
                    className="bg-ui-canvas rounded-lg p-3 border border-ui-border"
                  >
                    <p className="text-xs font-mono text-ui-accent">{cwe.cwe}</p>
                    <p className="text-lg font-bold text-ui-text">{cwe.count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}