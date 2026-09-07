// components/threats/CveTable.tsx
// Semantic, keyboard-accessible CVE browser table. Sortable column headers,
// expandable rows, and a horizontally scrollable wrapper with a sticky CVE
// column on small screens.

import { Fragment, useMemo } from "react";
import type { RiskScoredCVE } from "@/lib/risk-scoring";
import type { KEVItem } from "@/lib/abuse-ch";
import { formatProbability, formatPublishedAt } from "@/lib/format";
import SeverityBadge from "@/components/ui/SeverityBadge";
import CveDetails from "@/components/threats/CveDetails";

export type SortColumn = "id" | "cvss" | "epss" | "published" | "kev";
export type SortState = { column: SortColumn; direction: "asc" | "desc" };
type AriaSortValue = "none" | "ascending" | "descending";
type ExploitState = "listed" | "not-listed" | "unknown";

interface CveTableProps {
  cves: RiskScoredCVE[];
  /** CVE IDs currently listed in the CISA KEV catalog. */
  knownExploitedIds: Set<string>;
  onSortChange: (column: SortColumn) => void;
  sort: SortState;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  /**
   * Full KEV catalog entries keyed by CVE ID — used to render the expanded
   * details panel for known-exploited entries.
   */
  kevById?: ReadonlyMap<string, KEVItem>;
  /**
   * Whether the KEV membership is actually known. When the catalog could not
   * be loaded, the "Known exploited" column shows "Unknown" instead of
   * claiming entries are not listed.
   */
  kevKnown?: boolean;
}

const COLUMN_COUNT = 6;

function parseDate(value: string | null): number | null {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

/** Null values always sort last, in both directions. */
function numericCompare(a: number | null, b: number | null, asc: boolean): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return asc ? a - b : b - a;
}

function textCompare(a: string, b: string, asc: boolean): number {
  const x = a.localeCompare(b);
  return asc ? x : -x;
}

function SortGlyph({
  active,
  direction,
}: {
  active: boolean;
  direction: "asc" | "desc";
}) {
  return (
    <span
      aria-hidden="true"
      className={`ml-1 inline-block text-[10px] leading-none ${
        active ? "text-emerald-400" : "text-gray-600"
      }`}
    >
      {active ? (direction === "asc" ? "▲" : "▼") : "↕"}
    </span>
  );
}

