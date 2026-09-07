// components/TrendAnalytics.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartDate } from "@/lib/format";

interface TrendData {
  severityBreakdown: Record<string, number>;
  attackVectors: Record<string, number>;
  riskBreakdown: Record<string, number>;
  dailyTrend: { date: string; count: number }[];
  topCWEs: { cwe: string; count: number }[];
  vendorMentions: { vendor: string; count: number }[];
  totalCVEs: number;
  totalKEV: number;
  epssCoverage: number;
  completeness: "complete" | "partial" | "unknown";
  nvdError: string | null;
}

const COLORS = {
  CRITICAL: "#EF4444",
  HIGH: "#F97316",
  MEDIUM: "#F59E0B",
  LOW: "#10B981",
  UNKNOWN: "#6B7280",
};

const ATTACK_VECTOR_COLORS: Record<string, string> = {
  NETWORK: "#EF4444",
  LOCAL: "#F97316",
  ADJACENT: "#F59E0B",
  PHYSICAL: "#10B981",
  UNKNOWN: "#6B7280",
};

const ATTACK_VECTOR_LABELS: Record<string, string> = {
  NETWORK: "Network",
  LOCAL: "Local",
  ADJACENT: "Adjacent",
  PHYSICAL: "Physical",
  UNKNOWN: "Unknown",
};

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"] as const;
const ATTACK_VECTOR_ORDER = ["NETWORK", "ADJACENT", "LOCAL", "PHYSICAL", "UNKNOWN"];

interface BarRow {
  name: string;
  count: number;
  percent: number;
  color: string;
}

// Horizontal-bar row tick: severity/label (colored) + "count · percent%".
function RowTick({
  x,
  y,
  payload,
  rows,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  rows: BarRow[];
}) {
  const row = rows.find((r) => r.name === payload?.value);
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text
        x={0}
        y={0}
        dy={4}
        fontSize={11}
        fontWeight={600}
        fill={row?.color ?? "#D1D5DB"}
      >
        {payload?.value}
      </text>
      <text
        x={150}
        y={0}
        dy={4}
        textAnchor="end"
        fontSize={10}
        fill="#6B7280"
        fontFamily="'JetBrains Mono', monospace"
      >
        {row ? `${row.count} · ${row.percent.toFixed(1)}%` : ""}
      </text>
    </g>
  );
}

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: BarRow }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <div className="panel px-3 py-2 text-xs">
      <span className="font-semibold" style={{ color: row.color }}>
        {row.name}
      </span>
      <span className="text-gray-400 font-mono ml-2">
        {row.count} · {row.percent.toFixed(1)}%
      </span>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "rgba(11, 15, 14, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "10px",
  fontSize: "12px",
  backdropFilter: "blur(8px)",
};

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

  const unavailable = data.completeness === "unknown" || data.nvdError !== null;
  const total = data.totalCVEs || 0;

  const severityRows: BarRow[] = SEVERITY_ORDER.map((key) => {
    const count = data.severityBreakdown?.[key] || 0;
    return {
      name: key,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
      color: COLORS[key] || "#6B7280",
    };
  });

  const attackVectorRows: BarRow[] = ATTACK_VECTOR_ORDER.map((key) => {
    const count = data.attackVectors?.[key] || 0;
    return {
      name: ATTACK_VECTOR_LABELS[key] || key,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
      color: ATTACK_VECTOR_COLORS[key] || "#6B7280",
    };
  });

  const barChartProps = {
    layout: "vertical" as const,
    margin: { top: 0, right: 8, bottom: 0, left: 0 },
    barCategoryGap: "20%",
  };

  return (
    <div className="space-y-6">
      {/* Dataset scope banner */}
      {data.completeness === "complete" && (
        <div className="panel rounded-lg p-3 text-xs text-gray-300 border border-white/[0.06]">
          Showing {data.totalCVEs} CVEs from NVD · last 14 days · complete dataset
        </div>
      )}
      {data.completeness === "partial" && (
        <div className="panel rounded-lg p-3 text-xs text-amber-300/90 border border-amber-500/20 bg-amber-500/[0.04]">
          Showing {data.totalCVEs} CVEs from NVD · last 14 days · partial dataset
          <p className="text-gray-400 mt-1">
            Counts and distributions are based on a partial result set.
          </p>
        </div>
      )}
      {unavailable && (
        <div className="panel rounded-lg p-3 text-xs text-red-300/90 border border-red-500/20 bg-red-500/[0.04]">
          NVD data could not be loaded. Analytics are unavailable.
          {data.nvdError && (
            <p className="text-gray-400 mt-1 font-mono">{data.nvdError}</p>
          )}
        </div>
      )}

      {unavailable ? (
        <p className="metadata">No analytics to display until NVD data is available.</p>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="panel rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-white font-display">{data.totalCVEs}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total CVEs</p>
            </div>
            <div className="panel rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-500 font-display">{data.totalKEV}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">CISA KEV</p>
            </div>
            <div className="panel rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-emerald-500 font-display">{data.epssCoverage}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">EPSS Scored</p>
            </div>
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Severity breakdown — horizontal bars with exact counts */}
            <div className="panel rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-4">
                Severity breakdown
              </h3>
              <ResponsiveContainer width="100%" height={severityRows.length * 42}>
                <BarChart data={severityRows} {...barChartProps}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.05)"
                    horizontal={false}
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    axisLine={false}
                    tickLine={false}
                    tick={<RowTick rows={severityRows} />}
                  />
                  <Tooltip
                    content={<BarTooltip />}
                    cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {severityRows.map((row) => (
                      <Cell key={row.name} fill={row.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Attack vector — horizontal bars with exact counts */}
            <div className="panel rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-4">
                Attack vector
              </h3>
              <ResponsiveContainer width="100%" height={attackVectorRows.length * 42}>
                <BarChart data={attackVectorRows} {...barChartProps}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.05)"
                    horizontal={false}
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    axisLine={false}
                    tickLine={false}
                    tick={<RowTick rows={attackVectorRows} />}
                  />
                  <Tooltip
                    content={<BarTooltip />}
                    cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {attackVectorRows.map((row) => (
                      <Cell key={row.name} fill={row.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Daily CVE trend */}
            <div className="panel rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-4">
                CVEs by publication date
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.dailyTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.05)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                    tickFormatter={(v) => v.slice(5)}
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

              {/* Readable fallback table */}
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