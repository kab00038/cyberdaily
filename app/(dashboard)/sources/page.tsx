// app/(dashboard)/sources/page.tsx — About & sources (Section 4.5).
// Server component that renders data provenance, cadence, scope, and live
// source health for every upstream CyberDaily consumes. Status comes from
// the same `collectSourceStatuses()` probe the `/api/sources` route serves,
// so the page and the header indicator always agree.
import type { Metadata } from "next";
import { SOURCE_CATALOG, collectSourceStatuses } from "@/lib/sources";
import type { SourceStatus } from "@/lib/sources";
import { formatPublishedAt } from "@/lib/format";

export const metadata: Metadata = { title: "Sources — CyberDaily" };

// Always render with fresh health — the probes themselves ride the fetch
// data cache, so upstream load stays bounded by the per-source cadences.
export const dynamic = "force-dynamic";
export const runtime = "edge";

const SECTIONS: {
  category: SourceStatus["category"];
  title: string;
  blurb: string;
}[] = [
  {
    category: "news",
    title: "News",
    blurb:
      "Security journalism via RSS, plus optional AI enrichment. Refreshed every 15 minutes.",
  },
  {
    category: "vulnerabilities",
    title: "Vulnerabilities",
    blurb:
      "CVE, KEV, and EPSS data used for risk scoring. Refreshed hourly.",
  },
  {
    category: "community",
    title: "Community",
    blurb:
      "Hacker News and Reddit security discussions. Refreshed every 15 minutes.",
  },
  {
    category: "threatmap",
    title: "Map",
    blurb:
      "blocklist.de attack sources with IP geolocation. Sampled every 5 minutes.",
  },
];

// Emphasis is inverted from a plain traffic light: Error — the only state a
// reader urgently needs to find — carries the filled, high-contrast
// treatment. OK is quiet (muted text, no fill): healthy is the expected
// case and shouldn't compete for attention. Partial sits between the two —
// a real third state (e.g. a missing API key), visible but not alarming.
// `--cd-critical` (#ff8e94) is designed as a *foreground* on this site's dark
// surfaces, so using it as a fill here means the text on top must be dark —
// `text-ui-canvas` measures 8.67:1 against it, well past the 4.5:1 AA floor.
// Fill/border presence (not just hue) also carries the distinction, so the
// three states stay legible in grayscale and don't rely on color alone.
const STATUS_STYLES: Record<SourceStatus["status"], string> = {
  error: "border-ui-critical bg-ui-critical text-ui-canvas font-semibold",
  partial: "border-ui-medium bg-ui-raised text-ui-medium font-medium",
  ok: "border-transparent bg-transparent text-ui-muted font-normal",
};

const STATUS_LABELS: Record<SourceStatus["status"], string> = {
  ok: "OK",
  partial: "Partial",
  error: "Error",
};

// Message color follows the same status, rather than always reading as
// critical red — a Partial source's message (e.g. "GROQ_API_KEY not
// configured") shouldn't look as alarming as an Error's.
const MESSAGE_STYLES: Record<SourceStatus["status"], string> = {
  error: "text-ui-critical",
  partial: "text-ui-medium",
  ok: "text-ui-muted",
};

// Failing sources sort to the top of their section so they're found without
// scanning a wall of "OK" rows. This is stated once, in the page intro
// below, rather than silently reordering the list.
const STATUS_RANK: Record<SourceStatus["status"], number> = {
  error: 0,
  partial: 1,
  ok: 2,
};

function StatusBadge({ status }: { status: SourceStatus["status"] }) {
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-[11px] tracking-wide ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export default async function SourcesPage() {
  const statuses = await collectSourceStatuses();
  const statusById = new Map(statuses.map((s) => [s.id, s]));

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Source directory / Provenance &amp; cadence</p>
        <h1 className="page-title">Sources</h1>
        <p className="page-subtitle">
          Every upstream feed CyberDaily consumes, with cadence, scope, and
          live health.
        </p>
      </header>

      <div className="page-body">
        {/* Provenance note */}
        <div className="state-note leading-relaxed">
          CyberDaily is a daily cybersecurity briefing. Sources are fetched at
          the cadences listed below. The current view may be using an older
          cached snapshot — see the timestamp on each source for when it was
          last successfully fetched. Within each category, sources with
          Error or Partial status are listed first so a failure never has to
          be scanned for.
        </div>

        {SECTIONS.map((section) => {
          const entries = SOURCE_CATALOG.filter(
            (entry) => entry.category === section.category
          ).slice().sort((a, b) => {
            const rankA = STATUS_RANK[statusById.get(a.id)?.status ?? "error"];
            const rankB = STATUS_RANK[statusById.get(b.id)?.status ?? "error"];
            return rankA - rankB;
          });
          if (entries.length === 0) return null;

          return (
            <section
              key={section.category}
              className="panel rounded-lg overflow-hidden"
            >
              <div className="panel-header">
                <h2 className="section-title">{section.title}</h2>
                <p className="metadata mt-1">{section.blurb}</p>
              </div>

              <div className="divide-y divide-ui-border">
                {entries.map((entry) => {
                  const status = statusById.get(entry.id);
                  return (
                    <div
                      key={entry.id}
                      className="source-row panel-body flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                    >
                      <div className="min-w-0">
                        <h3 className="story-headline">
                          <a
                            href={entry.upstreamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {entry.label}
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        </h3>
                        <p className="metadata mt-1">{entry.description}</p>
                        <p className="mt-1.5 text-xs font-mono text-ui-muted">
                          {entry.cadence}
                          {status?.count != null && (
                            <>
                              {" · "}
                              {status.count.toLocaleString()}{" "}
                              {section.category === "threatmap"
                                ? "sampled IPs"
                                : "items"}
                            </>
                          )}
                        </p>
                      </div>

                      <div className="shrink-0 sm:text-right">
                        <StatusBadge status={status?.status ?? "error"} />
                        <p className="mt-1.5 text-[11px] text-ui-muted">
                          {status?.lastSuccessfulFetchAt
                            ? `Last fetch ${formatPublishedAt(
                                status.lastSuccessfulFetchAt
                              )}`
                            : "No successful fetch"}
                        </p>
                        {status?.upstreamUpdatedAt && (
                          <p className="text-[11px] text-ui-muted">
                            Upstream {formatPublishedAt(status.upstreamUpdatedAt)}
                          </p>
                        )}
                        {status?.message && (
                          <p
                            className={`mt-1 max-w-[32ch] text-[11px] leading-relaxed ${
                              MESSAGE_STYLES[status?.status ?? "error"]
                            }`}
                          >
                            {status.message}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}