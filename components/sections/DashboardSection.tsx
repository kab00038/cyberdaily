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
import { formatPublishedAt } from "@/lib/format";

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
    <Link href={href} className="panel interactive p-5 block group">
      <div className="min-w-0">
        {status === "error" ? (
          <p className="text-2xl sm:text-3xl font-bold text-gray-500 font-display">
            Unavailable
          </p>
        ) : status === "ready" && value !== null ? (
          <p className="text-2xl sm:text-3xl font-bold text-white font-display">
            {value.toLocaleString()}
          </p>
        ) : (
          <span
            className="inline-block h-8 w-16 rounded bg-white/[0.08] animate-pulse"
            aria-label="Loading"
          />
        )}
        <p className="text-[11px] text-gray-500 uppercase tracking-widest font-medium mt-1.5">
          {label}
        </p>
        <p className="text-[10px] text-gray-600 font-mono mt-0.5">{scope}</p>
      </div>
    </Link>
  );
}

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(11, 15, 14, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "10px",
  fontSize: "12px",
  backdropFilter: "blur(8px)",
};

export default function DashboardSection() {
  const [threats, setThreats] = useState<ThreatsData | null>(null);
  const [threatsStatus, setThreatsStatus] = useState<FetchStatus>("loading");
  const [news, setNews] = useState<NewsPreviewItem[] | null>(null);
  const [newsStatus, setNewsStatus] = useState<FetchStatus>("loading");
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [trendsStatus, setTrendsStatus] = useState<FetchStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboardData() {
      const [threatsRes, newsRes, trendsRes] = await Promise.allSettled([
        fetch("/api/threats").then((res) => {
          if (!res.ok) throw new Error(`threats ${res.status}`);
          return res.json();
        }),
        fetch("/api/news").then((res) => {
          if (!res.ok) throw new Error(`news ${res.status}`);
          return res.json();
        }),
        fetch("/api/trends").then((res) => {
          if (!res.ok) throw new Error(`trends ${res.status}`);
          return res.json();
        }),
      ]);

      if (cancelled) return;

      if (threatsRes.status === "fulfilled") {
        setThreats(threatsRes.value as ThreatsData);
        setThreatsStatus("ready");
      } else {
        setThreatsStatus("error");
      }

      if (newsRes.status === "fulfilled") {
        setNews(newsRes.value as NewsPreviewItem[]);
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
      cancelled = true;
    };
  }, []);

  const cveCount = threats?.cves?.length ?? null;
  const kevCount = threats?.kev?.length ?? null;
  const newsCount = news?.length ?? null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header>
        <h1 className="page-title">Today</h1>
        <p className="metadata mt-1">
          Cybersecurity news and vulnerability intelligence
        </p>
      </header>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="panel-header p-4">
            <h2 className="section-title">Latest stories</h2>
          </div>
          {newsStatus === "loading" && <p className="metadata p-4">Loading…</p>}
          {newsStatus === "error" && (
            <p className="metadata p-4">News preview unavailable.</p>
          )}
          {newsStatus === "ready" && (
            <div className="divide-y divide-white/[0.06]">
              {news?.slice(0, 6).map((item, i) => (
                <a
                  key={`${item.link}-${i}`}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 hover:bg-[#0B0F0E]/40 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 font-medium uppercase tracking-wider">
                      {item.source}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {formatPublishedAt(item.pubDate)}
                    </span>
                  </div>
                  <h3 className="text-[17px] font-semibold text-gray-100 leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                    {item.aiSummary || item.snippet}
                  </p>
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="panel rounded-lg overflow-hidden">
          <div className="panel-header p-4">
            <h2 className="section-title">Recent KEV entries</h2>
          </div>
          {threatsStatus === "loading" && (
            <p className="metadata p-4">Loading…</p>
          )}
          {threatsStatus === "error" && (
            <p className="metadata p-4">KEV preview unavailable.</p>
          )}
          {threatsStatus === "ready" && (
            <div className="divide-y divide-white/[0.06]">
              {threats?.kev.slice(0, 5).map((item) => (
                <div key={item.cveID} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-mono text-emerald-500">
                      {item.cveID}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {item.dateAdded}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mb-1">
                    {item.vendorProject} — {item.product}
                  </p>
                  <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                    <span className="text-gray-400">Required: </span>
                    {item.requiredAction}
                  </p>
                </div>
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
        <div className="map-frame">
          <ThreatMap />
        </div>
      </section>

      {/* Analytics summary — single useful chart */}
      <section className="panel rounded-lg overflow-hidden">
        <div className="panel-header p-4 flex items-center justify-between gap-4">
          <h2 className="section-title">14-day CVE trend</h2>
          <Link href="/analytics" className="text-link text-xs font-medium shrink-0">
            View all analytics →
          </Link>
        </div>
        <div className="p-4">
          {trendsStatus === "loading" && <p className="metadata">Loading…</p>}
          {trendsStatus === "error" && (
            <p className="metadata">Chart unavailable.</p>
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
                  tick={{ fill: "#6B7280", fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fill: "#6B7280", fontSize: 10 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: "#D1D5DB" }}
                  labelStyle={{ color: "#6B7280" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}