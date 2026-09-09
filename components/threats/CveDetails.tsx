// components/threats/CveDetails.tsx
// Reusable detail panel for a single CVE. Rendered inside an expanded table
// row, but intentionally framework-agnostic so it can be reused anywhere a
// CVE needs a full read-out.

import type { RiskScoredCVE } from "@/lib/risk-scoring";
import type { KEVItem } from "@/lib/abuse-ch";
import { formatPercentile, formatProbability } from "@/lib/format";
import SeverityBadge from "@/components/ui/SeverityBadge";
import CopyButton from "@/components/ui/CopyButton";

interface CveDetailsProps {
  cve: RiskScoredCVE;
  /** Full KEV catalog entry when the CVE is known-exploited. */
  kev?: KEVItem;
  /**
   * Render the CVE ID header (with a copy button) at the top of the panel.
   * Disabled when the caller already displays the ID — e.g. the detail page's
   * own panel header.
   */
  showIdHeader?: boolean;
}

const ATTACK_VECTORS: Record<string, string> = {
  NETWORK: "Network",
  ADJACENT: "Adjacent network",
  LOCAL: "Local",
  PHYSICAL: "Physical",
  UNKNOWN: "Unknown",
};

function formatIsoDate(value: string): string {
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(ts);
}

/**
 * EPSS percentiles are returned as a 0–1 fraction. Guard against any legacy
 * 0–100 values so a "100" can never render as an invalid percent.
 */
function formatPercentileValue(value: string | undefined): string {
  if (!value) return "Unavailable";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "Unavailable";
  return formatPercentile(parsed > 1 ? parsed / 100 : parsed);
}

function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-ui-muted">{label}</dt>
      <dd className="mt-0.5 text-ui-secondary">{children}</dd>
    </div>
  );
}

export default function CveDetails({ cve, kev, showIdHeader = true }: CveDetailsProps) {
  const incomplete =
    cve.cvssScore === null && (cve.epssScore === undefined || cve.epssScore === null);
  const epss = cve.epssScore;
  const references = Array.from(new Set(cve.references));
  const attackVector = cve.attackVector
    ? ATTACK_VECTORS[cve.attackVector] ?? cve.attackVector
    : null;

  return (
    <div className="detail-readout p-4 text-sm sm:p-5">
      {showIdHeader && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-ui-border pb-3">
          <h4 className="font-mono text-sm font-semibold text-ui-text">
            {cve.id}
          </h4>
          <CopyButton value={cve.id} ariaLabel="Copy CVE ID to clipboard" />
        </div>
      )}

      {incomplete && (
        <p
          role="status"
          className="mb-4 rounded-md border border-ui-border bg-ui-raised px-3 py-2 text-xs text-ui-medium"
        >
          <span className="font-semibold text-ui-medium">Incomplete assessment</span>{" "}
          — CVSS and EPSS data are missing for this entry, so it should not be
          treated as low priority.
        </p>
      )}

      <p className="leading-relaxed text-ui-secondary">{cve.description}</p>

      <dl className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
        <Metric label="CVSS base score">
          <span className="font-mono text-ui-secondary">
            {cve.cvssScore !== null ? cve.cvssScore.toFixed(1) : "Unavailable"}
          </span>
        </Metric>
        <Metric label="CVSS severity">
          <SeverityBadge severity={cve.severity} score={cve.cvssScore} />
        </Metric>
        <Metric label="EPSS probability">
          <span className="font-mono text-ui-secondary">
            {epss ? formatProbability(epss.epss) : "Unavailable"}
          </span>
        </Metric>
        <Metric label="EPSS percentile">
          <span className="font-mono text-ui-secondary">
            {epss ? formatPercentileValue(epss.percentile) : "Unavailable"}
          </span>
        </Metric>
        <Metric label="Attack vector">
          {attackVector ?? "Unavailable"}
        </Metric>
        <Metric label="CWE IDs">
          {cve.cweIds.length > 0 ? (
            <span className="font-mono text-ui-secondary">
              {cve.cweIds.join(", ")}
            </span>
          ) : (
            "None"
          )}
        </Metric>
      </dl>

      {kev && (
        <section className="mt-4 border-l-2 border-ui-control-border bg-ui-raised p-4">
          <h4 className="flex items-center gap-2 text-xs font-semibold text-ui-text">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Listed in CISA KEV
          </h4>
          <dl className="mt-2 grid gap-x-8 gap-y-2 text-xs sm:grid-cols-3">
            <Metric label="Required action">{kev.requiredAction}</Metric>
            <Metric label="Date added">
              <span className="font-mono">{formatIsoDate(kev.dateAdded)}</span>
            </Metric>
            <Metric label="Due date">
              <span className="font-mono">{formatIsoDate(kev.dueDate)}</span>
            </Metric>
          </dl>
        </section>
      )}

      <p className="mt-4 text-xs">
        <a
          href={`https://nvd.nist.gov/vuln/detail/${cve.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link"
        >
          Open NVD record
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>

      {references.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-1 text-xs font-semibold text-ui-muted">
            References ({references.length})
          </h4>
          <ul className="space-y-1">
            {references.map((url, i) => (
              <li key={`${url}-${i}`} className="text-xs">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link break-words"
                >
                  {url}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}