// components/ThreatMap.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
} from "react-simple-maps";
import { motion, AnimatePresence } from "framer-motion";

interface ThreatMapEntry {
  sourceIP: string;
  sourceCountry: string;
  sourceLat: number;
  sourceLng: number;
  destinationCountry: string;
  threatType: string;
  firstSeen: string;
}

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Fixed destination point (e.g., US East Coast)
const DESTINATION: [number, number] = [-74.006, 40.7128];

export default function ThreatMap() {
  const [threats, setThreats] = useState<ThreatMapEntry[]>([]);
  const [activeArcs, setActiveArcs] = useState<ThreatMapEntry[]>([]);
  const arcIndex = useRef(0);

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

  // Animate arcs one by one
  useEffect(() => {
    if (threats.length === 0) return;

    const interval = setInterval(() => {
      const next = threats[arcIndex.current % threats.length];
      setActiveArcs((prev) => {
        const updated = [...prev, next];
        return updated.slice(-8); // Keep last 8 arcs
      });
      arcIndex.current++;
    }, 2000);

    return () => clearInterval(interval);
  }, [threats]);

  return (
    <div className="bg-cyber-navy rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 bg-cyber-red rounded-full animate-pulse" />
          Global Threat Map
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Real-time malicious URL activity from abuse.ch
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
                  stroke="#2a2a4e"
                  strokeWidth={0.5}
                />
              ))
            }
          </Geographies>

          <AnimatePresence>
            {activeArcs.map((threat, i) => (
              <motion.g
                key={`${threat.sourceIP}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Line
                  from={[threat.sourceLng, threat.sourceLat]}
                  to={DESTINATION}
                  stroke="#ff6b6b"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeDasharray="4,4"
                />
                <circle
                  cx={threat.sourceLng}
                  cy={threat.sourceLat}
                  r={3}
                  fill="#ff6b6b"
                  className="animate-ping"
                />
              </motion.g>
            ))}
          </AnimatePresence>
        </ComposableMap>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-cyber-dark/80 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-0.5 bg-cyber-red" />
            <span className="text-gray-400">Attack Source</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-cyber-red rounded-full animate-ping" />
            <span className="text-gray-400">Active Threat</span>
          </div>
        </div>
      </div>
    </div>
  );
}
