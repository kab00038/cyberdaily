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
