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
    // A fresh controller per fetch cycle so the cleanup abort never kills an
    // in-flight request that a later interval tick started.
    let controller: AbortController | null = null;

    async function fetchThreats() {
      controller = new AbortController();
      try {
        const res = await fetch("/api/threats", { signal: controller.signal });
        const data = await res.json();
        if (controller.signal.aborted) return;
        setCves(data.cves || []);
        setKevCatalog(data.kev || []);
        setCompleteness(data.completeness || "complete");
        setNvdError(data.nvdError || null);
        // A zero-sized catalog means the CISA feed failed to load, so KEV
        // membership is genuinely unknown rather than "not listed".
        setKevKnown((data.kevCatalogSize ?? 0) > 0);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Failed to fetch threats:", error);
        // Preserve previously loaded CVEs on a refresh failure.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchThreats();
    const interval = setInterval(fetchThreats, 3600000); // 1 hour
    return () => {
      controller?.abort();
      clearInterval(interval);
    };
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
      <p className="state-panel" role="status"><strong>Loading the vulnerability register</strong>Retrieving the NVD snapshot, CISA KEV membership, and FIRST EPSS scores.</p>
    );
  }

  return (
    <div className="space-y-4">
      {(completeness === "partial" ||
        completeness === "unknown" ||
        nvdError !== null) && (
        <div
          role="status"
          className="state-note"
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
        <div className="border-b border-ui-border p-4">
          <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label
                htmlFor="cve-search"
                className="control-label"
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
                  className="control-label !mb-0"
                >
                  Severity
                </label>
                <button
                  type="button"
                  aria-pressed={highCriticalOnly}
                  onClick={() => setHighCriticalOnly((current) => !current)}
                  className={`control !min-h-0 rounded-md px-2.5 py-1 text-xs transition-colors ${
                    highCriticalOnly
                      ? "border-ui-control-border text-ui-accent"
                      : "text-ui-secondary hover:border-ui-control-border"
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
                className="control-label"
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
              <span className="text-xs text-ui-muted">Sort:</span>
              <button
                type="button"
                aria-pressed={isPrioritySort}
                onClick={() => setSort(PRIORITY_SORT)}
                className={`control !min-h-0 rounded-md px-3 py-1.5 text-xs transition-colors ${
                  isPrioritySort
                    ? "border-ui-control-border text-ui-accent"
                    : "text-ui-secondary hover:border-ui-control-border"
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
                    ? "border-ui-control-border text-ui-accent"
                    : "text-ui-secondary hover:border-ui-control-border"
                }`}
              >
                Newest first
              </button>
            </div>
            <p className="text-xs text-ui-muted">
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