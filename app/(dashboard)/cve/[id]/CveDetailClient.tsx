// app/(dashboard)/cve/[id]/CveDetailClient.tsx
// Client view for a single CVE. Fetches the combined CVE + KEV + EPSS payload
// from /api/cve/[id] and renders the full detail panel, a KEV-only fallback,
// or a not-found state.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CveDetails from "@/components/threats/CveDetails";
import CopyButton from "@/components/ui/CopyButton";
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
    <div className="space-y-6">
      <Link
        href="/threats"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ui-accent transition-colors hover:text-emerald-300"
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
            <h1 className="section-title font-mono text-sm">{id}</h1>
            <CopyButton value={id} ariaLabel="Copy CVE ID to clipboard" />
          </div>
          <div className="p-4 sm:p-5 space-y-4" aria-label="Loading CVE details">
            <div className="h-4 w-full rounded bg-white/[0.08] animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-white/[0.08] animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-12 rounded bg-white/[0.08] animate-pulse" />
              <div className="h-12 rounded bg-white/[0.08] animate-pulse" />
              <div className="h-12 rounded bg-white/[0.08] animate-pulse" />
              <div className="h-12 rounded bg-white/[0.08] animate-pulse" />
            </div>
          </div>
        </section>
      )}

      {status === "error" && (
        <section className="panel rounded-lg overflow-hidden">
          <div className="panel-header flex flex-wrap items-center justify-between gap-3">
            <h1 className="section-title font-mono text-sm">{id}</h1>
            <CopyButton value={id} ariaLabel="Copy CVE ID to clipboard" />
          </div>
          <p role="status" className="p-4 text-sm text-gray-400">
            Failed to load details for this CVE. Please try again.
          </p>
        </section>
      )}

      {status === "ready" && data && (
        <section className="panel rounded-lg overflow-hidden">
          <div className="panel-header flex flex-wrap items-center justify-between gap-3">
            <h1 className="section-title font-mono text-sm">{id}</h1>
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
                className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
              >
                <span className="font-semibold text-amber-100">
                  Limited information
                </span>{" "}
                — this CVE is in CISA&apos;s Known Exploited Vulnerabilities
                catalog but not in the currently loaded NVD dataset. Details
                below are from CISA KEV.
              </p>

              <dl className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-gray-500">Vendor / project</dt>
                  <dd className="mt-0.5 text-gray-200">
                    {data.kev.vendorProject}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Product</dt>
                  <dd className="mt-0.5 text-gray-200">{data.kev.product}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Vulnerability</dt>
                  <dd className="mt-0.5 text-gray-200">
                    {data.kev.vulnerabilityName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Date added</dt>
                  <dd className="mt-0.5 font-mono text-gray-200">
                    {formatIsoDate(data.kev.dateAdded)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Required action</dt>
                  <dd className="mt-0.5 text-gray-200">
                    {data.kev.requiredAction}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Due date</dt>
                  <dd className="mt-0.5 font-mono text-gray-200">
                    {formatIsoDate(data.kev.dueDate)}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs leading-relaxed text-gray-400">
                {data.kev.shortDescription}
              </p>

              <p className="mt-4 text-xs">
                <a
                  href={`https://nvd.nist.gov/vuln/detail/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                >
                  Open NVD record
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>

              <p className="mt-3 text-[11px] text-gray-600 font-mono">
                Lookup status: {data.cveLookupStatus}
              </p>
            </div>
          ) : (
            <div className="p-4 text-sm sm:p-5">
              <p role="status" className="text-gray-400">
                CVE not found in CISA KEV or NVD.
              </p>
              <p className="mt-3 text-[11px] text-gray-600 font-mono">
                Lookup status: {data.cveLookupStatus}
              </p>
            </div>
          )}

          <p className="border-t border-white/[0.06] px-4 py-3 text-[11px] text-gray-500 sm:px-5">
            Fetched {formatPublishedAt(data.fetchedAt)} · Refresh page for new
            data.
          </p>
        </section>
      )}
    </div>
  );
}