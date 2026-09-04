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
    border: "border-[#C87A40]",
    badge: "bg-[#C87A40]/15 text-[#E0A060] border-[#C87A40]/30",
    glow: "hover:shadow-[0_0_20px_rgba(200,122,64,0.15)]",
  },
  "The Hacker News": {
    border: "border-[#A06040]",
    badge: "bg-[#A06040]/15 text-[#C89070] border-[#A06040]/30",
    glow: "hover:shadow-[0_0_20px_rgba(160,96,64,0.15)]",
  },
  "Krebs on Security": {
    border: "border-[#2EAA7A]",
    badge: "bg-[#2EAA7A]/15 text-[#60D0A0] border-[#2EAA7A]/30",
    glow: "hover:shadow-[0_0_20px_rgba(46,170,122,0.15)]",
  },
  "Dark Reading": {
    border: "border-[#E8531E]",
    badge: "bg-[#E8531E]/15 text-[#F09060] border-[#E8531E]/30",
    glow: "hover:shadow-[0_0_20px_rgba(232,83,30,0.15)]",
  },
  SecurityWeek: {
    border: "border-[#E87030]",
    badge: "bg-[#E87030]/15 text-[#F0A070] border-[#E87030]/30",
    glow: "hover:shadow-[0_0_20px_rgba(232,112,48,0.15)]",
  },
  "The Record": {
    border: "border-[#D08040]",
    badge: "bg-[#D08040]/15 text-[#F0B880] border-[#D08040]/30",
    glow: "hover:shadow-[0_0_20px_rgba(208,128,64,0.15)]",
  },
};

const DEFAULT_STYLE = {
  border: "border-[#6A5A4A]",
  badge: "bg-[#6A5A4A]/15 text-[#8A7A6A] border-[#6A5A4A]/30",
  glow: "hover:shadow-[0_0_20px_rgba(106,90,74,0.1)]",
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
            <div className="h-4 bg-[rgba(200,160,120,0.12)] rounded w-3/4 mb-2" />
            <div className="h-3 bg-[rgba(200,160,120,0.12)] rounded w-1/2" />
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
                ? "bg-[#E8531E]/20 text-[#E8531E] border-[#E8531E]/40"
                : "bg-[#0F0A08]/50 text-[#8A7A6A] border-[rgba(200,160,120,0.12)] hover:border-[#8A7A6A]/50"
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
            className={`block panel rounded-lg p-4 border-l-4 ${style.border} ${style.glow} hover:bg-[#0F0A08]/60 transition-all duration-300 group`}
          >
            <div className="flex items-start gap-3">
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt=""
                  className="w-16 h-16 object-cover rounded flex-shrink-0 border border-[rgba(200,160,120,0.1)]"
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
                        item.urgency === "critical" ? "bg-[#E85030]" :
                        item.urgency === "high" ? "bg-[#E8531E]" :
                        item.urgency === "medium" ? "bg-[#D08040]" :
                        "bg-[#2EAA7A]"
                      }`}
                    />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-[#F0E8E0] line-clamp-2 mb-1 group-hover:text-[#E8531E] transition-colors">
                  {item.title}
                </h3>
                {/* AI summary or fallback to snippet */}
                <p className="text-xs text-[#BFB0A0] line-clamp-2 mb-3 leading-relaxed">
                  {item.aiSummary || item.snippet}
                </p>
                {item.aiSummary && (
                  <span className="text-[9px] text-[#E8531E]/60 font-mono">AI</span>
                )}
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border ${style.badge} font-medium uppercase tracking-wider`}
                  >
                    {item.source}
                  </span>
                  <span className="text-[10px] text-[#8A7A6A] font-mono">
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
          className="w-full py-3 text-xs font-mono uppercase tracking-widest text-[#E8531E] border border-[#E8531E]/20 rounded-lg hover:bg-[#E8531E]/10 hover:border-[#E8531E]/40 transition-all duration-300"
        >
          Load more intelligence
        </button>
      )}
    </div>
  );
}
