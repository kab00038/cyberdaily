// components/sections/OsintSection.tsx
"use client";

import HackerNewsFeed from "@/components/HackerNewsFeed";
import OsintFeed from "@/components/OsintFeed";

export default function OsintSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 text-emerald-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h2 className="section-title">Community</h2>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <HackerNewsFeed />
        <OsintFeed />
      </div>
    </div>
  );
}
