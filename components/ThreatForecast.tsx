// components/ThreatForecast.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { RiskScoredCVE } from "@/lib/risk-scoring";
import type { KEVItem } from "@/lib/abuse-ch";
import CveTable, {
  type SortColumn,
  type SortState,
} from "@/components/threats/CveTable";

type Completeness = "complete" | "partial" | "unknown";
type SeverityFilter = "all" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
type ExploitFilter = "all" | "exploited" | "not-listed" | "unknown";

const SEVERITY_OPTIONS: Array<{ value: SeverityFilter; label: string }> = [
  { value: "all", label: "All severities" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "UNKNOWN", label: "Unknown" },
];

const EXPLOIT_OPTIONS: Array<{ value: ExploitFilter; label: string }> = [
  { value: "all", label: "All vulnerabilities" },
  { value: "exploited", label: "Known exploited" },
  { value: "not-listed", label: "Not listed" },
  { value: "unknown", label: "Unknown" },
];

// Default priority order: known exploited first, then descending CVSS, then
// newest published date. The table's KEV comparator applies that tie-breaking.
const PRIORITY_SORT: SortState = { column: "kev", direction: "desc" };
const NEWEST_SORT: SortState = { column: "published", direction: "desc" };

function normalizeSeverity(severity: string | null): string {
  const key = severity?.trim().toUpperCase() ?? "";
  return ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(key) ? key : "UNKNOWN";
}

