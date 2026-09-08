// components/ThreatMap.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { formatPublishedAt } from "@/lib/format";

interface ThreatMapEntry {
  sourceIP: string;
  sourceCountry: string;
  sourceLat: number;
  sourceLng: number;
  destinationCountry: string;
  threatType: string;
  observedAt: string;
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

// Sentinel used for the aggregated "Other" row (top N excluded).
const OTHER = "__other__";
const TOP_N = 5;

export default function ThreatMap() {
  const [threats, setThreats] = useState<ThreatMapEntry[]>([]);
  const [hovered, setHovered] = useState<CountryCluster | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const mapAreaRef = useRef<HTMLDivElement>(null);

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
  const totalRecords = threats.length;

  // All entries share one observedAt after Phase A; take the most recent.
  const snapshotTime = useMemo(() => {
    let latest: string | null = null;
    for (const t of threats) {
      if (t.observedAt && (!latest || t.observedAt > latest)) latest = t.observedAt;
    }
    return latest;
  }, [threats]);

  // Country distribution rows: top N + an "Other" bucket for the remainder.
  const rows = useMemo<CountryCluster[]>(() => {
    const base = clusters.slice(0, TOP_N);
    if (clusters.length <= TOP_N) return base;
    const restCount = clusters
      .slice(TOP_N)
      .reduce((sum, c) => sum + c.count, 0);
    return [
      ...base,
      { country: OTHER, lat: 0, lng: 0, count: restCount, threats: [] },
    ];
  }, [clusters]);

  const selectedCluster = selectedCountry
    ? clusters.find((c) => c.country === selectedCountry) ?? null
    : null;
  // The hover chip reflects the selection once one exists.
  const activeCluster = selectedCluster ?? hovered;

  const percent = (count: number): string =>
    totalRecords > 0 ? `${((count / totalRecords) * 100).toFixed(1)}%` : "0%";

  const selectCountry = (code: string) => {
    if (selectedCountry === code) {
      clearSelection();
      return;
    }
    const cluster = clusters.find((c) => c.country === code) ?? null;
    setSelectedCountry(code);
    setHovered(cluster);
  };

  const clearSelection = () => {
    setSelectedCountry(null);
    setHovered(null);
  };

  const handleEscape = () => {
    if (selectedCountry !== null) {
      clearSelection();
      // Return focus to the map container so focus doesn't trap.
      mapAreaRef.current?.focus();
    }
  };

  return (
    <div
      className="panel rounded-xl overflow-hidden flex flex-col relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") handleEscape();
      }}
    >
      <div className="panel-header flex items-center justify-between shrink-0 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-3 font-display">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            Reported IP sample
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            blocklist.de · sampled records with IP geolocation
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5 font-mono">
            This is a category-balanced sample, not a count of worldwide attacks.
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5 font-mono">
            {snapshotTime
              ? `Snapshot: ${formatPublishedAt(snapshotTime)} · Refreshed every 5 min`
              : "Refreshed every 5 min"}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-mono shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {clusters.length} source regions
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
        {/* Map */}
        <div
          ref={mapAreaRef}
          tabIndex={-1}
          role="group"
          aria-label="Reported IP sample map"
          className="relative map-frame min-w-0 bg-[#0B0F0E]/80 scanlines grid-overlay overflow-hidden focus:outline-none"
        >
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
                    fill="#1F2937"
                    stroke="#374151"
                    strokeWidth={0.6}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#374151" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {clusters.map((cluster) => {
              const isSelected = selectedCountry === cluster.country;
              const scale = isSelected ? 1.5 : 1;
              const baseRadius = Math.sqrt(cluster.count / maxCount) * 10 + 4;
              const radius = baseRadius * scale;
              const label = `${countryName(cluster.country)}, ${cluster.count} sampled records`;
              return (
                <Marker
                  key={cluster.country}
                  coordinates={[cluster.lng, cluster.lat]}
                  role="button"
                  tabIndex={0}
                  aria-label={label}
                  aria-pressed={isSelected}
                  onMouseEnter={() => setHovered(cluster)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(cluster)}
                  onBlur={() => setHovered(null)}
                  onClick={() => selectCountry(cluster.country)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectCountry(cluster.country);
                    }
                  }}
                >
                  <circle
                    r={radius}
                    fill="none"
                    stroke="#64DFA6"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <circle
                    r={Math.max(2, radius * 0.55)}
                    fill="#64DFA6"
                    fillOpacity={0.85}
                    style={{ cursor: "pointer" }}
                    aria-hidden="true"
                  />
                  {isSelected && (
                    <circle
                      key={`pulse-${cluster.country}`}
                      r={radius}
                      fill="none"
                      stroke="#64DFA6"
                      strokeWidth={2}
                      className="map-pulse"
                      aria-hidden="true"
                    />
                  )}
                </Marker>
              );
            })}
          </ComposableMap>

          {/* Hover / selected info chip */}
          {activeCluster && (
            <div className="absolute top-4 right-4 panel px-4 py-3 text-xs pointer-events-none z-20">
              <div className="text-emerald-400 font-semibold text-sm font-mono">
                {countryName(activeCluster.country)}
              </div>
              <div className="text-gray-300 mt-1 font-mono">
                {activeCluster.count} sampled record{activeCluster.count > 1 ? "s" : ""}
              </div>
              <div className="text-gray-500 mt-1 max-w-[200px] truncate">
                {activeCluster.threats.join(", ")}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 panel p-3 text-xs z-20">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border border-emerald-500 bg-emerald-500/30" />
              <span className="text-gray-500 font-mono">Size = sampled records</span>
            </div>
            {selectedCluster && (
              <div className="mt-2 text-emerald-400 font-mono">
                Selected: {countryName(selectedCluster.country)} ·{" "}
                {selectedCluster.count} record{selectedCluster.count > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>

        {/* Country distribution list */}
        <div className="min-w-0 border-t lg:border-t-0 lg:border-l border-ui-border bg-[#0B0F0E]/40">
          <div className="panel-body">
            <h3 className="section-title">Country distribution</h3>
            <p className="metadata mt-0.5">
              {totalRecords > 0
                ? `${totalRecords} sampled records · sorted by count`
                : "No records yet"}
            </p>

            <div className="mt-3 divide-y divide-white/[0.06]">
              {rows.map((row) =>
                row.country === OTHER ? (
                  <button
                    key={OTHER}
                    type="button"
                    onClick={clearSelection}
                    aria-label="Clear country selection"
                    className="interactive-row flex items-baseline justify-between gap-3 w-full px-3 py-2.5 text-left border-l-2 border-transparent"
                  >
                    <span className="text-sm font-medium text-ui-secondary truncate">
                      Other countries
                    </span>
                    <span className="numeric text-xs text-ui-muted shrink-0">
                      {row.count} · {percent(row.count)}
                    </span>
                  </button>
                ) : (
                  <button
                    key={row.country}
                    type="button"
                    onClick={() => selectCountry(row.country)}
                    aria-pressed={selectedCountry === row.country}
                    aria-current={selectedCountry === row.country ? "true" : undefined}
                    className={`interactive-row flex items-baseline justify-between gap-3 w-full px-3 py-2.5 text-left border-l-2 transition-colors ${
                      selectedCountry === row.country
                        ? "border-ui-accent bg-ui-accent/10"
                        : "border-transparent"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium truncate ${
                        selectedCountry === row.country
                          ? "text-ui-accent"
                          : "text-ui-secondary"
                      }`}
                    >
                      {countryName(row.country)}
                    </span>
                    <span className="numeric text-xs shrink-0">
                      <span
                        className={
                          selectedCountry === row.country
                            ? "text-ui-accent"
                            : "text-ui-text"
                        }
                      >
                        {row.count}
                      </span>
                      <span className="text-ui-muted"> · {percent(row.count)}</span>
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}