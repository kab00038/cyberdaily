// components/sections/DashboardSection.tsx — Today (dashboard briefing).
// Composed so the first viewport communicates the page purpose, summary
// metrics, and useful stories/vulnerabilities. The attack map is compact
// and sits lower, with a calm, informative tone throughout.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ThreatMap from "@/components/ThreatMap";
import { formatPublishedAt, isPublishedWithin } from "@/lib/format";

interface NewsPreviewItem {
  title: string;
  link: string;
  snippet: string;
  source: string;
  pubDate: string | null;
  aiSummary?: string | null;
}

interface KEVPreviewItem {
  cveID: string;
  vendorProject: string;
  product: string;
  dateAdded: string;
  requiredAction: string;
}

interface ThreatsData {
  cves: unknown[];
  kev: KEVPreviewItem[];
}

interface TrendsData {
  dailyTrend: { date: string; count: number }[];
}

type FetchStatus = "loading" | "ready" | "error";

interface MetricCardProps {
  label: string;
  scope: string;
  href: string;
  value: number | null;
  status: FetchStatus;
}

function MetricCard({ label, scope, href, value, status }: MetricCardProps) {
  return (
    <Link href={href} className="metric-cell block">
      <div className="min-w-0">
        {status === "error" ? (
          <p className="metric-number !text-lg">
            Unavailable
          </p>
        ) : status === "ready" && value !== null ? (
          <p className="metric-number text-ui-text">
            {value.toLocaleString()}
          </p>
        ) : (
          <p className="metric-number !text-lg text-ui-muted">Pending</p>
        )}
        <p className="metric-label">
          {label}
        </p>
        <p className="metric-scope">{scope}</p>
      </div>
    </Link>
  );
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--cd-canvas)",
  border: "1px solid var(--cd-border)",
  borderRadius: "10px",
  fontSize: "12px",
};

