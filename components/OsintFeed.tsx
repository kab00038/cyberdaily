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
  netsec: "text-ui-muted",
  cybersecurity: "text-ui-muted",
  Malware: "text-ui-muted",
  ReverseEngineering: "text-ui-muted",
  AskNetsec: "text-ui-muted",
  computerforensics: "text-ui-muted",
  infosec: "text-ui-muted",
  hacking: "text-ui-muted",
};

export default function OsintFeed() {
  const [posts, setPosts] = useState<OsintPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSub, setSelectedSub] = useState<string>("all");

  useEffect(() => {
    // A fresh controller per fetch cycle so the cleanup abort never kills an
    // in-flight request that a later interval tick started.
    let controller: AbortController | null = null;

    async function fetchPosts() {
      controller = new AbortController();
      try {
        const res = await fetch("/api/osint", { signal: controller.signal });
        const data = await res.json();
        if (controller.signal.aborted) return;
        // `/api/osint` returns `{ items, generatedAt, sourceMeta }`; tolerate
        // a bare array from older caches.
        const items =
          Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        if (items.length === 0 && !Array.isArray(data) && !Array.isArray(data?.items)) {
          // Malformed response: flag it but preserve previously loaded posts.
          setError(true);
        } else {
          setError(false);
          setPosts(items);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Failed to fetch OSINT:", err);
        if (controller.signal.aborted) return;
        // Preserve previously loaded posts on a refresh failure.
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchPosts();
    const interval = setInterval(fetchPosts, 900000); // 15 min
    return () => {
      controller?.abort();
      clearInterval(interval);
    };
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
      <p className="state-panel" role="status"><strong>Reddit discussions</strong>Loading the latest cybersecurity subreddit snapshot.</p>
    );
  }

  return (
    <div className="panel rounded-lg overflow-hidden">
      <div className="panel-header">
        <h2 className="section-title flex items-center gap-2">
          <svg className="w-4 h-4 text-ui-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          OSINT
        </h2>
        <p className="metadata mt-1">Discussions from cybersecurity subreddits</p>
      </div>

      {/* Subreddit filter */}
      <div className="flex flex-wrap gap-2 px-4 py-3">
        {subreddits.map((sub) => (
          <button
            key={sub}
            type="button"
            onClick={() => setSelectedSub(sub as string)}
            className={`min-h-[44px] px-3 text-[13px] font-medium rounded border transition-colors ${
              selectedSub === sub
                ? "bg-ui-accent-soft text-ui-accent border-ui-control-border"
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

      {error && filtered.length === 0 ? (
        <p className="p-4 text-sm text-ui-muted">Unable to load community discussions</p>
      ) : filtered.length === 0 ? (
        <p className="p-4 text-sm text-ui-muted">No recent discussions from monitored subreddits.</p>
      ) : (
        <>
          {error && (
            <p className="px-4 pt-1 text-xs text-ui-medium">
              Refresh failed. Showing last successful update.
            </p>
          )}
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
                    className={`font-mono ${SUBREDDIT_COLORS[post.subreddit || ""] || "text-ui-muted"}`}
                  >
                    {post.source}
                  </span>
                  {post.flair && (
                    <span className="px-1.5 py-0.5 rounded bg-ui-canvas text-ui-secondary border border-ui-border">
                      {post.flair}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="text-ui-accent">▲</span>
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
            className="block w-full py-3 text-xs font-mono text-ui-accent border-t border-ui-border text-center hover:bg-ui-accent-soft transition-colors"
          >
            View more discussions
          </a>
        </>
      )}
    </div>
  );
}