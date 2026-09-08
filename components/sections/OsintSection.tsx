// components/sections/OsintSection.tsx
"use client";

import HackerNewsFeed from "@/components/HackerNewsFeed";
import OsintFeed from "@/components/OsintFeed";

export default function OsintSection() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Community</h1>
        <p className="page-subtitle">
          Security discussions from Hacker News and cybersecurity subreddits
        </p>
      </header>
      <div className="page-body">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <HackerNewsFeed />
          <OsintFeed />
        </div>
      </div>
    </>
  );
}