export default function ThreatForecast() {
  const [cves, setCves] = useState<RiskScoredCVE[]>([]);
  const [kevCatalog, setKevCatalog] = useState<KEVItem[]>([]);
  const [completeness, setCompleteness] = useState<Completeness>("complete");
  const [nvdError, setNvdError] = useState<string | null>(null);
  const [kevKnown, setKevKnown] = useState(true);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [highCriticalOnly, setHighCriticalOnly] = useState(false);
  const [exploitFilter, setExploitFilter] = useState<ExploitFilter>("all");
  const [sort, setSort] = useState<SortState>(PRIORITY_SORT);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchThreats() {
      try {
        const res = await fetch("/api/threats");
        const data = await res.json();
        setCves(data.cves || []);
        setKevCatalog(data.kev || []);
        setCompleteness(data.completeness || "complete");
        setNvdError(data.nvdError || null);
        // A zero-sized catalog means the CISA feed failed to load, so KEV
        // membership is genuinely unknown rather than "not listed".
        setKevKnown((data.kevCatalogSize ?? 0) > 0);
      } catch (error) {
        console.error("Failed to fetch threats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchThreats();
    const interval = setInterval(fetchThreats, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, []);

  const knownExploitedIds = useMemo(
    () => new Set(cves.filter((cve) => cve.inKEV).map((cve) => cve.id)),
    [cves]
  );

  const kevById = useMemo(
    () => new Map(kevCatalog.map((item) => [item.cveID, item])),
    [kevCatalog]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cves.filter((cve) => {
      if (
        needle &&
        !cve.id.toLowerCase().includes(needle) &&
        !cve.description.toLowerCase().includes(needle)
      ) {
        return false;
      }
      const sev = normalizeSeverity(cve.severity);
      if (highCriticalOnly) {
        if (sev !== "HIGH" && sev !== "CRITICAL") return false;
      } else if (severityFilter !== "all" && sev !== severityFilter) {
        return false;
      }
      if (exploitFilter === "exploited" && !knownExploitedIds.has(cve.id)) {
        return false;
      }
      if (
        exploitFilter === "not-listed" &&
        (!kevKnown || knownExploitedIds.has(cve.id))
      ) {
        return false;
      }
      if (exploitFilter === "unknown" && kevKnown) {
        return false;
      }
      return true;
    });
  }, [
    cves,
    query,
    severityFilter,
    highCriticalOnly,
    exploitFilter,
    knownExploitedIds,
    kevKnown,
  ]);

  const handleSortChange = (column: SortColumn) => {
    setSort((current) => {
      if (current.column === column) {
        return {
          column,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { column, direction: column === "id" ? "asc" : "desc" };
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const isPrioritySort = sort.column === "kev" && sort.direction === "desc";
  const isNewestSort = sort.column === "published" && sort.direction === "desc";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="panel rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-white/[0.08] rounded w-1/2 mb-3" />
          <div className="h-3 bg-white/[0.08] rounded w-full mb-2" />
          <div className="h-3 bg-white/[0.08] rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(completeness === "partial" ||
        completeness === "unknown" ||
        nvdError !== null) && (
        <div
          role="status"
          className="panel rounded-lg p-3 text-xs text-gray-400 border border-white/[0.06]"
        >
          {completeness === "partial"
            ? "Showing a partial NVD result set — counts and CVEs are incomplete."
            : "NVD data could not be loaded. Some information may be unavailable."}
        </div>
      )}

      <p className="metadata" aria-live="polite">
        Showing {cves.length} loaded CVEs ·{" "}
        <span className="font-mono">{completeness}</span>
      </p>

      <div className="panel rounded-lg overflow-hidden">
        {/* Search / filter toolbar */}
        <div className="border-b border-white/[0.06] p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label
                htmlFor="cve-search"
                className="mb-1 block text-xs text-gray-400"
              >
                Search
              </label>
              <input
                id="cve-search"
                type="search"
                className="control w-full"
                placeholder="CVE ID or description…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label
                  htmlFor="severity-filter"
                  className="block text-xs text-gray-400"
                >
                  Severity
                </label>
                <button
                  type="button"
                  aria-pressed={highCriticalOnly}
                  onClick={() => setHighCriticalOnly((current) => !current)}
                  className={`control !min-h-0 rounded-md px-2.5 py-1 text-xs transition-colors ${
                    highCriticalOnly
                      ? "border-emerald-500 text-emerald-300"
                      : "text-gray-300 hover:border-emerald-500/60"
                  }`}
                >
                  High &amp; Critical
                </button>
              </div>
              <select
                id="severity-filter"
                className="control w-full"
                value={severityFilter}
                onChange={(e) =>
                  setSeverityFilter(e.target.value as SeverityFilter)
                }
              >
                {SEVERITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="exploit-filter"
                className="mb-1 block text-xs text-gray-400"
              >
                Exploitation
              </label>
              <select
                id="exploit-filter"
                className="control w-full"
                value={exploitFilter}
                onChange={(e) =>
                  setExploitFilter(e.target.value as ExploitFilter)
                }
              >
                {EXPLOIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Sort:</span>
              <button
                type="button"
                aria-pressed={isPrioritySort}
                onClick={() => setSort(PRIORITY_SORT)}
                className={`control !min-h-0 rounded-md px-3 py-1.5 text-xs transition-colors ${
                  isPrioritySort
                    ? "border-emerald-500 text-emerald-300"
                    : "text-gray-300 hover:border-emerald-500/60"
                }`}
              >
                Priority
              </button>
              <button
                type="button"
                aria-pressed={isNewestSort}
                onClick={() => setSort(NEWEST_SORT)}
                className={`control !min-h-0 rounded-md px-3 py-1.5 text-xs transition-colors ${
                  isNewestSort
                    ? "border-emerald-500 text-emerald-300"
                    : "text-gray-300 hover:border-emerald-500/60"
                }`}
              >
                Newest first
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Showing {filtered.length} of {cves.length} CVEs
            </p>
          </div>
        </div>

        {/* Scrollable table with sticky CVE column */}
        <div className="overflow-x-auto">
          <CveTable
            cves={filtered}
            knownExploitedIds={knownExploitedIds}
            kevById={kevById}
            kevKnown={kevKnown}
            sort={sort}
            onSortChange={handleSortChange}
            expandedId={expandedId}
            onToggleExpand={toggleExpand}
          />
        </div>
      </div>
    </div>
  );
}