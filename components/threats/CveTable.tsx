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
        active ? "text-ui-accent" : "text-ui-muted"
      }`}
    >
      {active ? (direction === "asc" ? "▲" : "▼") : "↕"}
    </span>
  );
}

function ExploitedBadge({ state }: { state: ExploitState }) {
  const classes: Record<ExploitState, string> = {
    listed: "bg-ui-raised text-ui-text border-ui-control-border font-semibold",
    "not-listed": "bg-white/[0.03] text-ui-muted border-ui-border",
    unknown: "bg-white/[0.03] text-ui-secondary border-ui-border",
  };
  const labels: Record<ExploitState, string> = {
    listed: "KEV listed",
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
    "flex items-center text-[11px] font-semibold text-ui-secondary transition-colors hover:text-ui-secondary";

  const exploitStateFor = (cve: RiskScoredCVE): ExploitState =>
    !kevKnown
      ? "unknown"
      : knownExploitedIds.has(cve.id)
        ? "listed"
        : "not-listed";

  // A row is a "KEV-only" record when it is listed in the CISA KEV catalog but
  // the loaded NVD record is an empty stub (no CVSS metrics and no real
  // description) — the NVD side of the row is effectively unavailable, so we
  // say so explicitly instead of leaving the row looking like a data bug.
  const isKevOnlyStub = (cve: RiskScoredCVE): boolean =>
    kevKnown &&
    knownExploitedIds.has(cve.id) &&
    cve.cvssScore === null &&
    (cve.description === "" || cve.description === "No description");

  const kevOnlyIndicator = (cve: RiskScoredCVE) => (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
      <span className="rounded border border-ui-border bg-ui-raised px-1.5 py-0.5 text-ui-medium">
        KEV only — NVD record unavailable
      </span>
      <a
        href={`https://nvd.nist.gov/vuln/detail/${cve.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-link"
      >
        Open NVD
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );

  if (sorted.length === 0) {
    return (
      <p className="state-panel" role="status">
        <strong>No CVEs in this view</strong>
        Adjust the filters, or check Sources for current dataset availability.
      </p>
    );
  }

  return (
    <div className="vulnerability-browser">
      <div className="vulnerability-table-view">
        <table className="vulnerability-table text-left">
          <caption className="sr-only">
            Loaded CVEs from NVD with severity, EPSS probability, and CISA KEV
            membership. Column headers are sortable; select a CVE to expand
            its details.
          </caption>
          <colgroup>
            <col style={{ width: "11rem" }} />
            <col />
            <col style={{ width: "8.5rem" }} />
            <col style={{ width: "5rem" }} />
            <col style={{ width: "8rem" }} />
            <col style={{ width: "7rem" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-ui-border">
              <th
                scope="col"
                aria-sort={ariaSortFor("id")}
                className="cve-id sticky left-0 z-10 border-r border-ui-border"
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
              <th scope="col">
                <span className="text-[11px] font-semibold text-ui-secondary">
                  Summary
                </span>
              </th>
              <th
                scope="col"
                aria-sort={ariaSortFor("cvss")}
                className="numeric"
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
                className="numeric"
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
                className="numeric"
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
          <tbody className="divide-y divide-ui-border">
            {sorted.map((cve) => {
              const expanded = expandedId === cve.id;
              const exploitState = exploitStateFor(cve);

              return (
                <Fragment key={cve.id}>
                  <tr className="align-top">
                    <td
                      className="cve-id sticky left-0 z-10 border-r border-ui-border"
                      style={{ background: "var(--cd-surface)" }}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleExpand(cve.id)}
                        aria-expanded={expanded}
                        aria-controls={`cve-details-${cve.id}`}
                        className="flex items-center gap-1.5 text-left font-mono text-xs text-ui-accent transition-colors hover:text-ui-accent"
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
                    <td className="summary">
                      <p className="line-clamp-2 text-xs leading-relaxed text-ui-secondary">
                        {cve.description}
                      </p>
                      {isKevOnlyStub(cve) && kevOnlyIndicator(cve)}
                    </td>
                    <td className="numeric">
                      <SeverityBadge
                        severity={cve.severity}
                        score={cve.cvssScore}
                      />
                    </td>
                    <td className="numeric">
                      <span className="font-mono text-xs text-ui-secondary">
                        {cve.epssScore
                          ? formatProbability(cve.epssScore.epss)
                          : "Unavailable"}
                      </span>
                    </td>
                    <td>
                      <ExploitedBadge state={exploitState} />
                    </td>
                    <td className="numeric">
                      <span className="font-mono text-xs text-ui-secondary">
                        {formatPublishedAt(cve.publishedAt)}
                      </span>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-ui-border bg-white/[0.02]">
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
      </div>

      <div className="vulnerability-card-view">
        {sorted.map((cve) => {
          const expanded = expandedId === cve.id;
          const exploitState = exploitStateFor(cve);

          return (
            <article
              className="vulnerability-card"
              key={cve.id}
              aria-label={`CVE ${cve.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onToggleExpand(cve.id)}
                  aria-expanded={expanded}
                  aria-controls={`cve-details-card-${cve.id}`}
                  className="flex items-center gap-1.5 text-left font-mono text-sm text-ui-accent transition-colors hover:text-ui-accent"
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
                <SeverityBadge severity={cve.severity} score={cve.cvssScore} />
              </div>

              <p className="mt-2 text-xs leading-relaxed text-ui-secondary">
                {cve.description}
              </p>

              {isKevOnlyStub(cve) && kevOnlyIndicator(cve)}

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-ui-muted">EPSS</dt>
                  <dd className="font-mono text-ui-secondary">
                    {cve.epssScore
                      ? formatProbability(cve.epssScore.epss)
                      : "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ui-muted">Exploitation</dt>
                  <dd>
                    <ExploitedBadge state={exploitState} />
                  </dd>
                </div>
                <div>
                  <dt className="text-ui-muted">Published</dt>
                  <dd className="font-mono text-ui-secondary">
                    {formatPublishedAt(cve.publishedAt)}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => onToggleExpand(cve.id)}
                aria-expanded={expanded}
                aria-controls={`cve-details-card-${cve.id}`}
                className="mt-3 text-xs font-semibold text-ui-accent transition-colors hover:text-ui-accent"
              >
                {expanded ? "Hide details" : "Details"}
              </button>

              {expanded && (
                <div
                  id={`cve-details-card-${cve.id}`}
                  className="mt-3 border-t border-ui-border pt-3"
                >
                  <CveDetails cve={cve} kev={kevById?.get(cve.id)} />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}