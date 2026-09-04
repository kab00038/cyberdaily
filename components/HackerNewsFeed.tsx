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
