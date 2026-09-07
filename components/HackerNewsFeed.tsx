// components/HackerNewsFeed.tsx
"use client";

import { useEffect, useState } from "react";
import { formatPublishedAt } from "@/lib/format";

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

  useEffect(() => {
    async function fetchStories() {
      try {
        const res = await fetch("/api/hackernews");
        const data = await res.json();
        if (data && !Array.isArray(data)) {
          setError(true);
          setStories([]);
        } else {
          setError(false);
          setStories(data);
        }
      } catch (err) {
        console.error("Failed to fetch HN stories:", err);
        setError(true);
        setStories([]);
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
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 3.5L18.5 20H5.5L12 5.5z" />
          </svg>
          Hacker News
        </h3>
        <p className="metadata mt-1">Security discussions from Hacker News</p>
      </div>
      {error ? (
        <p className="p-4 text-sm text-gray-500">Unable to load Hacker News discussions</p>
      ) : stories.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">No matching discussions in this period.</p>
      ) : (
        <>
          <div className="divide-y divide-white/[0.06]">
            {stories.slice(0, 10).map((story, i) => (
              <a
                key={`${story.url}-${i}`}
                href={story.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 hover:bg-[#0B0F0E]/50 transition-all duration-200 group"
              >
                <p className="text-sm text-gray-300 line-clamp-2 mb-2 group-hover:text-emerald-400 transition-colors">
                  {story.title}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                  <span className="flex items-center gap-1 text-emerald-500">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4l-8 16h16L12 4z" />
                    </svg>
                    {story.points}
                  </span>
                  <span>{story.comments} comments</span>
                  <span className="metadata">{formatPublishedAt(story.publishedAt)}</span>
                  {story.url === story.hnUrl ? (
                    <a
                      href={story.hnUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ui-accent hover:text-emerald-400"
                    >
                      View discussion
                    </a>
                  ) : (
                    <>
                      <a
                        href={story.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ui-accent hover:text-emerald-400"
                      >
                        Read article
                      </a>
                      <span>·</span>
                      <a
                        href={story.hnUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ui-accent hover:text-emerald-400"
                      >
                        View discussion
                      </a>
                    </>
                  )}
                </div>
              </a>
            ))}
          </div>
          <a
            href="https://news.ycombinator.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 text-xs font-mono uppercase tracking-widest text-ui-accent border-t border-white/[0.06] text-center hover:bg-emerald-500/10 transition-colors"
          >
            View on Hacker News
          </a>
        </>
      )}
    </div>
  );
}