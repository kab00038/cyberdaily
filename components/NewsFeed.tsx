// components/NewsFeed.tsx
"use client";

import { useEffect, useState } from "react";
import { getCategoryColor, getCategoryLabel, ThreatCategory } from "@/lib/ai";

interface NewsItem {
  title: string;
  link: string;
  snippet: string;
  source: string;
  pubDate: string;
  thumbnail?: string;
  aiSummary?: string | null;
  category?: string;
  urgency?: string;
}

const SOURCE_STYLES: Record<string, { border: string; badge: string }> = {
  BleepingComputer: {
    border: "border-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  "The Hacker News": {
    border: "border-cyan-500",
    badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  },
  "Krebs on Security": {
    border: "border-violet-500",
    badge: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  },
  "Dark Reading": {
    border: "border-red-500",
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  SecurityWeek: {
    border: "border-amber-500",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  "The Record": {
    border: "border-sky-500",
    badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  },
};

const DEFAULT_STYLE = {
  border: "border-gray-600",
  badge: "bg-gray-600/15 text-gray-400 border-gray-600/30",
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="panel rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-white/[0.08] rounded w-3/4 mb-2" />
            <div className="h-3 bg-white/[0.08] rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const categories = [
    "all",
    ...new Set(news.map((n) => n.category).filter((c): c is string => Boolean(c))),
  ];

  const filteredNews =
    selectedCategory === "all"
      ? news
      : news.filter((n) => n.category === selectedCategory);

  return (
    <div className="space-y-3">
      {/* Category filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`text-[10px] px-2 py-1 rounded border transition-colors ${
              selectedCategory === cat
                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/40"
                : "bg-[#0B0F0E]/50 text-gray-500 border-white/[0.08] hover:border-gray-500"
            }`}
          >
            {cat === "all" ? "All" : getCategoryLabel(cat as ThreatCategory)}
          </button>
        ))}
      </div>

      {filteredNews.slice(0, visibleCount).map((item, i) => {
        const style = SOURCE_STYLES[item.source] || DEFAULT_STYLE;
        return (
          <a
            key={`${item.link}-${i}`}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`block panel rounded-lg p-4 border-l-4 ${style.border} hover:bg-[#0B0F0E]/60 transition-all duration-300 group`}
          >
            <div className="flex items-start gap-3">
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt=""
                  className="w-16 h-16 object-cover rounded flex-shrink-0 border border-white/[0.06]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {item.category && item.category !== "general" && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border ${getCategoryColor(item.category as ThreatCategory)} font-medium uppercase tracking-wider`}
                    >
                      {getCategoryLabel(item.category as ThreatCategory)}
                    </span>
                  )}
                  {item.urgency && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.urgency === "critical" ? "bg-red-500" :
                        item.urgency === "high" ? "bg-orange-500" :
                        item.urgency === "medium" ? "bg-amber-500" :
                        "bg-emerald-500"
                      }`}
                    />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-100 line-clamp-2 mb-1 group-hover:text-emerald-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                  {item.aiSummary || item.snippet}
                </p>
                {item.aiSummary && (
                  <span className="text-[9px] text-emerald-500/70 font-mono">AI</span>
                )}
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border ${style.badge} font-medium uppercase tracking-wider`}
                  >
                    {item.source}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {timeAgo(item.pubDate)}
                  </span>
                </div>
              </div>
            </div>
          </a>
        );
      })}

      {visibleCount < filteredNews.length && (
        <button
          onClick={() => setVisibleCount((prev) => prev + 10)}
          className="w-full py-3 text-xs font-mono uppercase tracking-widest text-emerald-500 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all duration-300"
        >
          Load more intelligence
        </button>
      )}
    </div>
  );
}
