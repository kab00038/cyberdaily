// components/threats/CveDetails.tsx
// Reusable detail panel for a single CVE. Rendered inside an expanded table
// row, but intentionally framework-agnostic so it can be reused anywhere a
// CVE needs a full read-out.

import type { RiskScoredCVE } from "@/lib/risk-scoring";
import type { KEVItem } from "@/lib/abuse-ch";
import { formatPercentile, formatProbability } from "@/lib/format";
import SeverityBadge from "@/components/ui/SeverityBadge";

interface CveDetailsProps {
  cve: RiskScoredCVE;
  /** Full KEV catalog entry when the CVE is known-exploited. */
  kev?: KEVItem;
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
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-gray-200">{children}</dd>
    </div>
  );
}

export default function CveDetails({ cve, kev }: CveDetailsProps) {
  const incomplete =
    cve.cvssScore === null && (cve.epssScore === undefined || cve.epssScore === null);
  const epss = cve.epssScore;
  const references = Array.from(new Set(cve.references));
  const attackVector = cve.attackVector
    ? ATTACK_VECTORS[cve.attackVector] ?? cve.attackVector
    : null;

  return (
    <div className="p-4 text-sm sm:p-5">
      {incomplete && (
        <p
          role="status"
          className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
        >
          <span className="font-semibold text-amber-100">Incomplete assessment</span>{" "}
          — CVSS and EPSS data are missing for this entry, so it should not be
          treated as low priority.
        </p>
      )}

      <p className="leading-relaxed text-gray-300">{cve.description}</p>

      <dl className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
        <Metric label="CVSS base score">
          <span className="font-mono text-gray-200">
            {cve.cvssScore !== null ? cve.cvssScore.toFixed(1) : "Unavailable"}
          </span>
        </Metric>
        <Metric label="CVSS severity">
          <SeverityBadge severity={cve.severity} score={cve.cvssScore} />
        </Metric>
        <Metric label="EPSS probability">
          <span className="font-mono text-gray-200">
            {epss ? formatProbability(epss.epss) : "Unavailable"}
          </span>
        </Metric>
        <Metric label="EPSS percentile">
          <span className="font-mono text-gray-200">
            {epss ? formatPercentileValue(epss.percentile) : "Unavailable"}
          </span>
        </Metric>
        <Metric label="Attack vector">
          {attackVector ?? "Unavailable"}
        </Metric>
        <Metric label="CWE IDs">
          {cve.cweIds.length > 0 ? (
            <span className="font-mono text-gray-200">
              {cve.cweIds.join(", ")}
            </span>
          ) : (
            "None"
          )}
        </Metric>
      </dl>

      {kev && (
        <section className="mt-4 rounded-lg border border-red-500/30 bg-red-500/[0.06] p-3">
          <h4 className="flex items-center gap-2 text-xs font-semibold text-red-300">
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
          <h4 className="mb-1 text-xs font-semibold text-gray-500">
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