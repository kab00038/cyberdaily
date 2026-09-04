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

const SOURCE_STYLES: Record<string, { border: string; badge: string; glow: string }> = {
  BleepingComputer: {
    border: "border-blue-500",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    glow: "hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]",
  },
  "The Hacker News": {
    border: "border-purple-500",
    badge: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    glow: "hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]",
  },
  "Krebs on Security": {
    border: "border-green-500",
    badge: "bg-green-500/15 text-green-400 border-green-500/30",
    glow: "hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]",
  },
  "Dark Reading": {
    border: "border-orange-500",
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    glow: "hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]",
  },
  SecurityWeek: {
    border: "border-cyan-500",
    badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    glow: "hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]",
  },
  "The Record": {
    border: "border-pink-500",
    badge: "bg-pink-500/15 text-pink-400 border-pink-500/30",
    glow: "hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]",
  },
};

const DEFAULT_STYLE = {
  border: "border-gray-600",
  badge: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  glow: "hover:shadow-[0_0_20px_rgba(156,163,175,0.1)]",
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
            <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-700/50 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const categories = [
    "all",
    ...new Set(news.map((n) => n.category).filter((c): c is string => Boolean(c))),
  ];

  // Filter news by selected category
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
                ? "bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/40"
                : "bg-cyber-dark/50 text-gray-400 border-gray-700 hover:border-gray-500"
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
            className={`block panel rounded-lg p-4 border-l-4 ${style.border} ${style.glow} hover:bg-cyber-dark/60 transition-all duration-300 group`}
          >
            <div className="flex items-start gap-3">
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt=""
                  className="w-16 h-16 object-cover rounded flex-shrink-0 border border-cyber-cyan/10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {/* Category badge */}
                  {item.category && item.category !== "general" && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border ${getCategoryColor(item.category as ThreatCategory)} font-medium uppercase tracking-wider`}
                    >
                      {getCategoryLabel(item.category as ThreatCategory)}
                    </span>
                  )}
                  {/* Urgency dot */}
                  {item.urgency && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.urgency === "critical" ? "bg-red-500" :
                        item.urgency === "high" ? "bg-orange-500" :
                        item.urgency === "medium" ? "bg-yellow-500" :
                        "bg-green-500"
                      }`}
                    />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white line-clamp-2 mb-1 group-hover:text-cyber-cyan transition-colors">
                  {item.title}
                </h3>
                {/* AI summary or fallback to snippet */}
                <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                  {item.aiSummary || item.snippet}
                </p>
                {item.aiSummary && (
                  <span className="text-[9px] text-cyber-cyan/60 font-mono">AI</span>
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
          className="w-full py-3 text-xs font-mono uppercase tracking-widest text-cyber-cyan border border-cyber-cyan/20 rounded-lg hover:bg-cyber-cyan/10 hover:border-cyber-cyan/40 transition-all duration-300"
        >
          Load more intelligence
        </button>
      )}
    </div>
  );
}
