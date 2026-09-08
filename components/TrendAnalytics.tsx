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
  backgroundColor: "rgba(11, 15, 14, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "10px",
  fontSize: "12px",
  backdropFilter: "blur(8px)",
};

// Small banner above the daily trend chart reconciling the chart with the
// actual snapshot the bins were built from.
const COVERAGE_TONES: Record<TrendData["coverage"], string> = {
  complete: "text-gray-300 border-white/[0.06]",
  partial: "text-amber-300/90 border-amber-500/20 bg-amber-500/[0.04]",
  stale: "text-orange-300/90 border-orange-500/25 bg-orange-500/[0.05]",
  unknown: "text-red-300/90 border-red-500/20 bg-red-500/[0.04]",
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
        <p className="text-gray-400 mt-1">
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
    let cancelled = false;

    async function fetchTrends() {
      try {
        const res = await fetch("/api/trends");
        if (!res.ok) throw new Error(`trends ${res.status}`);
        const trendData = await res.json();
        if (!cancelled) setData(trendData);
      } catch (err) {
        console.error("Failed to fetch trends:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTrends();
    const interval = setInterval(fetchTrends, 3600000); // 1 hour
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="panel rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-white/[0.08] rounded w-1/3 mb-4" />
            <div className="h-48 bg-white/[0.04] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel rounded-lg p-4 text-xs text-gray-400 border border-white/[0.06]">
        Analytics could not be loaded. Please try again later.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="panel rounded-lg p-4 text-xs text-gray-400 border border-white/[0.06]">
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
      {/* Coverage state gate */}
      {nvdUnavailable && (
        <div className="panel rounded-lg p-3 text-xs text-red-300/90 border border-red-500/20 bg-red-500/[0.04]">
          NVD data could not be loaded. Analytics are unavailable.
          {data.nvdError && (
            <p className="text-gray-400 mt-1 font-mono">{data.nvdError}</p>
          )}
        </div>
      )}

      {nvdUnavailable ? (
        <p className="metadata">No analytics to display until NVD data is available.</p>
      ) : (
        <>
          {/* Summary stats — each metric names its dataset/catalog scope */}
          <div className="grid grid-cols-3 gap-4">
            <div className="panel rounded-lg p-4 text-center">
              <p className="metric-number text-white">{cveCountDisplay}</p>
              <p className="text-xs text-gray-500">
                CVEs in loaded dataset
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                NVD · 14-day window
              </p>
            </div>
            <div className="panel rounded-lg p-4 text-center">
              <p className="metric-number text-red-500">{data.totalKEV}</p>
              <p className="text-xs text-gray-500">
                KEV catalog entries
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                CISA KEV · full catalog
              </p>
            </div>
            <div className="panel rounded-lg p-4 text-center">
              <p className="metric-number text-emerald-500">{epssDisplay}</p>
              <p className="text-xs text-gray-500">
                EPSS coverage
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                EPSS scores for loaded CVEs
              </p>
            </div>
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Severity breakdown — label / bar / value regions */}
            <div className="panel rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-4">
                Severity breakdown
              </h3>
              <DistributionList rows={severityRows} total={severityTotal} />
            </div>

            {/* Attack vector — label / bar / value regions */}
            <div className="panel rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-4">
                Attack vector
              </h3>
              <DistributionList rows={attackVectorRows} total={attackVectorTotal} />
            </div>

            {/* Daily CVE trend */}
            <div className="panel rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-4">
                CVEs by publication date
              </h3>
              <CoverageBanner data={data} />

              {data.dailyTrend.length === 0 && data.coverage !== "complete" ? (
                <p className="py-8 text-center text-xs text-gray-500">
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
                      tick={{ fill: "#6B7280", fontSize: 10 }}
                      tickFormatter={(v) => formatChartDate(v).slice(5)}
                    />
                    <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: "#D1D5DB" }}
                      labelStyle={{ color: "#6B7280" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {/* Readable fallback table */}
              {data.dailyTrend.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs text-emerald-500 font-mono select-none">
                    Show data table
                  </summary>
                  <table className="w-full mt-3 text-xs">
                    <caption className="text-left text-gray-500 mb-2">
                      CVE count per publication date (UTC)
                    </caption>
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left font-medium text-gray-400 py-1 pr-4">
                          Date
                        </th>
                        <th className="text-right font-medium text-gray-400 py-1">
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {data.dailyTrend.map((row) => (
                        <tr key={row.date} className="border-b border-white/[0.04]">
                          <td className="py-1 pr-4 text-gray-300">
                            {formatChartDate(row.date)}
                          </td>
                          <td className="py-1 text-right text-gray-500">
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
              <h3 className="text-sm font-semibold text-gray-200 mb-1">
                Vendor mentions in descriptions
              </h3>
              <p className="text-[10px] text-gray-500 mb-4">
                Counts reflect text mentions, not confirmed affected products.
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.vendorMentions} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.05)"
                  />
                  <XAxis type="number" tick={{ fill: "#6B7280", fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="vendor"
                    tick={{ fill: "#D1D5DB", fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: "#D1D5DB" }}
                    labelStyle={{ color: "#6B7280" }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top CWEs - full width */}
          {data.topCWEs.length > 0 && (
            <div className="panel rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-1">
                Top weakness types (CWE)
              </h3>
              <p className="text-[10px] text-gray-500 mb-3">
                Extracted from structured weakness IDs where available; otherwise empty.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.topCWEs.map((cwe) => (
                  <div
                    key={cwe.cwe}
                    className="bg-[#0B0F0E]/50 rounded-lg p-3 border border-white/[0.06]"
                  >
                    <p className="text-xs font-mono text-emerald-500">{cwe.cwe}</p>
                    <p className="text-lg font-bold text-white">{cwe.count}</p>
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