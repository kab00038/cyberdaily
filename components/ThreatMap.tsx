// components/ThreatMap.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { motion } from "framer-motion";

interface ThreatMapEntry {
  sourceIP: string;
  sourceCountry: string;
  sourceLat: number;
  sourceLng: number;
  destinationCountry: string;
  threatType: string;
  firstSeen: string;
}

interface CountryCluster {
  country: string;
  lat: number;
  lng: number;
  count: number;
  threats: string[];
}

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", CN: "China", RU: "Russia", DE: "Germany",
  GB: "United Kingdom", FR: "France", BR: "Brazil", IN: "India",
  JP: "Japan", KR: "South Korea", AU: "Australia", CA: "Canada",
  NL: "Netherlands", UA: "Ukraine", PL: "Poland", TR: "Türkiye",
  VN: "Vietnam", ID: "Indonesia", MX: "Mexico", AR: "Argentina",
};

function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}

export default function ThreatMap() {
  const [threats, setThreats] = useState<ThreatMapEntry[]>([]);
  const [hovered, setHovered] = useState<CountryCluster | null>(null);

  useEffect(() => {
    async function fetchThreats() {
      try {
        const res = await fetch("/api/threatmap");
        const data = await res.json();
        setThreats(data);
      } catch (error) {
        console.error("Failed to fetch threat map:", error);
      }
    }

    fetchThreats();
    const interval = setInterval(fetchThreats, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  // Cluster real attack sources by country (URLhaus provides no destinations,
  // so the map shows where attacks originate — nothing is fabricated).
  const clusters = useMemo<CountryCluster[]>(() => {
    const byCountry: Record<
      string,
      { lat: number; lng: number; count: number; threats: string[] }
    > = {};
    for (const t of threats) {
      let c = byCountry[t.sourceCountry];
      if (!c) {
        c = byCountry[t.sourceCountry] = {
          lat: 0,
          lng: 0,
          count: 0,
          threats: [],
        };
      }
      c.count++;
      c.lat += t.sourceLat;
      c.lng += t.sourceLng;
      if (!c.threats.includes(t.threatType)) c.threats.push(t.threatType);
    }
    return Object.entries(byCountry)
      .map(([country, c]) => ({
        country,
        lat: c.lat / c.count,
        lng: c.lng / c.count,
        count: c.count,
        threats: c.threats,
      }))
      .sort((a, b) => b.count - a.count);
  }, [threats]);

  const maxCount = clusters[0]?.count ?? 1;

  return (
    <div className="panel rounded-xl overflow-hidden h-full flex flex-col map-glow relative">
      <div className="panel-header p-4 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-3">
            <span className="w-2 h-2 bg-cyber-red rounded-full animate-pulse shadow-[0_0_10px_rgba(255,71,87,0.8)]" />
            Global Threat Map
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            Live attack-source activity from abuse.ch URLhaus
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
          {clusters.length} source regions
        </div>
      </div>
      <div className="relative flex-1 min-h-0 bg-cyber-dark/80 scanlines grid-overlay overflow-hidden">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 140,
            center: [10, 25],
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#13132a"
                  stroke="#2a2a5a"
                  strokeWidth={0.6}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#1c1c3d" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {clusters.map((cluster, i) => {
            const radius = 3 + (cluster.count / maxCount) * 8;
            return (
              <Marker
                key={cluster.country}
                coordinates={[cluster.lng, cluster.lat]}
                onMouseEnter={() => setHovered(cluster)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Expanding pulse ring */}
                <motion.circle
                  r={radius}
                  fill="none"
                  stroke="#ff4757"
                  strokeWidth={1.5}
                  initial={{ r: radius, opacity: 0.7 }}
                  animate={{ r: radius + 16, opacity: 0 }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeOut",
                  }}
                />
                <circle
                  r={radius}
                  fill="#ff4757"
                  fillOpacity={0.25}
                  stroke="#ff4757"
                  strokeWidth={1}
                  style={{
                    cursor: "pointer",
                    filter: "drop-shadow(0 0 6px rgba(255,71,87,0.6))",
                  }}
                />
                <circle r={2} fill="#ff4757" />
              </Marker>
            );
          })}
        </ComposableMap>

        {/* Animated scan line */}
        <div className="scan-line" />

        {/* Hover info chip */}
        {hovered && (
          <div className="absolute top-4 right-4 bg-cyber-dark/95 border border-cyber-red/40 rounded-lg px-4 py-3 text-xs pointer-events-none shadow-glow-red backdrop-blur-sm z-20">
            <div className="text-cyber-red font-semibold text-sm font-mono">
              {countryName(hovered.country)}
            </div>
            <div className="text-gray-300 mt-1 font-mono">
              {hovered.count} active source{hovered.count > 1 ? "s" : ""}
            </div>
            <div className="text-gray-500 mt-1 max-w-[200px] truncate">
              {hovered.threats.join(", ")}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-cyber-dark/80 border border-cyber-cyan/20 rounded-lg p-3 text-xs backdrop-blur-sm z-20">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border border-cyber-red bg-cyber-red/30 shadow-[0_0_8px_rgba(255,71,87,0.5)]" />
            <span className="text-gray-400 font-mono">Attack Source (size = activity)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
