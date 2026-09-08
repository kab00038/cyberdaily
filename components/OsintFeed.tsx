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

  // Most-frequent subreddit in the current load, used for the footer link so
  // "View more discussions" lands on the community people actually read.
  const topSubreddit = (() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      if (post.subreddit) {
        counts.set(post.subreddit, (counts.get(post.subreddit) ?? 0) + 1);
      }
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [sub, count] of counts) {
      if (count > bestCount) {
        best = sub;
        bestCount = count;
      }
    }
    return best ?? "netsec";
  })();

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
          OSINT
        </h3>
        <p className="metadata mt-1">Discussions from cybersecurity subreddits</p>
      </div>

      {/* Subreddit filter */}
      <div className="flex flex-wrap gap-2 px-4 pb-3">
        {subreddits.map((sub) => (
          <button
            key={sub}
            type="button"
            onClick={() => setSelectedSub(sub as string)}
            className={`min-h-[36px] px-3 text-[13px] font-medium rounded-lg border transition-colors ${
              selectedSub === sub
                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/40"
                : "bg-ui-canvas text-ui-secondary border-ui-control-border hover:border-ui-muted"
            }`}
          >
            {sub === "all" ? "All" : sub}
          </button>
        ))}
      </div>

      <p className="px-4 pb-1 text-xs text-ui-muted">
        Engagement counts are extracted from RSS content and may be unavailable
        for some posts.
      </p>

      {error ? (
        <p className="p-4 text-sm text-gray-500">Unable to load community discussions</p>
      ) : filtered.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">No recent discussions from monitored subreddits.</p>
      ) : (
        <>
          <div className="px-4">
            {filtered.slice(0, 15).map((post, i) => (
              <article
                key={`${post.url}-${i}`}
                className="community-row interactive-row"
              >
                <h3>
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {post.title}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </h3>
                <p className="metadata flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span
                    className={`font-mono ${SUBREDDIT_COLORS[post.subreddit || ""] || "text-gray-500"}`}
                  >
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
                  {post.comments != null && (
                    <span>{post.comments} comments</span>
                  )}
                  <span>{formatPublishedAt(post.publishedAt)}</span>
                </p>
              </article>
            ))}
          </div>
          <a
            href={`https://www.reddit.com/r/${topSubreddit.toLowerCase()}/`}
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