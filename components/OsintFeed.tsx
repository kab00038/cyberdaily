// components/OsintFeed.tsx
"use client";

import { useEffect, useState } from "react";

interface OsintPost {
  title: string;
  url: string;
  source: string;
  score: number;
  comments: number;
  timeAgo: string;
  subreddit?: string;
  flair?: string;
}

const SUBREDDIT_COLORS: Record<string, string> = {
  netsec: "text-[#E85030]",
  cybersecurity: "text-[#E87030]",
  Malware: "text-[#D08040]",
  ReverseEngineering: "text-[#C87A40]",
  AskNetsec: "text-[#2EAA7A]",
  computerforensics: "text-[#A06040]",
  infosec: "text-[#E8531E]",
  hacking: "text-[#F0A070]",
};

export default function OsintFeed() {
  const [posts, setPosts] = useState<OsintPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<string>("all");

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/osint");
        const data = await res.json();
        setPosts(data);
      } catch (error) {
        console.error("Failed to fetch OSINT:", error);
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
            <div className="h-3 bg-[rgba(200,160,120,0.12)] rounded w-full mb-2" />
            <div className="h-2 bg-[rgba(200,160,120,0.12)] rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="panel rounded-lg overflow-hidden">
      <div className="panel-header p-4">
        <h3 className="text-sm font-semibold text-[#F0E8E0] flex items-center gap-2 uppercase tracking-widest">
          <svg className="w-4 h-4 text-[#E8531E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          OSINT Chatter
        </h3>
      </div>

      {/* Subreddit filter */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        {subreddits.map((sub) => (
          <button
            key={sub}
            onClick={() => setSelectedSub(sub as string)}
            className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${
              selectedSub === sub
                ? "bg-[#E8531E]/20 text-[#E8531E] border-[#E8531E]/40"
                : "bg-[#0F0A08]/50 text-[#8A7A6A] border-[rgba(200,160,120,0.12)] hover:border-[#8A7A6A]/50"
            }`}
          >
            {sub === "all" ? "All" : sub}
          </button>
        ))}
      </div>

      <div className="divide-y divide-[rgba(200,160,120,0.06)]">
        {filtered.slice(0, 15).map((post, i) => (
          <a
            key={`${post.url}-${i}`}
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 hover:bg-[#0F0A08]/50 transition-colors group"
          >
            <p className="text-sm text-[#E0D4C8] line-clamp-2 mb-2 group-hover:text-[#E8531E] transition-colors">
              {post.title}
            </p>
            <div className="flex items-center gap-3 text-[10px] text-[#8A7A6A]">
              <span className={`font-mono ${SUBREDDIT_COLORS[post.subreddit || ""] || "text-[#8A7A6A]"}`}>
                {post.source}
              </span>
              {post.flair && (
                <span className="px-1.5 py-0.5 rounded bg-[#0F0A08]/80 text-[#BFB0A0] border border-[rgba(200,160,120,0.12)]">
                  {post.flair}
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="text-[#E87030]">▲</span>
                {post.score}
              </span>
              <span>{post.comments} comments</span>
              <span>{post.timeAgo}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