export default function DashboardSection() {
  const [threats, setThreats] = useState<ThreatsData | null>(null);
  const [threatsStatus, setThreatsStatus] = useState<FetchStatus>("loading");
  const [news, setNews] = useState<NewsPreviewItem[] | null>(null);
  const [newsStatus, setNewsStatus] = useState<FetchStatus>("loading");
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [trendsStatus, setTrendsStatus] = useState<FetchStatus>("loading");
  const [editionDate, setEditionDate] = useState("");

  // Stable reference clock for the "last 7 days" preview filter — captured on
  // mount (not Date.now() per render) so client/server output stays consistent.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    setEditionDate(new Intl.DateTimeFormat("en-GB", {
      weekday: "long", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
    }).format(new Date()));
  }, []);

  useEffect(() => {
    // Cancel the mount fetch if the dashboard unmounts (e.g. navigation).
    const controller = new AbortController();

    async function fetchDashboardData() {
      const [threatsRes, newsRes, trendsRes] = await Promise.allSettled([
        fetch("/api/threats", { signal: controller.signal }).then((res) => {
          if (!res.ok) throw new Error(`threats ${res.status}`);
          return res.json();
        }),
        fetch("/api/news", { signal: controller.signal }).then((res) => {
          if (!res.ok) throw new Error(`news ${res.status}`);
          return res.json();
        }),
        fetch("/api/trends", { signal: controller.signal }).then((res) => {
          if (!res.ok) throw new Error(`trends ${res.status}`);
          return res.json();
        }),
      ]);

      if (controller.signal.aborted) return;

      if (threatsRes.status === "fulfilled") {
        setThreats(threatsRes.value as ThreatsData);
        setThreatsStatus("ready");
      } else {
        setThreatsStatus("error");
      }

      if (newsRes.status === "fulfilled") {
        const newsPayload = newsRes.value as
          | NewsPreviewItem[]
          | { items: NewsPreviewItem[] };
        setNews(Array.isArray(newsPayload) ? newsPayload : newsPayload.items ?? []);
        setNewsStatus("ready");
      } else {
        setNewsStatus("error");
      }

      if (trendsRes.status === "fulfilled") {
        setTrends(trendsRes.value as TrendsData);
        setTrendsStatus("ready");
      } else {
        setTrendsStatus("error");
      }
    }

    fetchDashboardData();
    return () => {
      controller.abort();
    };
  }, []);

  const cveCount = threats?.cves?.length ?? null;
  const kevCount = threats?.kev?.length ?? null;
  const newsCount = news?.length ?? null;

  // Latest-stories preview — same recency normalization as the News page so
  // future-dated or stale items never lead the dashboard.
  const latestStories = (news ?? [])
    .filter((n) => isPublishedWithin(n.pubDate, nowMs, 7 * 24))
    .slice(0, 6);

  return (
    <>
      {/* Page header */}
      <header className="page-header briefing-header">
        <p className="eyebrow">Daily briefing{editionDate && ` / ${editionDate} · UTC`}</p>
        <h1 className="page-title">Today</h1>
        <p className="page-subtitle">
          Cybersecurity news and vulnerability intelligence
        </p>
      </header>

      <div className="page-body">
        {/* Summary metrics */}
        <div className="metric-ledger">
          <MetricCard
            label="Loaded CVEs"
            scope="NVD · last 14 days · partial"
            href="/threats"
            value={cveCount}
            status={threatsStatus}
          />
          <MetricCard
            label="Recent KEV entries"
            scope="CISA KEV · newest 10"
            href="/threats"
            value={kevCount}
            status={threatsStatus}
          />
          <MetricCard
            label="News items"
            scope="RSS feeds · latest snapshot"
            href="/news"
            value={newsCount}
            status={newsStatus}
          />
        </div>

        {/* Latest stories + Recent KEV previews (2:1 on wide screens) */}
        <div className="briefing-grid">
          <section className="panel rounded-lg overflow-hidden">
            <div className="panel-header">
              <h2 className="section-title">Latest stories</h2>
            </div>
            {newsStatus === "loading" && <p className="state-panel" role="status">Loading the latest RSS stories.</p>}
            {newsStatus === "error" && (
              <p className="state-panel" role="status">News preview unavailable.</p>
            )}
            {newsStatus === "ready" &&
              (latestStories.length === 0 ? (
                <p className="metadata p-4">
                  No recent stories in the loaded feed.
                </p>
              ) : (
                <div className="divide-y divide-ui-border">
                  {latestStories.map((item, i) => (
                    <a
                      key={`${item.link}-${i}`}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="interactive-row block px-5 py-4 group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] text-ui-secondary font-medium">
                          {item.source}
                        </span>
                        <span className="text-[11px] text-ui-muted font-mono">
                          {formatPublishedAt(item.pubDate)}
                        </span>
                      </div>
                      <h3 className="story-headline line-clamp-2 group-hover:text-ui-accent transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-ui-secondary line-clamp-2 mt-1 leading-relaxed">
                        {item.aiSummary || item.snippet}
                      </p>
                    </a>
                  ))}
                </div>
              ))}
          </section>

          <section className="panel rounded-lg overflow-hidden">
            <div className="panel-header">
              <h2 className="section-title">Recent KEV entries</h2>
            </div>
            {threatsStatus === "loading" && (
              <p className="state-panel" role="status">Loading recent CISA KEV entries.</p>
            )}
            {threatsStatus === "error" && (
              <p className="state-panel" role="status">KEV preview unavailable.</p>
            )}
            {threatsStatus === "ready" && (
              <div className="divide-y divide-ui-border">
                {threats?.kev.slice(0, 5).map((item) => (
                  <Link
                    key={item.cveID}
                    href={`/cve/${item.cveID}`}
                    className="interactive-row block p-4 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-link text-xs font-mono">
                        {item.cveID}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-ui-muted font-mono">
                        {item.dateAdded}
                        <span
                          className="text-ui-muted transition-colors group-hover:text-ui-accent"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-ui-secondary mb-1">
                      {item.vendorProject} — {item.product}
                    </p>
                    <p className="text-[11px] text-ui-muted leading-relaxed line-clamp-2">
                      <span className="text-ui-secondary">Required: </span>
                      {item.requiredAction}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Reported IP sample — compact and low on the page */}
        <section>
          <p className="metadata mb-2">
            Sampled records — not a count of worldwide attacks.
          </p>
          <ThreatMap />
        </section>

        {/* Analytics summary — single useful chart */}
        <section className="panel rounded-lg overflow-hidden">
          <div className="panel-header flex items-center justify-between gap-4">
            <h2 className="section-title">14-day CVE trend</h2>
            <Link href="/analytics" className="text-link text-xs font-medium shrink-0">
              View all analytics →
            </Link>
          </div>
          <div className="panel-body">
            <p className="metadata mb-4">NVD · 14-day publication window · {trends?.dailyTrend ? `${trends.dailyTrend.reduce((total, day) => total + day.count, 0)} records in plotted bins` : "sample size unavailable"}</p>
            {trendsStatus === "loading" && <p className="state-panel" role="status">Loading the NVD publication window.</p>}
            {trendsStatus === "error" && (
              <p className="state-panel" role="status">Chart unavailable.</p>
            )}
            {trendsStatus === "ready" && trends?.dailyTrend && (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trends.dailyTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.05)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--cd-muted)", fontSize: 10 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fill: "var(--cd-muted)", fontSize: 10 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={{ color: "var(--cd-secondary)" }}
                    labelStyle={{ color: "var(--cd-muted)" }}
                  />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="count"
                    stroke="var(--cd-accent)"
                    fill="var(--cd-accent)"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </>
  );
}