# CyberDaily Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cybersecurity daily news dashboard with threat maps, forecasts, and real-time intel, deployed on Cloudflare Pages.

**Architecture:** Next.js 14 App Router with API routes fetching RSS feeds, CISA KEV, NVD CVE, abuse.ch, and Hacker News data. Dark-themed dashboard with animated world threat map.

**Tech Stack:** Next.js 14, Tailwind CSS, react-simple-maps, d3-geo, framer-motion, rss-parser, recharts

**Spec:** `docs/superpowers/specs/2026-09-03-cyberdaily-design.md`

## Global Constraints

- All data sources must be free and production-safe (no NewsAPI, no Reddit)
- Dark theme with cyber green (#00ff88) accent
- JetBrains Mono font for monospace tech feel
- API routes cache responses (RSS: 15 min, threats: 1 hour, threatmap: 5 min)
- Cloudflare Pages deployment using `@cloudflare/next-on-pages`

---

## File Structure

```
cyberdaily/
├── app/
│   ├── layout.tsx              # Root layout, fonts, metadata
│   ├── page.tsx                # Main dashboard page
│   ├── globals.css             # Tailwind + custom styles
│   └── api/
│       ├── news/route.ts       # RSS feed aggregator
│       ├── threats/route.ts    # CISA KEV + NVD CVE
│       ├── threatmap/route.ts  # abuse.ch + GeoIP
│       └── hackernews/route.ts # HN cybersecurity stories
├── components/
│   ├── Header.tsx              # Logo, nav, last updated
│   ├── ThreatMap.tsx           # World map with animated arcs
│   ├── NewsFeed.tsx            # Scrollable news cards
│   ├── ThreatForecast.tsx      # CVE/KEV trending threats
│   ├── HackerNewsFeed.tsx      # HN stories
│   └── StatsBar.tsx            # Threat statistics
├── lib/
│   ├── rss.ts                  # RSS parser wrapper
│   ├── abuse-ch.ts             # abuse.ch API client
│   ├── nvd.ts                  # NVD CVE API client
│   ├── hn.ts                   # Hacker News API client
│   └── geoip.ts                # IP to coordinates lookup
├── tailwind.config.ts
├── next.config.mjs
├── package.json
└── wrangler.toml               # Cloudflare Pages config
```

---

### Task 1: Project Setup and Dependencies

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `tailwind.config.ts`
- Create: `tsconfig.json`
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `wrangler.toml`

**Interfaces:**
- Produces: Project scaffold with all dependencies installed

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /home/kyle/Projects/cyberdaily
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

- [ ] **Step 2: Install additional dependencies**

```bash
npm install react-simple-maps d3-geo framer-motion rss-parser recharts @cloudflare/next-on-pages
npm install -D @types/d3-geo
```

- [ ] **Step 3: Configure Tailwind for dark theme**

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          green: "#00ff88",
          dark: "#0a0a0a",
          navy: "#1a1a2e",
          red: "#ff6b6b",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Update globals.css**

```css
// app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

body {
  background-color: #0a0a0a;
  color: #e0e0e0;
  font-family: 'JetBrains Mono', monospace;
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a2e;
}

::-webkit-scrollbar-thumb {
  background: #00ff88;
  border-radius: 4px;
}
```

- [ ] **Step 5: Create root layout**

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CyberDaily - Cybersecurity News Dashboard",
  description: "Daily cybersecurity news, threat forecasts, and real-time threat intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cyber-dark">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Create Cloudflare config**

```toml
# wrangler.toml
name = "cyberdaily"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[site]
bucket = ".vercel/output/static"
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js project with Tailwind and Cloudflare config"
```

---

### Task 2: RSS Feed Library

**Files:**
- Create: `lib/rss.ts`

**Interfaces:**
- Produces: `fetchRSSFeeds(): Promise<NewsItem[]>` — aggregated news from all RSS sources
- Produces: `NewsItem` type with title, link, snippet, source, pubDate, thumbnail

- [ ] **Step 1: Create RSS parser wrapper**

```typescript
// lib/rss.ts
import Parser from "rss-parser";

export interface NewsItem {
  title: string;
  link: string;
  snippet: string;
  source: string;
  pubDate: string;
  thumbnail?: string;
}

const parser = new Parser({
  customFields: {
    item: ["media:content", "media:thumbnail", "enclosure"],
  },
});

const RSS_FEEDS = [
  { url: "https://www.bleepingcomputer.com/feed/", name: "BleepingComputer" },
  { url: "https://feeds.feedburner.com/TheHackersNews", name: "The Hacker News" },
  { url: "https://krebsonsecurity.com/feed/", name: "Krebs on Security" },
  { url: "https://www.darkreading.com/rss.xml", name: "Dark Reading" },
  { url: "https://www.securityweek.com/feed/", name: "SecurityWeek" },
  { url: "https://therecord.media/feed", name: "The Record" },
];

function extractSnippet(content: string | undefined, maxLength: number = 200): string {
  if (!content) return "";
  const textOnly = content.replace(/<[^>]*>/g, "");
  return textOnly.length > maxLength
    ? textOnly.substring(0, maxLength) + "..."
    : textOnly;
}

function extractThumbnail(item: any): string | undefined {
  if (item["media:content"]?.$?.url) return item["media:content"].$.url;
  if (item["media:thumbnail"]?.$?.url) return item["media:thumbnail"].$.url;
  if (item.enclosure?.url) return item.enclosure.url;
  const imgMatch = item.content?.match(/<img[^>]+src="([^"]+)"/);
  return imgMatch ? imgMatch[1] : undefined;
}

async function fetchSingleFeed(feed: { url: string; name: string }): Promise<NewsItem[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    return parsed.items.slice(0, 10).map((item) => ({
      title: item.title || "Untitled",
      link: item.link || "#",
      snippet: extractSnippet(item.contentSnippet || item.content),
      source: feed.name,
      pubDate: item.pubDate || new Date().toISOString(),
      thumbnail: extractThumbnail(item),
    }));
  } catch (error) {
    console.error(`Error fetching ${feed.name}:`, error);
    return [];
  }
}

export async function fetchRSSFeeds(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchSingleFeed(feed))
  );

  const allItems = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  return allItems.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/rss.ts
git commit -m "feat: add RSS feed parser with 6 cybersecurity sources"
```

---

### Task 3: Hacker News API Client

**Files:**
- Create: `lib/hn.ts`

**Interfaces:**
- Produces: `fetchHackerNewsStories(): Promise<HNStory[]>` — top cybersecurity stories
- Produces: `HNStory` type with title, url, points, comments, timeAgo

- [ ] **Step 1: Create HN API client**

```typescript
// lib/hn.ts
export interface HNStory {
  title: string;
  url: string;
  points: number;
  comments: number;
  timeAgo: string;
  hnUrl: string;
}

interface HNHit {
  title: string;
  url?: string;
  points: number;
  num_comments: number;
  created_at: string;
  objectID: string;
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function fetchHackerNewsStories(): Promise<HNStory[]> {
  try {
    const response = await fetch(
      "https://hn.algolia.com/api/v1/search?query=cybersecurity&tags=story&hitsPerPage=20",
      { next: { revalidate: 900 } } // 15 min cache
    );

    if (!response.ok) throw new Error("HN API error");

    const data = await response.json();
    return data.hits.map((hit: HNHit) => ({
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      points: hit.points,
      comments: hit.num_comments,
      timeAgo: timeAgo(hit.created_at),
      hnUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    }));
  } catch (error) {
    console.error("Error fetching HN stories:", error);
    return [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hn.ts
git commit -m "feat: add Hacker News API client for cybersecurity stories"
```

---

### Task 4: Threat Intelligence Clients

**Files:**
- Create: `lib/nvd.ts`
- Create: `lib/abuse-ch.ts`
- Create: `lib/geoip.ts`

**Interfaces:**
- Produces: `fetchCVELatest(): Promise<CVEItem[]>` — recent CVEs from NVD
- Produces: `fetchKEVData(): Promise<KEVItem[]>` — CISA Known Exploited Vulnerabilities
- Produces: `fetchThreatMapData(): Promise<ThreatMapEntry[]>` — abuse.ch data with coordinates
- Produces: `lookupIP(ip: string): Promise<GeoCoord | null>` — GeoIP lookup

- [ ] **Step 1: Create NVD API client**

```typescript
// lib/nvd.ts
export interface CVEItem {
  id: string;
  description: string;
  cvssScore: number | null;
  severity: string | null;
  published: string;
  lastModified: string;
  references: string[];
}

export async function fetchCVELatest(): Promise<CVEItem[]> {
  try {
    const response = await fetch(
      "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20",
      { next: { revalidate: 3600 } } // 1 hour cache
    );

    if (!response.ok) throw new Error("NVD API error");

    const data = await response.json();
    return data.vulnerabilities.map((v: any) => {
      const cve = v.cve;
      const metrics = cve.metrics?.cvssMetricV31?.[0]?.cvssData;
      return {
        id: cve.id,
        description: cve.descriptions?.[0]?.value || "No description",
        cvssScore: metrics?.baseScore || null,
        severity: metrics?.baseSeverity || null,
        published: cve.published,
        lastModified: cve.lastModified,
        references: (cve.references || []).map((r: any) => r.url),
      };
    });
  } catch (error) {
    console.error("Error fetching CVEs:", error);
    return [];
  }
}
```

- [ ] **Step 2: Create CISA KEV client**

```typescript
// lib/abuse-ch.ts (KEV section)
export interface KEVItem {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
}

export async function fetchKEVData(): Promise<KEVItem[]> {
  try {
    const response = await fetch(
      "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
      { next: { revalidate: 3600 } } // 1 hour cache
    );

    if (!response.ok) throw new Error("CISA KEV API error");

    const data = await response.json();
    return data.vulnerabilities
      .sort((a: any, b: any) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
      .slice(0, 10)
      .map((v: any) => ({
        cveID: v.cveID,
        vendorProject: v.vendorProject,
        product: v.product,
        vulnerabilityName: v.vulnerabilityName,
        dateAdded: v.dateAdded,
        shortDescription: v.shortDescription,
        requiredAction: v.requiredAction,
        dueDate: v.dueDate,
      }));
  } catch (error) {
    console.error("Error fetching KEV data:", error);
    return [];
  }
}
```

- [ ] **Step 3: Create abuse.ch threat map client**

```typescript
// lib/abuse-ch.ts (ThreatMap section)
export interface ThreatMapEntry {
  sourceIP: string;
  sourceCountry: string;
  sourceLat: number;
  sourceLng: number;
  destinationCountry: string;
  threatType: string;
  firstSeen: string;
}

// Static GeoIP mapping for common countries (simplified for demo)
const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  US: { lat: 37.0902, lng: -95.7129 },
  CN: { lat: 35.8617, lng: 104.1954 },
  RU: { lat: 61.524, lng: 105.3188 },
  DE: { lat: 51.1657, lng: 10.4515 },
  GB: { lat: 55.3781, lng: -3.436 },
  FR: { lat: 46.2276, lng: 2.2137 },
  BR: { lat: -14.235, lng: -51.9253 },
  IN: { lat: 20.5937, lng: 78.9629 },
  JP: { lat: 36.2048, lng: 138.2529 },
  KR: { lat: 35.9078, lng: 127.7669 },
  AU: { lat: -25.2744, lng: 133.7751 },
  CA: { lat: 56.1304, lng: -106.3468 },
  NL: { lat: 52.1326, lng: 5.2913 },
  UA: { lat: 48.3794, lng: 31.1656 },
  PL: { lat: 51.9194, lng: 19.1451 },
  TR: { lat: 38.9637, lng: 35.2433 },
  VN: { lat: 14.0583, lng: 108.2772 },
  ID: { lat: -0.7893, lng: 113.9213 },
  MX: { lat: 23.6345, lng: -102.5528 },
  AR: { lat: -38.4161, lng: -63.6167 },
};

export async function fetchThreatMapData(): Promise<ThreatMapEntry[]> {
  try {
    const response = await fetch(
      "https://urlhaus.abuse.ch/downloads/json_recent/",
      { next: { revalidate: 300 } } // 5 min cache
    );

    if (!response.ok) throw new Error("abuse.ch API error");

    const data = await response.json();
    const entries: ThreatMapEntry[] = [];

    for (const [url, details] of Object.entries(data.urls || {}) as [string, any][]) {
      const country = details.country || "US";
      const coords = COUNTRY_COORDS[country] || COUNTRY_COORDS.US;

      entries.push({
        sourceIP: details.host || "unknown",
        sourceCountry: country,
        sourceLat: coords.lat + (Math.random() - 0.5) * 5,
        sourceLng: coords.lng + (Math.random() - 0.5) * 5,
        destinationCountry: "US",
        threatType: details.threat || "malware",
        firstSeen: details.firstseen || new Date().toISOString(),
      });
    }

    return entries.slice(0, 50);
  } catch (error) {
    console.error("Error fetching threat map data:", error);
    return [];
  }
}
```

- [ ] **Step 4: Create GeoIP lookup utility**

```typescript
// lib/geoip.ts
export interface GeoCoord {
  lat: number;
  lng: number;
  country: string;
  city?: string;
}

const CACHE = new Map<string, GeoCoord | null>();

export async function lookupIP(ip: string): Promise<GeoCoord | null> {
  if (CACHE.has(ip)) return CACHE.get(ip) || null;

  try {
    // Using free ip-api.com (rate limit: 45 req/min)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,lat,lon,city`);
    const data = await response.json();

    if (data.status !== "success") {
      CACHE.set(ip, null);
      return null;
    }

    const coord: GeoCoord = {
      lat: data.lat,
      lng: data.lon,
      country: data.countryCode,
      city: data.city,
    };

    CACHE.set(ip, coord);
    return coord;
  } catch (error) {
    console.error(`GeoIP lookup failed for ${ip}:`, error);
    CACHE.set(ip, null);
    return null;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/nvd.ts lib/abuse-ch.ts lib/geoip.ts
git commit -m "feat: add threat intelligence clients (NVD, CISA KEV, abuse.ch, GeoIP)"
```

---

### Task 5: API Routes

**Files:**
- Create: `app/api/news/route.ts`
- Create: `app/api/threats/route.ts`
- Create: `app/api/threatmap/route.ts`
- Create: `app/api/hackernews/route.ts`

**Interfaces:**
- Produces: GET endpoints returning JSON data with appropriate caching headers

- [ ] **Step 1: Create news API route**

```typescript
// app/api/news/route.ts
import { NextResponse } from "next/server";
import { fetchRSSFeeds } from "@/lib/rss";

export const runtime = "edge";

export async function GET() {
  try {
    const news = await fetchRSSFeeds();
    return NextResponse.json(news, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=450",
      },
    });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create threats API route**

```typescript
// app/api/threats/route.ts
import { NextResponse } from "next/server";
import { fetchCVELatest } from "@/lib/nvd";
import { fetchKEVData } from "@/lib/abuse-ch";

export const runtime = "edge";

export async function GET() {
  try {
    const [cves, kev] = await Promise.allSettled([
      fetchCVELatest(),
      fetchKEVData(),
    ]);

    return NextResponse.json(
      {
        cves: cves.status === "fulfilled" ? cves.value : [],
        kev: kev.status === "fulfilled" ? kev.value : [],
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error("Threats API error:", error);
    return NextResponse.json({ error: "Failed to fetch threats" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create threat map API route**

```typescript
// app/api/threatmap/route.ts
import { NextResponse } from "next/server";
import { fetchThreatMapData } from "@/lib/abuse-ch";

export const runtime = "edge";

export async function GET() {
  try {
    const threats = await fetchThreatMapData();
    return NextResponse.json(threats, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=150",
      },
    });
  } catch (error) {
    console.error("Threat map API error:", error);
    return NextResponse.json({ error: "Failed to fetch threat map data" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create Hacker News API route**

```typescript
// app/api/hackernews/route.ts
import { NextResponse } from "next/server";
import { fetchHackerNewsStories } from "@/lib/hn";

export const runtime = "edge";

export async function GET() {
  try {
    const stories = await fetchHackerNewsStories();
    return NextResponse.json(stories, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=450",
      },
    });
  } catch (error) {
    console.error("HN API error:", error);
    return NextResponse.json({ error: "Failed to fetch HN stories" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/
git commit -m "feat: add API routes for news, threats, threatmap, and hackernews"
```

---

### Task 6: Header and StatsBar Components

**Files:**
- Create: `components/Header.tsx`
- Create: `components/StatsBar.tsx`

**Interfaces:**
- Produces: `Header` component with logo and last updated time
- Produces: `StatsBar` component showing threat statistics

- [ ] **Step 1: Create Header component**

```typescript
// components/Header.tsx
"use client";

import { useState, useEffect } from "react";

export default function Header() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-cyber-navy bg-cyber-dark/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyber-green/20 rounded-lg flex items-center justify-center">
            <span className="text-cyber-green text-xl">🛡️</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">CyberDaily</h1>
            <p className="text-xs text-gray-400">Cybersecurity Intelligence Dashboard</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Last updated</p>
          <p className="text-sm text-cyber-green font-mono">
            {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create StatsBar component**

```typescript
// components/StatsBar.tsx
"use client";

import { useEffect, useState } from "react";

interface Stats {
  attacksToday: number;
  newCVEs: number;
  kevAdditions: number;
  sourcesMonitored: number;
}

export default function StatsBar() {
  const [stats, setStats] = useState<Stats>({
    attacksToday: 0,
    newCVEs: 0,
    kevAdditions: 0,
    sourcesMonitored: 6,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [threatsRes, threatmapRes] = await Promise.all([
          fetch("/api/threats"),
          fetch("/api/threatmap"),
        ]);

        const threats = await threatsRes.json();
        const threatmap = await threatmapRes.json();

        setStats({
          attacksToday: threatmap.length || 0,
          newCVEs: threats.cves?.length || 0,
          kevAdditions: threats.kev?.length || 0,
          sourcesMonitored: 6,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  const statItems = [
    { label: "Attacks Tracked", value: stats.attacksToday, color: "text-cyber-red" },
    { label: "New CVEs", value: stats.newCVEs, color: "text-yellow-400" },
    { label: "KEV Additions", value: stats.kevAdditions, color: "text-orange-400" },
    { label: "Sources", value: stats.sourcesMonitored, color: "text-cyber-green" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="bg-cyber-navy rounded-lg p-4 border border-gray-800"
        >
          <p className="text-xs text-gray-400 uppercase tracking-wider">{item.label}</p>
          <p className={`text-2xl font-bold ${item.color} font-mono`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Header.tsx components/StatsBar.tsx
git commit -m "feat: add Header and StatsBar components"
```

---

### Task 7: ThreatMap Component

**Files:**
- Create: `components/ThreatMap.tsx`

**Interfaces:**
- Consumes: `GET /api/threatmap` returning `ThreatMapEntry[]`
- Produces: Animated world map with attack arcs

- [ ] **Step 1: Create ThreatMap component**

```typescript
// components/ThreatMap.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
} from "react-simple-maps";
import { motion, AnimatePresence } from "framer-motion";

interface ThreatMapEntry {
  sourceIP: string;
  sourceCountry: string;
  sourceLat: number;
  sourceLng: number;
  destinationCountry: string;
  threatType: string;
  firstSeen: string;
}

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Fixed destination point (e.g., US East Coast)
const DESTINATION: [number, number] = [-74.006, 40.7128];

export default function ThreatMap() {
  const [threats, setThreats] = useState<ThreatMapEntry[]>([]);
  const [activeArcs, setActiveArcs] = useState<ThreatMapEntry[]>([]);
  const arcIndex = useRef(0);

  useEffect(() => {
    async function fetchThreats() {
      try {
        const res = await fetch("/api/threatmap");
        const data = await res.json();
        setThreats(data);
      } catch (error) {
        console.error("Failed to fetch threat map:", error);
      }
    }

    fetchThreats();
    const interval = setInterval(fetchThreats, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  // Animate arcs one by one
  useEffect(() => {
    if (threats.length === 0) return;

    const interval = setInterval(() => {
      const next = threats[arcIndex.current % threats.length];
      setActiveArcs((prev) => {
        const updated = [...prev, next];
        return updated.slice(-8); // Keep last 8 arcs
      });
      arcIndex.current++;
    }, 2000);

    return () => clearInterval(interval);
  }, [threats]);

  return (
    <div className="bg-cyber-navy rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 bg-cyber-red rounded-full animate-pulse" />
          Global Threat Map
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Real-time malicious URL activity from abuse.ch
        </p>
      </div>
      <div className="relative aspect-[2/1] bg-cyber-dark/50">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 120,
            center: [10, 20],
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1a1a2e"
                  stroke="#2a2a4e"
                  strokeWidth={0.5}
                />
              ))
            }
          </Geographies>

          <AnimatePresence>
            {activeArcs.map((threat, i) => (
              <motion.g
                key={`${threat.sourceIP}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Line
                  from={[threat.sourceLng, threat.sourceLat]}
                  to={DESTINATION}
                  stroke="#ff6b6b"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeDasharray="4,4"
                />
                <circle
                  cx={threat.sourceLng}
                  cy={threat.sourceLat}
                  r={3}
                  fill="#ff6b6b"
                  className="animate-ping"
                />
              </motion.g>
            ))}
          </AnimatePresence>
        </ComposableMap>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-cyber-dark/80 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-0.5 bg-cyber-red" />
            <span className="text-gray-400">Attack Source</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-cyber-red rounded-full animate-ping" />
            <span className="text-gray-400">Active Threat</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ThreatMap.tsx
git commit -m "feat: add ThreatMap component with animated attack arcs"
```

---

### Task 8: NewsFeed Component

**Files:**
- Create: `components/NewsFeed.tsx`

**Interfaces:**
- Consumes: `GET /api/news` returning `NewsItem[]`
- Produces: Scrollable news cards with source badges

- [ ] **Step 1: Create NewsFeed component**

```typescript
// components/NewsFeed.tsx
"use client";

import { useEffect, useState } from "react";

interface NewsItem {
  title: string;
  link: string;
  snippet: string;
  source: string;
  pubDate: string;
  thumbnail?: string;
}

const SOURCE_COLORS: Record<string, string> = {
  BleepingComputer: "bg-blue-500/20 text-blue-400",
  "The Hacker News": "bg-purple-500/20 text-purple-400",
  "Krebs on Security": "bg-green-500/20 text-green-400",
  "Dark Reading": "bg-orange-500/20 text-orange-400",
  SecurityWeek: "bg-cyan-500/20 text-cyan-400",
  "The Record": "bg-pink-500/20 text-pink-400",
};

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("/api/news");
        const data = await res.json();
        setNews(data);
      } catch (error) {
        console.error("Failed to fetch news:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
    const interval = setInterval(fetchNews, 900000); // 15 min
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-cyber-navy rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {news.slice(0, visibleCount).map((item, i) => (
        <a
          key={`${item.link}-${i}`}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-cyber-navy rounded-lg p-4 border border-gray-800 hover:border-cyber-green/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            {item.thumbnail && (
              <img
                src={item.thumbnail}
                alt=""
                className="w-16 h-16 object-cover rounded flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white line-clamp-2 mb-1">
                {item.title}
              </h3>
              <p className="text-xs text-gray-400 line-clamp-2 mb-2">{item.snippet}</p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    SOURCE_COLORS[item.source] || "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {item.source}
                </span>
                <span className="text-xs text-gray-500">{timeAgo(item.pubDate)}</span>
              </div>
            </div>
          </div>
        </a>
      ))}

      {visibleCount < news.length && (
        <button
          onClick={() => setVisibleCount((prev) => prev + 10)}
          className="w-full py-2 text-sm text-cyber-green hover:text-cyber-green/80 transition-colors"
        >
          Load more...
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/NewsFeed.tsx
git commit -m "feat: add NewsFeed component with source badges and infinite scroll"
```

---

### Task 9: ThreatForecast and HackerNewsFeed Components

**Files:**
- Create: `components/ThreatForecast.tsx`
- Create: `components/HackerNewsFeed.tsx`

**Interfaces:**
- Consumes: `GET /api/threats` returning `{ cves: CVEItem[], kev: KEVItem[] }`
- Consumes: `GET /api/hackernews` returning `HNStory[]`

- [ ] **Step 1: Create ThreatForecast component**

```typescript
// components/ThreatForecast.tsx
"use client";

import { useEffect, useState } from "react";

interface CVEItem {
  id: string;
  description: string;
  cvssScore: number | null;
  severity: string | null;
  published: string;
}

interface KEVItem {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-500 bg-red-500/20",
  HIGH: "text-orange-500 bg-orange-500/20",
  MEDIUM: "text-yellow-500 bg-yellow-500/20",
  LOW: "text-green-500 bg-green-500/20",
};

export default function ThreatForecast() {
  const [cves, setCves] = useState<CVEItem[]>([]);
  const [kev, setKev] = useState<KEVItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchThreats() {
      try {
        const res = await fetch("/api/threats");
        const data = await res.json();
        setCves(data.cves || []);
        setKev(data.kev || []);
      } catch (error) {
        console.error("Failed to fetch threats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchThreats();
    const interval = setInterval(fetchThreats, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-cyber-navy rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-3" />
          <div className="h-3 bg-gray-700 rounded w-full mb-2" />
          <div className="h-3 bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CISA KEV Section */}
      <div className="bg-cyber-navy rounded-lg border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="text-cyber-red">⚠️</span>
            CISA Known Exploited Vulnerabilities
          </h3>
        </div>
        <div className="divide-y divide-gray-800">
          {kev.slice(0, 5).map((item) => (
            <div key={item.cveID} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-mono text-cyber-green">{item.cveID}</span>
                <span className="text-xs text-gray-500">{item.dateAdded}</span>
              </div>
              <p className="text-sm text-white font-medium mb-1">{item.vulnerabilityName}</p>
              <p className="text-xs text-gray-400">
                {item.vendorProject} — {item.product}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Trending CVEs Section */}
      <div className="bg-cyber-navy rounded-lg border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="text-yellow-400">🔍</span>
            Trending CVEs
          </h3>
        </div>
        <div className="divide-y divide-gray-800">
          {cves.slice(0, 5).map((cve) => (
            <div key={cve.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs font-mono text-cyber-green">{cve.id}</span>
                {cve.severity && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      SEVERITY_COLORS[cve.severity] || "text-gray-400 bg-gray-500/20"
                    }`}
                  >
                    {cve.severity} {cve.cvssScore && `(${cve.cvssScore})`}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 line-clamp-2">{cve.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create HackerNewsFeed component**

```typescript
// components/HackerNewsFeed.tsx
"use client";

import { useEffect, useState } from "react";

interface HNStory {
  title: string;
  url: string;
  points: number;
  comments: number;
  timeAgo: string;
  hnUrl: string;
}

export default function HackerNewsFeed() {
  const [stories, setStories] = useState<HNStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStories() {
      try {
        const res = await fetch("/api/hackernews");
        const data = await res.json();
        setStories(data);
      } catch (error) {
        console.error("Failed to fetch HN stories:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStories();
    const interval = setInterval(fetchStories, 900000); // 15 min
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-cyber-navy rounded-lg p-3 animate-pulse">
            <div className="h-3 bg-gray-700 rounded w-full mb-2" />
            <div className="h-2 bg-gray-700 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-cyber-navy rounded-lg border border-gray-800">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-orange-400">🔶</span>
          Hacker News — Cybersecurity
        </h3>
      </div>
      <div className="divide-y divide-gray-800">
        {stories.slice(0, 10).map((story, i) => (
          <a
            key={`${story.url}-${i}`}
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 hover:bg-cyber-dark/50 transition-colors"
          >
            <p className="text-sm text-white line-clamp-2 mb-2">{story.title}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="text-orange-400">▲</span>
                {story.points}
              </span>
              <span>{story.comments} comments</span>
              <span>{story.timeAgo}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ThreatForecast.tsx components/HackerNewsFeed.tsx
git commit -m "feat: add ThreatForecast and HackerNewsFeed components"
```

---

### Task 10: Main Dashboard Page

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: All components (Header, StatsBar, ThreatMap, NewsFeed, ThreatForecast, HackerNewsFeed)

- [ ] **Step 1: Create main dashboard page**

```typescript
// app/page.tsx
import Header from "@/components/Header";
import StatsBar from "@/components/StatsBar";
import ThreatMap from "@/components/ThreatMap";
import NewsFeed from "@/components/NewsFeed";
import ThreatForecast from "@/components/ThreatForecast";
import HackerNewsFeed from "@/components/HackerNewsFeed";

export default function Home() {
  return (
    <div className="min-h-screen bg-cyber-dark">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <StatsBar />

        {/* Threat Map - Full Width */}
        <div className="mb-6">
          <ThreatMap />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* News Feed - 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-cyber-navy rounded-lg border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="text-cyber-green">📰</span>
                  Cybersecurity News
                </h2>
              </div>
              <div className="p-4">
                <NewsFeed />
              </div>
            </div>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            <ThreatForecast />
            <HackerNewsFeed />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-gray-500">
          <p>CyberDaily — Cybersecurity Intelligence Dashboard</p>
          <p className="mt-1">
            Data sources: RSS Feeds • CISA KEV • NVD CVE • abuse.ch • Hacker News
          </p>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add main dashboard page with all components"
```

---

### Task 11: Build and Deploy Configuration

**Files:**
- Modify: `next.config.mjs`
- Modify: `package.json`
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: Working build for Cloudflare Pages deployment

- [ ] **Step 1: Update next.config.mjs for Cloudflare**

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    runtime: "edge",
  },
};

export default nextConfig;
```

- [ ] **Step 2: Add build scripts to package.json**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "pages:build": "npx @cloudflare/next-on-pages",
    "pages:deploy": "wrangler pages deploy .vercel/output/static --project-name cyberdaily"
  }
}
```

- [ ] **Step 3: Create GitHub Actions workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run pages:build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy .vercel/output/static --project-name cyberdaily
```

- [ ] **Step 4: Commit**

```bash
git add next.config.mjs package.json .github/
git commit -m "feat: add Cloudflare Pages build and deploy configuration"
```

---

### Task 12: Final Testing and Push

**Files:**
- None (verification only)

- [ ] **Step 1: Run build locally**

```bash
cd /home/kyle/Projects/cyberdaily
npm run build
```

Expected: Build succeeds without errors

- [ ] **Step 2: Test API routes locally**

```bash
npm run dev &
sleep 5
curl http://localhost:3000/api/news | head -c 500
curl http://localhost:3000/api/threats | head -c 500
curl http://localhost:3000/api/threatmap | head -c 500
curl http://localhost:3000/api/hackernews | head -c 500
kill %1
```

Expected: JSON responses from all endpoints

- [ ] **Step 3: Push to GitHub**

```bash
git add .
git commit -m "feat: complete CyberDaily dashboard implementation"
git push origin master
```

- [ ] **Step 4: Verify deployment**

After pushing, check GitHub Actions for successful deployment.
The site will be available at: `https://cyberdaily.pages.dev`

---

## Self-Review Complete

✅ **Spec coverage:** All requirements from the spec are covered:
- RSS feeds (6 sources) ✓
- CISA KEV ✓
- NVD CVE ✓
- abuse.ch threat map ✓
- Hacker News ✓
- Dark theme ✓
- Cloudflare Pages deployment ✓

✅ **Placeholder scan:** No TBD/TODO sections. All code is complete.

✅ **Type consistency:** All interfaces match between API routes and components.
