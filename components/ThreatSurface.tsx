// components/ThreatSurface.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

interface ThreatMapEntry {
  sourceIP: string;
  sourceCountry: string;
  sourceLat: number;
  sourceLng: number;
  destinationCountry: string;
  threatType: string;
  firstSeen: string;
}

const TYPE_COLORS: Record<string, string> = {
  malware: "#EF4444",
  phishing: "#F97316",
  botnet: "#F59E0B",
  spam: "#84CC16",
  default: "#6B7280",
};

const COUNTRY_COLORS = ["#10B981", "#06B6D4", "#8B5CF6", "#F59E0B", "#F43F5E", "#6B7280"];

const AXES = ["Malware", "Phishing", "DDoS", "Brute Force", "Botnet", "Scanning"];

const THREAT_AXIS_MAP: Record<string, number> = {
  "SSH Brute-Force": 3,
  "Login Brute-Force": 3,
  "FTP Brute-Force": 3,
  "Email Spam/Abuse": 1,
  "Web Attack (DDoS/SQLi)": 0, // malware + DDoS
  "VoIP/SIP Attack": 4,
  "Botnet Activity": 4,
  "IRC Bot": 4,
  "Aggressive Scanner": 5,
};

function hexagonPoints(radius: number): string {
  return AXES.map((_, i) => {
    const angle = (360 / 6) * i - 90;
    const rad = (angle * Math.PI) / 180;
    return `${150 + radius * Math.cos(rad)},${150 + radius * Math.sin(rad)}`;
  }).join(" ");
}

function dataPolygonPoints(values: number[]): string {
  return values.map((v, i) => {
    const angle = (360 / 6) * i - 90;
    const rad = (angle * Math.PI) / 180;
    const r = v * 120;
    return `${150 + r * Math.cos(rad)},${150 + r * Math.sin(rad)}`;
  }).join(" ");
}

function getThreatLevel(count: number): { label: string; color: string; percentage: number } {
  if (count >= 30) return { label: "Critical", color: "#EF4444", percentage: 100 };
  if (count >= 20) return { label: "High", color: "#F97316", percentage: 75 };
  if (count >= 10) return { label: "Elevated", color: "#F59E0B", percentage: 50 };
  return { label: "Low", color: "#10B981", percentage: 25 };
}

export default function ThreatSurface() {
  const [threats, setThreats] = useState<ThreatMapEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchThreats() {
      try {
        const res = await fetch("/api/threatmap");
        const data = await res.json();
        setThreats(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch threat surface data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchThreats();
    const interval = setInterval(fetchThreats, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  const { typeData, countryData, threatLevel, uniqueCountries, axisValues } = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};

    for (const t of threats) {
      const type = t.threatType || "unknown";
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      const country = t.sourceCountry || "Unknown";
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    }

    // Radar axis values: map threat types to the 6 attack-profile axes
    const axisCounts = [0, 0, 0, 0, 0, 0];
    for (const t of threats) {
      const axisIdx = THREAT_AXIS_MAP[t.threatType] ?? 0;
      axisCounts[axisIdx]++;
    }
    const maxCount = Math.max(...axisCounts, 1);
    const axisValues = axisCounts.map((c) => c / maxCount);

    const typeData = Object.entries(typeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const countryData = Object.entries(countryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      typeData,
      countryData,
      threatLevel: getThreatLevel(threats.length),
      uniqueCountries: Object.keys(countryCounts).length,
      axisValues,
    };
  }, [threats]);

  const tooltipStyle = {
    backgroundColor: "rgba(11, 15, 14, 0.95)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "10px",
    fontSize: "12px",
    backdropFilter: "blur(8px)",
  };

  if (loading) {
    return (
      <div className="panel p-5 animate-pulse">
        <div className="h-4 bg-white/[0.08] rounded w-1/3 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-40 bg-white/[0.04] rounded-xl" />
          <div className="h-40 bg-white/[0.04] rounded-xl" />
          <div className="h-40 bg-white/[0.04] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-widest">
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Threat Surface Map
        </h2>
        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {threats.length} active samples
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Threat type distribution */}
        <div>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Threat Types</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#D1D5DB", fontSize: 11, textAnchor: "end" }}
                  width={70}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: "#D1D5DB" }}
                  cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {typeData.map((entry) => (
                    <Cell key={entry.name} fill={TYPE_COLORS[entry.name.toLowerCase()] || TYPE_COLORS.default} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat level gauge */}
        <div className="flex flex-col items-center justify-center">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3 self-start">Threat Level</h3>
          <div className="relative w-40 h-40">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={threatLevel.color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${threatLevel.percentage * 2.64} 264`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold font-mono" style={{ color: threatLevel.color }}>
                {threats.length}
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Active</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: threatLevel.color }} />
            <span className="text-sm font-semibold" style={{ color: threatLevel.color }}>
              {threatLevel.label}
            </span>
          </div>
        </div>

        {/* Top source countries */}
        <div>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Top Source Regions</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={countryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {countryData.map((entry, idx) => (
                    <Cell key={entry.name} fill={COUNTRY_COLORS[idx % COUNTRY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: "#D1D5DB" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center -mt-2">
            <p className="text-xs text-gray-500">
              <span className="text-emerald-500 font-mono font-semibold">{uniqueCountries}</span> countries tracked
            </p>
          </div>
        </div>
      </div>

      {/* Hexagon radar chart */}
      <div className="mt-5 pt-5 border-t border-white/[0.06]">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Attack Profile</h3>
        <div className="flex justify-center">
          <svg viewBox="0 0 300 300" className="w-full max-w-[320px]">
            {/* 5 concentric hexagonal rings */}
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, i) => (
              <polygon
                key={i}
                points={hexagonPoints(120 * scale)}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
            ))}

            {/* 6 axis spokes */}
            {AXES.map((_, i) => {
              const angle = (360 / 6) * i - 90;
              const rad = (angle * Math.PI) / 180;
              const x = 150 + 120 * Math.cos(rad);
              const y = 150 + 120 * Math.sin(rad);
              return (
                <line key={i} x1={150} y1={150} x2={x} y2={y}
                  stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              );
            })}

            {/* Data polygon */}
            <polygon
              points={dataPolygonPoints(axisValues)}
              fill="rgba(16, 185, 129, 0.2)"
              stroke="#10B981"
              strokeWidth="2"
            />

            {/* Axis labels */}
            {AXES.map((label, i) => {
              const angle = (360 / 6) * i - 90;
              const rad = (angle * Math.PI) / 180;
              const x = 150 + 140 * Math.cos(rad);
              const y = 150 + 140 * Math.sin(rad);
              return (
                <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                  fill="#9CA3AF" fontSize="10" fontFamily="Inter, sans-serif">
                  {label}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
