// app/(dashboard)/cve/[id]/CveDetailClient.tsx
// Client view for a single CVE. Fetches the combined CVE + KEV + EPSS payload
// from /api/cve/[id] and renders the full detail panel, a KEV-only fallback,
// or a not-found state.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CveDetails from "@/components/threats/CveDetails";
import CopyButton from "@/components/ui/CopyButton";
import ReaderReviewPanel from "@/components/cve/ReaderReviewPanel";
import { calculateRiskScore } from "@/lib/risk-scoring";
import { formatPublishedAt } from "@/lib/format";
import type { CVEItem } from "@/lib/nvd";
import type { KEVItem } from "@/lib/abuse-ch";
import type { EPSSScore } from "@/lib/epss";
import type { CVELookupStatus } from "@/app/api/cve/[id]/route";

interface CveLookupResponse {
  cve: CVEItem | null;
  kev: KEVItem | null;
  cveLookupStatus: CVELookupStatus;
  epss: EPSSScore | null;
  fetchedAt: string;
}

type FetchStatus = "loading" | "ready" | "error";

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

export default function CveDetailClient({ id }: { id: string }) {
  const [data, setData] = useState<CveLookupResponse | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/cve/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`cve ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData(json as CveLookupResponse);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Vulnerability register / Individual record</p>
        <h1 className="page-title">{id}</h1>
        <p className="page-subtitle">NVD assessment, CISA KEV membership, and FIRST EPSS probability</p>
      </header>
      <div className="page-body detail-readout">
      <Link
        href="/threats"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ui-accent transition-colors hover:text-ui-accent"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Vulnerabilities
      </Link>

      {status === "loading" && (
        <section className="panel rounded-lg overflow-hidden">
          <div className="panel-header flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">Record details</h2>
            <CopyButton value={id} ariaLabel="Copy CVE ID to clipboard" />
          </div>
          <p className="state-panel" role="status"><strong>Loading record details</strong>Retrieving available assessments and references for this CVE.</p>
        </section>
      )}

      {status === "error" && (
        <section className="panel rounded-lg overflow-hidden">
          <div className="panel-header flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">Record details</h2>
            <CopyButton value={id} ariaLabel="Copy CVE ID to clipboard" />
          </div>
          <p role="status" className="p-4 text-sm text-ui-secondary">
            Failed to load details for this CVE. Please try again.
          </p>
        </section>
      )}

      {status === "ready" && data && (
        <section className="panel rounded-lg overflow-hidden">
          <div className="panel-header flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">Record details</h2>
            <CopyButton
              value={data.cve?.id ?? data.kev?.cveID ?? id}
              ariaLabel="Copy CVE ID to clipboard"
            />
          </div>

          {data.cve !== null ? (
            <CveDetails
              cve={calculateRiskScore(
                data.cve,
                data.epss ?? undefined,
                data.kev ?? undefined
              )}
              kev={data.kev ?? undefined}
              showIdHeader={false}
            />
          ) : data.kev !== null ? (
            <div className="p-4 text-sm sm:p-5">
              <p
                role="status"
                className="mb-4 rounded-md border border-ui-border bg-ui-raised px-3 py-2 text-xs text-ui-medium"
              >
                <span className="font-semibold text-ui-medium">
                  Limited information
                </span>{" "}
                — this CVE is in CISA&apos;s Known Exploited Vulnerabilities
                catalog but not in the currently loaded NVD dataset. Details
                below are from CISA KEV.
              </p>

              <dl className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-ui-muted">Vendor / project</dt>
                  <dd className="mt-0.5 text-ui-secondary">
                    {data.kev.vendorProject}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ui-muted">Product</dt>
                  <dd className="mt-0.5 text-ui-secondary">{data.kev.product}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ui-muted">Vulnerability</dt>
                  <dd className="mt-0.5 text-ui-secondary">
                    {data.kev.vulnerabilityName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ui-muted">Date added</dt>
                  <dd className="mt-0.5 font-mono text-ui-secondary">
                    {formatIsoDate(data.kev.dateAdded)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ui-muted">Required action</dt>
                  <dd className="mt-0.5 text-ui-secondary">
                    {data.kev.requiredAction}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ui-muted">Due date</dt>
                  <dd className="mt-0.5 font-mono text-ui-secondary">
                    {formatIsoDate(data.kev.dueDate)}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs leading-relaxed text-ui-secondary">
                {data.kev.shortDescription}
              </p>

              <p className="mt-4 text-xs">
                <a
                  href={`https://nvd.nist.gov/vuln/detail/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-md border border-ui-control-border bg-ui-accent-soft px-3 py-1.5 font-semibold text-ui-accent transition-colors hover:bg-ui-accent-soft"
                >
                  Open NVD record
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>

              <p className="mt-3 text-[11px] text-ui-muted font-mono">
                Lookup status: {data.cveLookupStatus}
              </p>
            </div>
          ) : (
            <div className="p-4 text-sm sm:p-5">
              <p role="status" className="text-ui-secondary">
                CVE not found in CISA KEV or NVD.
              </p>
              <p className="mt-3 text-[11px] text-ui-muted font-mono">
                Lookup status: {data.cveLookupStatus}
              </p>
            </div>
          )}

          <p className="border-t border-ui-border px-4 py-3 text-[11px] text-ui-muted sm:px-5">
            Fetched {formatPublishedAt(data.fetchedAt)} · Refresh page for new
            data.
          </p>
        </section>
      )}

      {status === "ready" && data && (data.cve !== null || data.kev !== null) && (
        <ReaderReviewPanel
          cveId={data.cve?.id ?? data.kev?.cveID ?? id}
          // The record revision a decision is recorded against: NVD's own
          // modification time, or the KEV catalog date for KEV-only records.
          revisionId={data.cve?.lastModified ?? data.kev?.dateAdded ?? null}
        />
      )}
      </div>
    </>
  );
}