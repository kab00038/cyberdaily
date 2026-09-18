// components/HackerNewsFeed.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPublishedAt, plural } from "@/lib/format";
import {
  sortByEngagement,
  sortByRecency,
  type CommunitySortMode,
} from "@/components/community-sort";

interface HNStory {
  title: string;
  url: string;
  points: number;
  comments: number;
  publishedAt: string | null;
  hnUrl: string;
}

export default function HackerNewsFeed() {
  const [stories, setStories] = useState<HNStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Recency is the default: a daily briefing should read as "what's new,"
  // not an unstated relevance blend. "Top" re-ranks the same fetched batch
  // by points client-side rather than issuing a second request.
  const [sortMode, setSortMode] = useState<CommunitySortMode>("recent");

  useEffect(() => {
    // A fresh controller per fetch cycle so the cleanup abort never kills an
    // in-flight request that a later interval tick started.
    let controller: AbortController | null = null;

    async function fetchStories() {
      controller = new AbortController();
      try {
        const res = await fetch("/api/hackernews", {
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        // `/api/hackernews` returns `{ items, generatedAt, sourceMeta }`;
        // tolerate a bare array from older caches.
        const items =
          Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        if (items.length === 0 && !Array.isArray(data) && !Array.isArray(data?.items)) {
          // Malformed response: flag it but preserve previously loaded stories.
          setError(true);
        } else {
          setError(false);
          setStories(items);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Failed to fetch HN stories:", err);
        if (controller.signal.aborted) return;
        // Preserve previously loaded stories on a refresh failure.
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchStories();
    const interval = setInterval(fetchStories, 900000); // 15 min
    return () => {
      controller?.abort();
      clearInterval(interval);
    };
  }, []);

  const sortedStories = useMemo(
    () =>
      sortMode === "top"
        ? sortByEngagement(stories, (story) => story.points)
        : sortByRecency(stories),
    [stories, sortMode]
  );

  if (loading) {
    return (
      <p className="state-panel" role="status"><strong>Hacker News</strong>Loading security discussions from the latest snapshot.</p>
    );
  }

  return (
    <div className="panel rounded-lg overflow-hidden">
      <div className="panel-header">
        <h2 className="section-title flex items-center gap-2">
          <svg className="w-4 h-4 text-ui-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 3.5L18.5 20H5.5L12 5.5z" />
          </svg>
          Hacker News
        </h2>
        <p className="metadata mt-1">Security discussions from Hacker News</p>
      </div>
      {stories.length > 0 && (
        <div className="flex items-center gap-2 px-4 pt-3">
          <span className="text-xs text-ui-muted">Sort:</span>
          <button
            type="button"
            aria-pressed={sortMode === "recent"}
            onClick={() => setSortMode("recent")}
            className="control-chip"
          >
            Recent
          </button>
          <button
            type="button"
            aria-pressed={sortMode === "top"}
            onClick={() => setSortMode("top")}
            className="control-chip"
          >
            Top
          </button>
        </div>
      )}
      {error && stories.length === 0 ? (
        <p className="p-4 text-sm text-ui-muted">Unable to load Hacker News discussions</p>
      ) : stories.length === 0 ? (
        <p className="p-4 text-sm text-ui-muted">No matching discussions in this period.</p>
      ) : (
        <>
          {error && (
            <p className="px-4 pt-3 text-xs text-ui-medium">
              Refresh failed. Showing last successful update.
            </p>
          )}
          <div className="px-4">
            {sortedStories.slice(0, 10).map((story, i) => (
              <article
                key={`${story.url}-${i}`}
                className="community-row interactive-row"
              >
                <h3>
                  <a
                    href={story.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {story.title}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </h3>
                <p className="metadata">
                  {formatPublishedAt(story.publishedAt)} · {plural(story.points, "point")} ·{" "}
                  {plural(story.comments, "comment")}
                </p>
                <div className="community-row-actions">
                  {story.url !== story.hnUrl ? (
                    <a
                      href={story.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link"
                    >
                      Read article
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : null}
                  <a
                    href={story.hnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link"
                  >
                    View discussion
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
          <a
            href="https://news.ycombinator.com/"
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