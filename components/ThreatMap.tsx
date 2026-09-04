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
    <div className="bg-cyber-navy rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 bg-cyber-red rounded-full animate-pulse" />
          Global Threat Map
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Live attack-source activity from abuse.ch URLhaus
        </p>
      </div>
      <div className="relative aspect-[2/1] bg-cyber-dark/50">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 120,
            center: [10, 20],
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1a1a2e"
                  stroke="#33335e"
                  strokeWidth={0.5}
                />
              ))
            }
          </Geographies>

          {clusters.map((cluster, i) => {
            const radius = 3 + (cluster.count / maxCount) * 7;
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
                  stroke="#ff6b6b"
                  strokeWidth={1.5}
                  initial={{ r: radius, opacity: 0.7 }}
                  animate={{ r: radius + 14, opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.25,
                    ease: "easeOut",
                  }}
                />
                <circle
                  r={radius}
                  fill="#ff6b6b"
                  fillOpacity={0.35}
                  stroke="#ff6b6b"
                  strokeWidth={1}
                  style={{ cursor: "pointer" }}
                />
                <circle r={2} fill="#ff6b6b" />
              </Marker>
            );
          })}
        </ComposableMap>

        {/* Hover info chip */}
        {hovered && (
          <div className="absolute top-3 right-3 bg-cyber-dark/90 border border-cyber-red/40 rounded-lg px-3 py-2 text-xs pointer-events-none">
            <div className="text-cyber-red font-semibold">
              {countryName(hovered.country)}
            </div>
            <div className="text-gray-300 mt-0.5">
              {hovered.count} active source{hovered.count > 1 ? "s" : ""}
            </div>
            <div className="text-gray-500 mt-0.5">
              {hovered.threats.join(", ")}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-cyber-dark/80 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border border-cyber-red bg-cyber-red/30" />
            <span className="text-gray-400">Attack Source (size = activity)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
