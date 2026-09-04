// components/TrendAnalytics.tsx
"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface TrendData {
  severityBreakdown: Record<string, number>;
  epssDistribution: { range: string; count: number }[];
  riskBreakdown: Record<string, number>;
  dailyTrend: { date: string; count: number }[];
  topCWEs: { cwe: string; count: number }[];
  topVendors: { vendor: string; count: number }[];
  totalCVEs: number;
  totalKEV: number;
  epssCoverage: number;
}

const COLORS = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
  UNKNOWN: "#6b7280",
};

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#6b7280"];

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
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-4" />
            <div className="h-48 bg-gray-800 rounded" />
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

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="panel rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-cyber-cyan font-mono">{data.totalCVEs}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total CVEs</p>
        </div>
        <div className="panel rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-cyber-red font-mono">{data.totalKEV}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">CISA KEV</p>
        </div>
        <div className="panel rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-cyber-green font-mono">{data.epssCoverage}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">EPSS Scored</p>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily CVE Trend */}
        <div className="panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
            14-Day CVE Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 10 }}
                tickFormatter={(v) => v.slice(5)} // MM-DD
              />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid #2a2a5a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#00f0ff"
                fill="#00f0ff"
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Severity Breakdown */}
        <div className="panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
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
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid #2a2a5a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px" }}
                formatter={(value) => <span style={{ color: "#9ca3af" }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* EPSS Distribution */}
        <div className="panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
            EPSS Exploit Probability
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.epssDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="range" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid #2a2a5a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Vendors */}
        <div className="panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
            Top Affected Vendors
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.topVendors} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="vendor"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid #2a2a5a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" fill="#00f0ff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top CWEs - full width */}
      {data.topCWEs.length > 0 && (
        <div className="panel rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
            Top Weakness Types (CWE)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.topCWEs.map((cwe) => (
              <div
                key={cwe.cwe}
                className="bg-cyber-dark/50 rounded-lg p-3 border border-gray-800"
              >
                <p className="text-xs font-mono text-cyber-cyan">{cwe.cwe}</p>
                <p className="text-lg font-bold text-white">{cwe.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
