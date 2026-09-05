// components/TrendAnalytics.tsx
"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface TrendData {
  severityBreakdown: Record<string, number>;
  attackVectors: Record<string, number>;
  riskBreakdown: Record<string, number>;
  dailyTrend: { date: string; count: number }[];
  topCWEs: { cwe: string; count: number }[];
  topVendors: { vendor: string; count: number }[];
  totalCVEs: number;
  totalKEV: number;
  epssCoverage: number;
}

const COLORS = {
  CRITICAL: "#EF4444",
  HIGH: "#F97316",
  MEDIUM: "#F59E0B",
  LOW: "#10B981",
  UNKNOWN: "#6B7280",
};

const PIE_COLORS = ["#EF4444", "#F97316", "#F59E0B", "#10B981", "#6B7280"];

const ATTACK_VECTOR_COLORS: Record<string, string> = {
  NETWORK: "#EF4444",
  LOCAL: "#F97316",
  ADJACENT: "#F59E0B",
  PHYSICAL: "#10B981",
};

const ATTACK_VECTOR_LABELS: Record<string, string> = {
  NETWORK: "Network",
  LOCAL: "Local",
  ADJACENT: "Adjacent",
  PHYSICAL: "Physical",
};

export default function TrendAnalytics() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrends() {
      try {
        const res = await fetch("/api/trends");
        const trendData = await res.json();
        setData(trendData);
      } catch (error) {
        console.error("Failed to fetch trends:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrends();
    const interval = setInterval(fetchTrends, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
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

  const severityData = Object.entries(data.severityBreakdown).map(([name, value]) => ({
    name,
    value,
  }));

  const riskData = Object.entries(data.riskBreakdown).map(([name, value]) => ({
    name,
    value,
  }));

  const attackVectorData = ["NETWORK", "LOCAL", "ADJACENT", "PHYSICAL"].map((key) => ({
    key,
    name: ATTACK_VECTOR_LABELS[key],
    value: data.attackVectors?.[key] || 0,
  }));

  const tooltipStyle = {
    backgroundColor: "rgba(11, 15, 14, 0.95)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "10px",
    fontSize: "12px",
    backdropFilter: "blur(8px)",
  };

  return (
    <div className="space-y-6">
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
        {/* Daily CVE Trend */}
        <div className="panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4 uppercase tracking-wider">
            14-Day CVE Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
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
        </div>

        {/* Severity Breakdown */}
        <div className="panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4 uppercase tracking-wider">
            Severity Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {severityData.map((entry, i) => (
                  <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS] || PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: "#D1D5DB" }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(value) => <span style={{ color: "#6B7280" }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Attack Vector */}
        <div className="panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4 uppercase tracking-wider">
            Attack Vector
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attackVectorData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis type="number" tick={{ fill: "#6B7280", fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#D1D5DB", fontSize: 11 }}
                width={70}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: "#D1D5DB" }}
                labelStyle={{ color: "#6B7280" }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {attackVectorData.map((entry) => (
                  <Cell key={entry.key} fill={ATTACK_VECTOR_COLORS[entry.key] || "#6B7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Vendors */}
        <div className="panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-4 uppercase tracking-wider">
            Top Affected Vendors
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.topVendors} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
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
          <h3 className="text-sm font-semibold text-gray-200 mb-4 uppercase tracking-wider">
            Top Weakness Types (CWE)
          </h3>
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
    </div>
  );
}