function ExploitedBadge({ state }: { state: ExploitState }) {
  const classes: Record<ExploitState, string> = {
    listed: "bg-red-500/15 text-red-400 border-red-500/40",
    "not-listed": "bg-white/[0.03] text-gray-500 border-white/[0.08]",
    unknown: "bg-white/[0.03] text-gray-400 border-white/[0.08]",
  };
  const labels: Record<ExploitState, string> = {
    listed: "Listed",
    "not-listed": "Not listed",
    unknown: "Unknown",
  };
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-[11px] ${classes[state]}`}
    >
      {labels[state]}
    </span>
  );
}

export default function CveTable({
  cves,
  knownExploitedIds,
  onSortChange,
  sort,
  expandedId,
  onToggleExpand,
  kevById,
  kevKnown = true,
}: CveTableProps) {
  const sorted = useMemo(() => {
    const list = [...cves];
    const asc = sort.direction === "asc";
    const exploitedRank = (c: RiskScoredCVE) =>
      knownExploitedIds.has(c.id) ? 1 : 0;

    list.sort((a, b) => {
      switch (sort.column) {
        case "id":
          return textCompare(a.id, b.id, asc);
        case "cvss":
          return numericCompare(a.cvssScore, b.cvssScore, asc);
        case "epss": {
          const ea = a.epssScore ? Number(a.epssScore.epss) : null;
          const eb = b.epssScore ? Number(b.epssScore.epss) : null;
          return numericCompare(
            Number.isFinite(ea) ? ea : null,
            Number.isFinite(eb) ? eb : null,
            asc
          );
        }
        case "published":
          return numericCompare(
            parseDate(a.publishedAt),
            parseDate(b.publishedAt),
            asc
          );
        case "kev": {
          const rank = (exploitedRank(a) - exploitedRank(b)) * (asc ? 1 : -1);
          if (rank !== 0) return rank;
          // Default priority order: known exploited first, then descending
          // CVSS, then newest published.
          return (
            numericCompare(a.cvssScore, b.cvssScore, false) ||
            numericCompare(parseDate(a.publishedAt), parseDate(b.publishedAt), false)
          );
        }
      }
    });
    return list;
  }, [cves, sort, knownExploitedIds]);

  const ariaSortFor = (column: SortColumn): AriaSortValue => {
    if (sort.column !== column) return "none";
    return sort.direction === "asc" ? "ascending" : "descending";
  };

  const headerButtonClasses =
    "flex items-center text-[11px] font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-200";

  return (
    <table className="min-w-[820px] w-full border-collapse text-left">
      <caption className="sr-only">
        Vulnerability list. Each row shows a CVE with its summary, CVSS
        severity, EPSS probability, known-exploited status, and publication
        date. Column headers are sortable; select a CVE to expand its details.
      </caption>
      <thead>
        <tr className="border-b border-white/[0.08]">
          <th
            scope="col"
            aria-sort={ariaSortFor("id")}
            className="sticky left-0 z-10 border-r border-white/[0.06] px-4 py-3"
            style={{ background: "var(--cd-surface)" }}
          >
            <button
              type="button"
              className={headerButtonClasses}
              onClick={() => onSortChange("id")}
            >
              CVE
              <SortGlyph
                active={sort.column === "id"}
                direction={sort.direction}
              />
            </button>
          </th>
          <th scope="col" className="px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Summary
            </span>
          </th>
          <th
            scope="col"
            aria-sort={ariaSortFor("cvss")}
            className="px-4 py-3"
          >
            <button
              type="button"
              className={headerButtonClasses}
              onClick={() => onSortChange("cvss")}
            >
              Severity
              <SortGlyph
                active={sort.column === "cvss"}
                direction={sort.direction}
              />
            </button>
          </th>
          <th
            scope="col"
            aria-sort={ariaSortFor("epss")}
            className="px-4 py-3"
          >
            <button
              type="button"
              className={headerButtonClasses}
              onClick={() => onSortChange("epss")}
            >
              EPSS
              <SortGlyph
                active={sort.column === "epss"}
                direction={sort.direction}
              />
            </button>
          </th>
          <th
            scope="col"
            aria-sort={ariaSortFor("kev")}
            className="px-4 py-3"
          >
            <button
              type="button"
              className={headerButtonClasses}
              onClick={() => onSortChange("kev")}
            >
              Known exploited
              <SortGlyph
                active={sort.column === "kev"}
                direction={sort.direction}
              />
            </button>
          </th>
          <th
            scope="col"
            aria-sort={ariaSortFor("published")}
            className="px-4 py-3"
          >
            <button
              type="button"
              className={headerButtonClasses}
              onClick={() => onSortChange("published")}
            >
              Published
              <SortGlyph
                active={sort.column === "published"}
                direction={sort.direction}
              />
            </button>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/[0.06]">
        {sorted.map((cve) => {
          const expanded = expandedId === cve.id;
          const exploitState: ExploitState = !kevKnown
            ? "unknown"
            : knownExploitedIds.has(cve.id)
              ? "listed"
              : "not-listed";

          return (
            <Fragment key={cve.id}>
              <tr className="align-top">
                <td
                  className="sticky left-0 z-10 border-r border-white/[0.06] px-4 py-3"
                  style={{ background: "var(--cd-surface)" }}
                >
                  <button
                    type="button"
                    onClick={() => onToggleExpand(cve.id)}
                    aria-expanded={expanded}
                    aria-controls={`cve-details-${cve.id}`}
                    className="flex items-center gap-1.5 text-left font-mono text-xs text-emerald-400 transition-colors hover:text-emerald-300"
                  >
                    <svg
                      className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                        expanded ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    {cve.id}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <p className="line-clamp-2 text-xs leading-relaxed text-gray-400">
                    {cve.description}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <SeverityBadge severity={cve.severity} score={cve.cvssScore} />
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-gray-300">
                    {cve.epssScore
                      ? formatProbability(cve.epssScore.epss)
                      : "Unavailable"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ExploitedBadge state={exploitState} />
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-gray-400">
                    {formatPublishedAt(cve.publishedAt)}
                  </span>
                </td>
              </tr>
              {expanded && (
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <td
                    id={`cve-details-${cve.id}`}
                    colSpan={COLUMN_COUNT}
                    className="p-0"
                  >
                    <CveDetails cve={cve} kev={kevById?.get(cve.id)} />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}