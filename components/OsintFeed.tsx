// components/OsintFeed.tsx
"use client";

import { useEffect, useState } from "react";
import { formatPublishedAt } from "@/lib/format";

interface OsintPost {
  title: string;
  url: string;
  source: string;
  score: number | null;
  comments: number | null;
  publishedAt: string | null;
  subreddit?: string;
  flair?: string;
}

// All subreddits use a single neutral color.
const SUBREDDIT_COLORS: Record<string, string> = {
  netsec: "text-gray-500",
  cybersecurity: "text-gray-500",
  Malware: "text-gray-500",
  ReverseEngineering: "text-gray-500",
  AskNetsec: "text-gray-500",
  computerforensics: "text-gray-500",
  infosec: "text-gray-500",
  hacking: "text-gray-500",
};

export default function OsintFeed() {
  const [posts, setPosts] = useState<OsintPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSub, setSelectedSub] = useState<string>("all");

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/osint");
        const data = await res.json();
        if (data && !Array.isArray(data)) {
          setError(true);
          setPosts([]);
        } else {
          setError(false);
          setPosts(data);
        }
      } catch (err) {
        console.error("Failed to fetch OSINT:", err);
        setError(true);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
    const interval = setInterval(fetchPosts, 900000); // 15 min
    return () => clearInterval(interval);
  }, []);

  const subreddits = [
    "all",
    ...new Set(posts.map((p) => p.subreddit).filter(Boolean)),
  ];

  const filtered =
    selectedSub === "all"
      ? posts
      : posts.filter((p) => p.subreddit === selectedSub);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="panel rounded-lg p-3 animate-pulse">
            <div className="h-3 bg-white/[0.08] rounded w-full mb-2" />
            <div className="h-2 bg-white/[0.08] rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="panel rounded-lg overflow-hidden">
      <div className="panel-header p-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-widest">
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Community
        </h3>
        <p className="metadata mt-1">Discussions from cybersecurity subreddits</p>
      </div>

      {/* Subreddit filter */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        {subreddits.map((sub) => (
          <button
            key={sub}
            onClick={() => setSelectedSub(sub as string)}
            className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${
              selectedSub === sub
                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/40"
                : "bg-[#0B0F0E]/50 text-gray-500 border-white/[0.08] hover:border-gray-500"
            }`}
          >
            {sub === "all" ? "All" : sub}
          </button>
        ))}
      </div>

      {error ? (
        <p className="p-4 text-sm text-gray-500">Unable to load community discussions</p>
      ) : filtered.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">No recent discussions from monitored subreddits.</p>
      ) : (
        <>
          <div className="divide-y divide-white/[0.06]">
            {filtered.slice(0, 15).map((post, i) => (
              <a
                key={`${post.url}-${i}`}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-3 hover:bg-[#0B0F0E]/50 transition-colors group"
              >
                <p className="text-[17px] font-semibold text-gray-100 line-clamp-2 mb-2 group-hover:text-emerald-400 transition-colors">
                  {post.title}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span className={`font-mono ${SUBREDDIT_COLORS[post.subreddit || ""] || "text-gray-500"}`}>
                    {post.source}
                  </span>
                  {post.flair && (
                    <span className="px-1.5 py-0.5 rounded bg-[#0B0F0E]/80 text-gray-400 border border-white/[0.06]">
                      {post.flair}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="text-emerald-500">▲</span>
                    {post.score ?? "—"}
                  </span>
                  <span>{post.comments ?? "—"} comments</span>
                  <span className="metadata">{formatPublishedAt(post.publishedAt)}</span>
                </div>
              </a>
            ))}
          </div>
          <a
            href="https://www.reddit.com/r/netsec/"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 text-xs font-mono uppercase tracking-widest text-ui-accent border-t border-white/[0.06] text-center hover:bg-emerald-500/10 transition-colors"
          >
            View more discussions
          </a>
        </>
      )}
    </div>
  );
}